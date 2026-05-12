const quizzesService = require('../services/quizzes.service');
const materialsService = require('../services/materials.service');
const coursesService = require('../services/courses.service');
const accessService = require('../services/access.service');
const quizAgent = require('../agents/quizAgent');
const { HttpError } = require('../utils/http-error');

const MAX_TOTAL_QUESTIONS = 20;

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

// GET /api/quizzes/:id
async function detail(req, res, next) {
  try {
    const id = Number(req.params.id);
    const quiz = await quizzesService.findQuizWithDetails(id);
    if (!quiz) {
      throw new HttpError(404, 'QUIZ_NOT_FOUND', 'Quiz introuvable.');
    }
    await accessService.ensureCourseReadAccess(req.user, quiz.course_id);
    const payload = req.user.role === 'student' ? sanitizeQuizForStudent(quiz) : quiz;
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
    // Coerce generated_by_ai TINYINT(1) to boolean for the response
    res.json({
      quizzes: quizzes.map((q) => ({ ...q, generated_by_ai: !!q.generated_by_ai })),
    });
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

module.exports = { generateFromMaterial, detail, listForCourse, start };
