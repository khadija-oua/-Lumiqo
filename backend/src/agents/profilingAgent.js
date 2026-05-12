const coursesService = require('../services/courses.service');
const materialsService = require('../services/materials.service');
const varkService = require('../services/vark.service');
const quizzesService = require('../services/quizzes.service');
const learningPathsService = require('../services/learningPaths.service');
const geminiService = require('../services/gemini.service');
const { buildProfilingPrompt, buildRetryPrompt } = require('./prompts/profilingPrompt');
const { HttpError } = require('../utils/http-error');

const MAX_GENERATE_ATTEMPTS = 2;
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function logUsage(tag, usage) {
  if (!usage) return;
  console.log(
    `[gemini] ${tag} tokens prompt=${usage.promptTokenCount ?? '?'} ` +
      `candidates=${usage.candidatesTokenCount ?? '?'} ` +
      `total=${usage.totalTokenCount ?? '?'}`,
  );
}

function mostCommon(arr) {
  if (!arr.length) return null;
  const counts = new Map();
  for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null;
  let bestN = -1;
  for (const [v, n] of counts.entries()) {
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

function summarizeQuizStats(attempts) {
  if (attempts.length === 0) {
    return { count: 0, averageScore: null, mostCommonEndDifficulty: null };
  }
  const totalScore = attempts.reduce((s, a) => s + (a.score ?? 0), 0);
  return {
    count: attempts.length,
    averageScore: Number((totalScore / attempts.length).toFixed(2)),
    mostCommonEndDifficulty: mostCommon(attempts.map((a) => a.current_difficulty)),
  };
}

function validatePayload(payload, allowedIds) {
  if (!payload || typeof payload !== 'object') {
    return 'Réponse non-objet.';
  }
  if (!Array.isArray(payload.material_order)) {
    return 'material_order doit être un tableau.';
  }
  const seen = new Set();
  for (const id of payload.material_order) {
    if (!Number.isInteger(id)) return 'material_order contient une valeur non-entière.';
    if (!allowedIds.has(id)) return `material_order contient l'ID ${id} qui n'existe pas dans ce cours.`;
    if (seen.has(id)) return `material_order contient un doublon : ${id}.`;
    seen.add(id);
  }
  if (!VALID_DIFFICULTIES.has(payload.recommended_difficulty)) {
    return `recommended_difficulty invalide : ${payload.recommended_difficulty}.`;
  }
  if (!Array.isArray(payload.tips) || payload.tips.length < 2 || payload.tips.length > 3) {
    return 'tips doit contenir entre 2 et 3 conseils.';
  }
  for (const t of payload.tips) {
    if (typeof t !== 'string' || !t.trim()) {
      return 'tips contient une entrée vide ou non-string.';
    }
  }
  return null;
}

async function generateLearningPath(studentId, courseId) {
  const course = await coursesService.findById(courseId);
  if (!course) {
    throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
  }

  const [materials, profile, attempts] = await Promise.all([
    materialsService.listForCourse(courseId),
    varkService.findByStudentId(studentId),
    quizzesService.listCompletedAttemptsForStudentCourse(studentId, courseId),
  ]);

  const quizStats = summarizeQuizStats(attempts);
  const varkStyle = profile?.dominant_style || null;

  // Short-circuit: empty courses don't need Gemini.
  if (materials.length === 0) {
    console.log(`[profilingAgent] course ${courseId} has no materials; skipping Gemini call`);
    return learningPathsService.upsert({
      studentId,
      courseId,
      materialOrder: [],
      recommendedDifficulty: 'medium',
      tips: ["Aucun matériel n'est encore disponible pour ce cours. Reviens plus tard."],
    });
  }

  const { prompt, responseSchema } = buildProfilingPrompt({
    courseTitle: course.title,
    courseDescription: course.description,
    materials: materials.map((m) => ({ id: m.id, title: m.title })),
    varkStyle,
    quizStats,
  });
  const allowedIds = new Set(materials.map((m) => m.id));

  let payload = null;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_GENERATE_ATTEMPTS; attempt++) {
    const finalPrompt = attempt === 1 ? prompt : buildRetryPrompt(prompt);
    let raw;
    try {
      const { text, usage } = await geminiService.generateJson(finalPrompt, responseSchema);
      logUsage(`learning-path-attempt-${attempt}`, usage);
      raw = text;
    } catch (err) {
      console.error(`[profilingAgent] Gemini call failed (attempt ${attempt}):`, err.message);
      lastError = err.message;
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn(`[profilingAgent] JSON.parse failed (attempt ${attempt}):`, parseErr.message);
      lastError = `JSON.parse: ${parseErr.message}`;
      continue;
    }
    const validationError = validatePayload(parsed, allowedIds);
    if (validationError) {
      console.warn(`[profilingAgent] validation failed (attempt ${attempt}): ${validationError}`);
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
      `La génération du parcours a échoué après ${MAX_GENERATE_ATTEMPTS} tentatives. Dernière erreur : ${lastError}`,
    );
  }

  return learningPathsService.upsert({
    studentId,
    courseId,
    materialOrder: payload.material_order,
    recommendedDifficulty: payload.recommended_difficulty,
    tips: payload.tips,
  });
}

module.exports = { generateLearningPath };
