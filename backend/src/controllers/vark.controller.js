const varkQuestions = require('../data/varkQuestions.fr.json');
const varkService = require('../services/vark.service');
const usersService = require('../services/users.service');
const accessService = require('../services/access.service');
const { HttpError } = require('../utils/http-error');

const STYLE_LETTERS = ['V', 'A', 'R', 'K'];

// Canonical lowercase names persisted on vark_profiles.dominant_style.
// Matches the keys used by chatPrompt.VARK_HINTS (Phase 5).
const LETTER_TO_NAME = {
  V: 'visual',
  A: 'auditory',
  R: 'reading',
  K: 'kinesthetic',
};

// Tie-break order per spec: V > A > R > K.
const TIE_BREAK_ORDER = ['V', 'A', 'R', 'K'];

const TOTAL_QUESTIONS = varkQuestions.questions.length;

function computeScores(responses) {
  const counts = { V: 0, A: 0, R: 0, K: 0 };
  for (const r of responses) {
    for (const s of r.selectedStyles) counts[s] += 1;
  }
  return counts;
}

function computeDominantStyle(counts) {
  let bestLetter = TIE_BREAK_ORDER[0];
  let bestScore = -1;
  for (const letter of TIE_BREAK_ORDER) {
    if (counts[letter] > bestScore) {
      bestScore = counts[letter];
      bestLetter = letter;
    }
  }
  const tiedLetters = TIE_BREAK_ORDER.filter((l) => counts[l] === bestScore);
  return {
    letter: bestLetter,
    name: LETTER_TO_NAME[bestLetter],
    tied: tiedLetters.length > 1,
    tiedWith: tiedLetters
      .filter((l) => l !== bestLetter)
      .map((l) => LETTER_TO_NAME[l]),
  };
}

// GET /api/vark/questions
async function getQuestions(_req, res, next) {
  try {
    res.json({ questions: varkQuestions.questions });
  } catch (err) {
    next(err);
  }
}

// POST /api/vark/submit
async function submit(req, res, next) {
  try {
    const responses = req.body.responses;
    if (!Array.isArray(responses)) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Le champ "responses" est requis et doit être un tableau.',
      );
    }
    if (responses.length !== TOTAL_QUESTIONS) {
      throw new HttpError(
        400,
        'INCOMPLETE_QUESTIONNAIRE',
        `Vous devez répondre aux ${TOTAL_QUESTIONS} questions du questionnaire.`,
      );
    }

    const seen = new Set();
    for (const r of responses) {
      const idx = Number(r?.questionIndex);
      if (!Number.isInteger(idx) || idx < 1 || idx > TOTAL_QUESTIONS) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          `questionIndex doit être un entier entre 1 et ${TOTAL_QUESTIONS}.`,
        );
      }
      if (seen.has(idx)) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          `Question ${idx} dupliquée dans la soumission.`,
        );
      }
      seen.add(idx);

      if (!Array.isArray(r.selectedStyles) || r.selectedStyles.length === 0) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          `Question ${idx} : au moins une réponse est requise (V, A, R ou K).`,
        );
      }
      const uniq = new Set();
      for (const s of r.selectedStyles) {
        if (typeof s !== 'string' || !STYLE_LETTERS.includes(s)) {
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            `Question ${idx} : style "${s}" invalide. Attendu V, A, R ou K.`,
          );
        }
        if (uniq.has(s)) {
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            `Question ${idx} : style "${s}" sélectionné en double.`,
          );
        }
        uniq.add(s);
      }
    }

    const scores = computeScores(responses);
    const dominant = computeDominantStyle(scores);

    const profile = await varkService.saveQuestionnaire({
      studentId: req.user.id,
      responses,
      scores,
      dominantStyle: dominant.name,
    });

    res.status(201).json({
      profile,
      scores,
      meta: {
        tied: dominant.tied,
        tiedWith: dominant.tiedWith,
        tieBreakRule: 'V > A > R > K',
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/vark/me
async function me(req, res, next) {
  try {
    const profile = await varkService.findByStudentId(req.user.id);
    if (!profile) {
      throw new HttpError(
        404,
        'PROFILE_NOT_FOUND',
        "Vous n'avez pas encore complété le questionnaire VARK.",
      );
    }
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

// GET /api/vark/student/:id
async function getStudentProfile(req, res, next) {
  try {
    const targetId = Number(req.params.id);

    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }

    const student = await usersService.findById(targetId);
    if (!student || student.role !== 'student') {
      throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Étudiant introuvable.');
    }

    if (req.user.role === 'teacher') {
      const teaches = await accessService.teacherHasStudent(req.user.id, targetId);
      if (!teaches) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          "Vous n'enseignez aucun cours auquel cet étudiant est inscrit.",
        );
      }
    }

    const profile = await varkService.findByStudentId(targetId);
    if (!profile) {
      throw new HttpError(
        404,
        'PROFILE_NOT_FOUND',
        "Cet étudiant n'a pas encore complété le questionnaire VARK.",
      );
    }
    res.json({ profile, student });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuestions,
  submit,
  me,
  getStudentProfile,
  // Exported for unit testing / re-use.
  _computeScores: computeScores,
  _computeDominantStyle: computeDominantStyle,
};
