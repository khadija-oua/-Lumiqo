const quizzesService = require('../services/quizzes.service');
const materialsService = require('../services/materials.service');
const coursesService = require('../services/courses.service');
const enrollmentsService = require('../services/enrollments.service');
const accessService = require('../services/access.service');
const quizAgent = require('../agents/quizAgent');
const { HttpError } = require('../utils/http-error');

const MAX_TOTAL_QUESTIONS = 20;
const MAX_EVAL_ATTEMPTS = 10;

// Ownership / role guard reused by mode-change + attempt-listing endpoints.
// Admin always passes; teacher must own the course the quiz belongs to.
async function ensureTeacherOwnsQuiz(user, quiz) {
  if (user.role === 'admin') return;
  const course = await coursesService.findById(quiz.course_id);
  if (!course || course.teacher_id !== user.id) {
    throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
  }
}

function stripAnswerCorrectness(answers) {
  return (answers || []).map((a) => ({
    id: a.id,
    question_id: a.question_id,
    answer_text: a.answer_text,
  }));
}

function sanitizeQuizForStudent(quiz) {
  return {
    ...quiz,
    questions: (quiz.questions || []).map((q) => ({
      ...q,
      answers: stripAnswerCorrectness(q.answers),
    })),
  };
}

// POST /api/materials/:id/generate-quiz
async function generateFromMaterial(req, res, next) {
  try {
    const materialId = Number(req.params.id);
    const material = await materialsService.findById(materialId);
    if (!material) {
      throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Matériel introuvable.');
    }
    const course = await coursesService.findById(material.course_id);
    if (!course) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }
    if (course.teacher_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }

    const numEasy = req.body.numEasy ?? 4;
    const numMedium = req.body.numMedium ?? 4;
    const numHard = req.body.numHard ?? 2;
    const total = numEasy + numMedium + numHard;
    if (total < 1 || total > MAX_TOTAL_QUESTIONS) {
      throw new HttpError(
        400,
        'INVALID_QUESTION_COUNT',
        `Le nombre total de questions doit être compris entre 1 et ${MAX_TOTAL_QUESTIONS}.`,
      );
    }

    const quiz = await quizAgent.generateQuizFromMaterial(materialId, {
      numEasy,
      numMedium,
      numHard,
    });

    res.status(201).json({ quiz });
  } catch (err) {
    next(err);
  }
}

// Computes canAttempt from mode + attempts used. Training quizzes are
// always attemptable; evaluation quizzes are gated by max_attempts.
function deriveCanAttempt(quiz, userAttempts) {
  if (quiz.mode === 'training') return true;
  if (quiz.max_attempts == null) return true;
  return userAttempts < quiz.max_attempts;
}

// GET /api/quizzes/:id
async function detail(req, res, next) {
  try {
    const id = Number(req.params.id);
    const quiz = await quizzesService.findQuizWithDetails(id);
    if (!quiz) {
      throw new HttpError(404, 'QUIZ_NOT_FOUND', 'Quiz introuvable.');
    }
    await accessService.ensureCourseReadAccess(req.user, quiz.course_id);

    let payload = req.user.role === 'student' ? sanitizeQuizForStudent(quiz) : quiz;

    // Annotate per-student attempt state on the quiz object so the
    // QuizTakePage can decide between launch / confirm / locked.
    if (req.user.role === 'student') {
      const userAttempts = await quizzesService.countAttemptsForStudent(req.user.id, id);
      payload = {
        ...payload,
        userAttempts,
        canAttempt: deriveCanAttempt(quiz, userAttempts),
      };
    }
    res.json({ quiz: payload });
  } catch (err) {
    next(err);
  }
}

// GET /api/courses/:courseId/quizzes
async function listForCourse(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    await accessService.ensureCourseReadAccess(req.user, courseId);
    const quizzes = await quizzesService.listForCourse(courseId);

    // Annotate per-student stats (attempt count, last score, canAttempt) on
    // every quiz so the course detail page can render mode-aware buttons
    // without N+1 round-trips.
    if (req.user.role === 'student' && quizzes.length > 0) {
      const stats = await quizzesService.listStudentAttemptStatsForQuizzes(
        req.user.id,
        quizzes.map((q) => q.id),
      );
      const byQuiz = new Map(stats.map((s) => [s.quiz_id, s]));
      for (const q of quizzes) {
        const s = byQuiz.get(q.id);
        const userAttempts = s?.attemptCount ?? 0;
        q.userAttempts = userAttempts;
        q.lastScore = s?.lastScore ?? null;
        q.canAttempt = deriveCanAttempt(q, userAttempts);
      }
    }
    res.json({ quizzes });
  } catch (err) {
    next(err);
  }
}

// POST /api/quizzes/:id/start  (student-only, must be enrolled)
async function start(req, res, next) {
  try {
    const quizId = Number(req.params.id);
    const quiz = await quizzesService.findQuizById(quizId);
    if (!quiz) {
      throw new HttpError(404, 'QUIZ_NOT_FOUND', 'Quiz introuvable.');
    }
    // ensureCourseReadAccess covers enrollment for students.
    await accessService.ensureCourseReadAccess(req.user, quiz.course_id);

    // Evaluation mode: enforce max_attempts BEFORE creating the attempt
    // so we don't pollute quiz_attempts with rows the student can't finish.
    if (quiz.mode === 'evaluation' && quiz.max_attempts != null) {
      const used = await quizzesService.countAttemptsForStudent(req.user.id, quizId);
      if (used >= quiz.max_attempts) {
        const err = new HttpError(
          403,
          'MAX_ATTEMPTS_REACHED',
          `Vous avez atteint le nombre maximum de tentatives pour ce quiz (${used}/${quiz.max_attempts}).`,
          { attemptsUsed: used, maxAttempts: quiz.max_attempts },
        );
        throw err;
      }
    }

    const attempt = await quizzesService.startAttempt(req.user.id, quizId);
    const firstQuestion = await quizzesService.findNextQuestion(
      quizId,
      attempt.id,
      attempt.current_difficulty,
    );

    if (!firstQuestion) {
      throw new HttpError(
        422,
        'QUIZ_EMPTY',
        'Ce quiz ne contient aucune question.',
      );
    }
    res.status(201).json({ attempt, question: firstQuestion });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/quizzes/:id/mode  — teacher (owner) or admin
async function updateMode(req, res, next) {
  try {
    const id = Number(req.params.id);
    const quiz = await quizzesService.findQuizById(id);
    if (!quiz) {
      throw new HttpError(404, 'QUIZ_NOT_FOUND', 'Quiz introuvable.');
    }
    await ensureTeacherOwnsQuiz(req.user, quiz);

    const { mode } = req.body;
    if (mode !== 'training' && mode !== 'evaluation') {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Le mode doit être "training" ou "evaluation".');
    }

    let maxAttempts = null;
    if (mode === 'evaluation') {
      maxAttempts = Number(req.body.maxAttempts);
      if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_EVAL_ATTEMPTS) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          `maxAttempts doit être un entier entre 1 et ${MAX_EVAL_ATTEMPTS}.`,
        );
      }
    }

    const updated = await quizzesService.updateQuizMode(id, {
      mode,
      max_attempts: maxAttempts,
    });
    res.json({ quiz: updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/quizzes/:id/attempts  — teacher (owner) or admin
async function listAttempts(req, res, next) {
  try {
    const id = Number(req.params.id);
    const quiz = await quizzesService.findQuizById(id);
    if (!quiz) {
      throw new HttpError(404, 'QUIZ_NOT_FOUND', 'Quiz introuvable.');
    }
    await ensureTeacherOwnsQuiz(req.user, quiz);

    const attempts = await quizzesService.listAttemptsForQuiz(id);
    const enrollmentCount = await enrollmentsService.countForCourse(quiz.course_id);

    // For summary stats we use each student's MOST RECENT attempt, so
    // distribution + completion rate aren't skewed by repeat takers.
    const latestByStudent = new Map();
    for (const a of attempts) {
      if (!latestByStudent.has(a.student_id)) latestByStudent.set(a.student_id, a);
    }
    const latest = Array.from(latestByStudent.values());

    const totalStudents = latest.length;
    const averageScore = totalStudents > 0
      ? Number((latest.reduce((s, a) => s + (a.score || 0), 0) / totalStudents).toFixed(2))
      : null;
    const completionRate = enrollmentCount > 0
      ? Number(((totalStudents / enrollmentCount) * 100).toFixed(2))
      : null;

    const distribution = { excellent: 0, good: 0, needsWork: 0 };
    for (const a of latest) {
      const s = a.score ?? 0;
      if (s >= 80) distribution.excellent += 1;
      else if (s >= 50) distribution.good += 1;
      else distribution.needsWork += 1;
    }

    res.json({
      attempts,
      summary: {
        totalStudents,
        averageScore,
        completionRate,
        scoreDistribution: distribution,
        enrollmentCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateFromMaterial,
  detail,
  listForCourse,
  start,
  updateMode,
  listAttempts,
};
