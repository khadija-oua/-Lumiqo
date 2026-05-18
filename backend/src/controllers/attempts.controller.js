const quizzesService = require('../services/quizzes.service');
const coursesService = require('../services/courses.service');
const profilingAgent = require('../agents/profilingAgent');
const { HttpError } = require('../utils/http-error');

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

// Fire-and-forget(-ish) learning-path refresh after a completed attempt.
// TODO(queue): move this to a background job queue so the student doesn't
// wait on Gemini at quiz-completion time. For now it's awaited synchronously
// (per Phase 6 spec) and wrapped so any failure is logged, never thrown.
async function refreshLearningPathSafely(studentId, quizId) {
  try {
    const quiz = await quizzesService.findQuizById(quizId);
    if (!quiz) return;
    await profilingAgent.generateLearningPath(studentId, quiz.course_id);
    console.log(
      `[attempts] learning path refreshed (student=${studentId} course=${quiz.course_id})`,
    );
  } catch (err) {
    console.warn(
      `[attempts] learning-path refresh skipped (student=${studentId} quiz=${quizId}): ${err.message}`,
    );
  }
}

function stepDifficulty(current, direction) {
  const idx = DIFFICULTY_LEVELS.indexOf(current);
  if (idx === -1) return 'medium';
  const next = Math.max(0, Math.min(2, idx + direction));
  return DIFFICULTY_LEVELS[next];
}

function runningScore(correct, total) {
  if (total <= 0) return 0;
  return Number(((correct / total) * 100).toFixed(2));
}

// POST /api/attempts/:attemptId/answer
async function answer(req, res, next) {
  try {
    const attemptId = Number(req.params.attemptId);
    const questionId = Number(req.body.questionId);
    const selectedAnswerId = Number(req.body.selectedAnswerId);

    const attempt = await quizzesService.findAttemptById(attemptId);
    if (!attempt) {
      throw new HttpError(404, 'ATTEMPT_NOT_FOUND', 'Tentative introuvable.');
    }
    if (attempt.student_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }
    if (attempt.completed_at) {
      throw new HttpError(
        409,
        'ATTEMPT_COMPLETED',
        'Cette tentative est déjà terminée.',
      );
    }

    const question = await quizzesService.findQuestionById(questionId);
    if (!question || question.quiz_id !== attempt.quiz_id) {
      throw new HttpError(
        400,
        'INVALID_QUESTION',
        'Question invalide pour cette tentative.',
      );
    }

    const selectedAnswer = await quizzesService.findAnswerById(selectedAnswerId);
    if (!selectedAnswer || selectedAnswer.question_id !== questionId) {
      throw new HttpError(
        400,
        'INVALID_ANSWER',
        'Réponse invalide pour cette question.',
      );
    }

    const alreadyAnswered = await quizzesService.getAttemptAnsweredQuestionIds(
      attemptId,
    );
    if (alreadyAnswered.includes(questionId)) {
      throw new HttpError(
        409,
        'QUESTION_ALREADY_ANSWERED',
        'Vous avez déjà répondu à cette question.',
      );
    }

    const isCorrect = !!selectedAnswer.is_correct;

    await quizzesService.recordAttemptAnswer({
      attemptId,
      questionId,
      selectedAnswerId,
      isCorrect,
    });

    // Adaptive logic: re-evaluate after recording the answer.
    const lastTwo = await quizzesService.getLastNCorrectness(attemptId, 2);
    let nextDifficulty = attempt.current_difficulty;
    if (lastTwo.length === 2) {
      if (lastTwo[0] && lastTwo[1]) {
        nextDifficulty = stepDifficulty(attempt.current_difficulty, +1);
      } else if (!lastTwo[0] && !lastTwo[1]) {
        nextDifficulty = stepDifficulty(attempt.current_difficulty, -1);
      }
    }
    if (nextDifficulty !== attempt.current_difficulty) {
      await quizzesService.updateCurrentDifficulty(attemptId, nextDifficulty);
    }

    // Refresh to get the new total/correct counts
    const refreshed = await quizzesService.findAttemptById(attemptId);
    const servedSoFar = refreshed.total_questions;

    // Cap = the actual number of questions in this quiz. A 5-question
    // quiz completes after 5 answers; a 20-question quiz runs all 20.
    const totalQuestionsInQuiz = await quizzesService.countQuestionsForQuiz(
      attempt.quiz_id,
    );
    if (servedSoFar >= totalQuestionsInQuiz) {
      const completed = await quizzesService.completeAttempt(attemptId);
      await refreshLearningPathSafely(req.user.id, attempt.quiz_id);
      return res.json({
        nextQuestion: null,
        isComplete: true,
        runningScore: Number(completed.score),
        currentDifficulty: nextDifficulty,
        attempt: completed,
      });
    }

    const nextQuestion = await quizzesService.findNextQuestion(
      attempt.quiz_id,
      attemptId,
      nextDifficulty,
    );

    if (!nextQuestion) {
      const completed = await quizzesService.completeAttempt(attemptId);
      await refreshLearningPathSafely(req.user.id, attempt.quiz_id);
      return res.json({
        nextQuestion: null,
        isComplete: true,
        runningScore: Number(completed.score),
        currentDifficulty: nextDifficulty,
        attempt: completed,
      });
    }

    res.json({
      nextQuestion,
      isComplete: false,
      runningScore: runningScore(refreshed.correct_answers, refreshed.total_questions),
      currentDifficulty: nextDifficulty,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/attempts/:id/result
async function result(req, res, next) {
  try {
    const id = Number(req.params.id);
    const attempt = await quizzesService.findAttemptById(id);
    if (!attempt) {
      throw new HttpError(404, 'ATTEMPT_NOT_FOUND', 'Tentative introuvable.');
    }
    const quiz = await quizzesService.findQuizById(attempt.quiz_id);
    if (!quiz) {
      throw new HttpError(404, 'QUIZ_NOT_FOUND', 'Quiz introuvable.');
    }

    // Authorization: student owner | teacher of the course | admin
    if (req.user.role === 'admin') {
      /* allowed */
    } else if (req.user.role === 'student') {
      if (attempt.student_id !== req.user.id) {
        throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
      }
    } else if (req.user.role === 'teacher') {
      const course = await coursesService.findById(quiz.course_id);
      if (!course || course.teacher_id !== req.user.id) {
        throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
      }
    } else {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }

    const fullBreakdown = await quizzesService.getAttemptBreakdown(id);
    const answersHidden = !quiz.show_answers;

    // Evaluation mode: keep the student's own selections visible but null
    // out correctness and the canonical correct answer. The overall score
    // (correct / total) is still returned via the attempt row.
    const breakdown = answersHidden
      ? fullBreakdown.map((row) => ({
          ...row,
          is_correct: null,
          correct_answer_id: null,
          correct_answer_text: null,
        }))
      : fullBreakdown;

    res.json({
      attempt: { ...attempt, score: attempt.score == null ? null : Number(attempt.score) },
      quiz,
      breakdown,
      answersHidden,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { answer, result };
