const pdfService = require('../services/pdf.service');
const materialsService = require('../services/materials.service');
const quizzesService = require('../services/quizzes.service');
const geminiService = require('../services/gemini.service');
const {
  buildQuizPrompt,
  buildRetryPrompt,
  buildSummaryPrompt,
} = require('./prompts/quizPrompt');
const { HttpError } = require('../utils/http-error');

const MIN_TEXT_LENGTH = 500;
const MAX_TEXT_LENGTH = 25000;
const CHUNK_COUNT = 3;
const MAX_GENERATE_ATTEMPTS = 2;
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function chunkText(text, count) {
  if (count <= 1) return [text];
  const size = Math.ceil(text.length / count);
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}

function logUsage(tag, usage) {
  if (!usage) return;
  console.log(
    `[gemini] ${tag} tokens prompt=${usage.promptTokenCount ?? '?'} ` +
      `candidates=${usage.candidatesTokenCount ?? '?'} ` +
      `total=${usage.totalTokenCount ?? '?'}`,
  );
}

async function condenseLargeText(text) {
  const chunks = chunkText(text, CHUNK_COUNT);
  const summaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const prompt = buildSummaryPrompt(chunks[i]);
    const { text: summary, usage } = await geminiService.generateText(prompt);
    logUsage(`summary-${i + 1}/${chunks.length}`, usage);
    summaries.push((summary || '').trim());
  }
  return summaries.filter(Boolean).join('\n\n');
}

function validateQuizPayload(payload, counts) {
  if (!payload || !Array.isArray(payload.questions)) {
    return 'Le champ "questions" est manquant ou n\'est pas un tableau.';
  }
  const observed = { easy: 0, medium: 0, hard: 0 };
  for (const q of payload.questions) {
    if (typeof q.question_text !== 'string' || !q.question_text.trim()) {
      return 'Une question est sans texte.';
    }
    if (!VALID_DIFFICULTIES.has(q.difficulty)) {
      return `Difficulté invalide : ${q.difficulty}.`;
    }
    if (!Array.isArray(q.answers) || q.answers.length !== 4) {
      return 'Chaque question doit avoir exactement 4 réponses.';
    }
    const correct = q.answers.filter((a) => a && a.is_correct === true).length;
    if (correct !== 1) {
      return 'Chaque question doit avoir exactement 1 réponse correcte.';
    }
    for (const a of q.answers) {
      if (typeof a.answer_text !== 'string' || !a.answer_text.trim()) {
        return 'Une réponse est sans texte.';
      }
    }
    observed[q.difficulty] += 1;
  }
  if (
    observed.easy !== counts.numEasy ||
    observed.medium !== counts.numMedium ||
    observed.hard !== counts.numHard
  ) {
    return (
      `Distribution incorrecte : reçu E=${observed.easy} M=${observed.medium} H=${observed.hard}, ` +
      `attendu E=${counts.numEasy} M=${counts.numMedium} H=${counts.numHard}.`
    );
  }
  return null;
}

async function generateQuizFromMaterial(materialId, options = {}) {
  const numEasy = options.numEasy ?? 4;
  const numMedium = options.numMedium ?? 4;
  const numHard = options.numHard ?? 2;
  const counts = { numEasy, numMedium, numHard };

  // 1. Load and validate the material
  const material = await materialsService.findById(materialId);
  if (!material) {
    throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Matériel introuvable.');
  }
  if (material.file_type !== 'pdf' || !material.drive_file_id) {
    throw new HttpError(
      422,
      'NOT_A_PDF',
      "Ce matériel n'est pas un PDF. La génération de quiz nécessite un PDF.",
    );
  }

  // 2. Download + extract text
  let rawText;
  try {
    rawText = await pdfService.extractTextFromDriveFile(material.drive_file_id);
  } catch (err) {
    const status = err.code || err.response?.status;
    if (status === 404) {
      throw new HttpError(
        410,
        'DRIVE_FILE_GONE',
        "Ce document n'est plus disponible sur Google Drive. Veuillez le téléverser à nouveau.",
      );
    }
    console.error('[quizAgent] PDF extraction failed:', err.message);
    throw new HttpError(
      502,
      'PDF_EXTRACT_FAILED',
      'Impossible de lire le PDF.',
    );
  }
  const text = (rawText || '').trim();
  if (text.length < MIN_TEXT_LENGTH) {
    throw new HttpError(
      422,
      'PDF_TOO_SHORT',
      `Le contenu extrait du PDF est trop court (${text.length} caractères). Le PDF est peut-être scanné ou vide.`,
    );
  }

  // 3. Condense if oversized
  let sourceText = text;
  if (text.length > MAX_TEXT_LENGTH) {
    console.log(
      `[quizAgent] text length ${text.length} > ${MAX_TEXT_LENGTH}, summarising in ${CHUNK_COUNT} chunks`,
    );
    sourceText = await condenseLargeText(text);
    console.log(`[quizAgent] condensed source length: ${sourceText.length}`);
  }

  // 4. Generate quiz JSON with one retry on invalid output
  const { prompt, responseSchema } = buildQuizPrompt({
    sourceText,
    numEasy,
    numMedium,
    numHard,
  });

  let payload = null;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_GENERATE_ATTEMPTS; attempt++) {
    const finalPrompt = attempt === 1 ? prompt : buildRetryPrompt(prompt);
    let raw;
    try {
      const { text: t, usage } = await geminiService.generateJson(
        finalPrompt,
        responseSchema,
      );
      logUsage(`quiz-attempt-${attempt}`, usage);
      raw = t;
    } catch (err) {
      console.error(`[quizAgent] Gemini call failed (attempt ${attempt}):`, err.message);
      lastError = err.message;
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn(`[quizAgent] JSON.parse failed (attempt ${attempt}):`, parseErr.message);
      lastError = `JSON.parse: ${parseErr.message}`;
      continue;
    }
    const validationError = validateQuizPayload(parsed, counts);
    if (validationError) {
      console.warn(`[quizAgent] payload validation failed (attempt ${attempt}): ${validationError}`);
      lastError = validationError;
      continue;
    }
    payload = parsed;
    break;
  }

  if (!payload) {
    throw new HttpError(
      502,
      'AI_RESPONSE_INVALID',
      `Le générateur n'a pas produit de quiz valide après ${MAX_GENERATE_ATTEMPTS} tentatives. Dernière erreur : ${lastError}`,
    );
  }

  // 5. Persist (transactional)
  const title = `Quiz auto — ${material.title}`;
  return quizzesService.createQuizWithQuestions({
    courseId: material.course_id,
    materialId: material.id,
    title,
    generatedByAi: true,
    difficulty: 'medium',
    questions: payload.questions,
  });
}

module.exports = { generateQuizFromMaterial };
