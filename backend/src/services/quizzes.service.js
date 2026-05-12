const { pool } = require('../config/db');

const QUIZ_COLS =
  'id, course_id, material_id, title, generated_by_ai, difficulty, created_at';
const QUESTION_COLS = 'id, quiz_id, question_text, difficulty, created_at';
const ANSWER_COLS = 'id, question_id, answer_text, is_correct';
const ATTEMPT_COLS =
  'id, student_id, quiz_id, score, total_questions, correct_answers, ' +
  'started_at, completed_at, current_difficulty';

// --- Quiz reads ---------------------------------------------------------

async function findQuizById(id) {
  const [rows] = await pool.query(
    `SELECT ${QUIZ_COLS} FROM quizzes WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function listForCourse(courseId) {
  const [rows] = await pool.query(
    `SELECT ${QUIZ_COLS} FROM quizzes WHERE course_id = ? ORDER BY created_at DESC`,
    [courseId],
  );
  return rows;
}

// Returns the quiz plus its questions and answers. Answers include is_correct;
// the controller is responsible for stripping it before returning to a student.
async function findQuizWithDetails(id) {
  const quiz = await findQuizById(id);
  if (!quiz) return null;

  const [questions] = await pool.query(
    `SELECT ${QUESTION_COLS} FROM questions WHERE quiz_id = ? ORDER BY id ASC`,
    [id],
  );
  if (questions.length === 0) {
    return { ...quiz, questions: [] };
  }

  const qIds = questions.map((q) => q.id);
  const [answers] = await pool.query(
    `SELECT ${ANSWER_COLS} FROM answers WHERE question_id IN (?) ORDER BY id ASC`,
    [qIds],
  );

  const grouped = new Map(qIds.map((qid) => [qid, []]));
  for (const a of answers) {
    // mysql2 returns TINYINT(1) as number; coerce to boolean for sanity.
    grouped.get(a.question_id).push({ ...a, is_correct: !!a.is_correct });
  }
  return {
    ...quiz,
    generated_by_ai: !!quiz.generated_by_ai,
    questions: questions.map((q) => ({ ...q, answers: grouped.get(q.id) || [] })),
  };
}

// --- Quiz creation (transactional) -------------------------------------

async function createQuizWithQuestions({
  courseId,
  materialId,
  title,
  generatedByAi,
  difficulty,
  questions,
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [quizRes] = await conn.query(
      `INSERT INTO quizzes
         (course_id, material_id, title, generated_by_ai, difficulty)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, materialId, title, generatedByAi, difficulty],
    );
    const quizId = quizRes.insertId;

    for (const q of questions) {
      const [qRes] = await conn.query(
        `INSERT INTO questions (quiz_id, question_text, difficulty)
         VALUES (?, ?, ?)`,
        [quizId, q.question_text, q.difficulty],
      );
      const questionId = qRes.insertId;
      for (const a of q.answers) {
        await conn.query(
          `INSERT INTO answers (question_id, answer_text, is_correct)
           VALUES (?, ?, ?)`,
          [questionId, a.answer_text, a.is_correct ? 1 : 0],
        );
      }
    }

    await conn.commit();
    return findQuizWithDetails(quizId);
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore rollback failures */
    }
    throw err;
  } finally {
    conn.release();
  }
}

// --- Single-row lookups used by the attempts controller -----------------

async function findQuestionById(id) {
  const [rows] = await pool.query(
    `SELECT id, quiz_id, difficulty FROM questions WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findAnswerById(id) {
  const [rows] = await pool.query(
    `SELECT id, question_id, is_correct FROM answers WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;
  return { ...rows[0], is_correct: !!rows[0].is_correct };
}

// --- Attempts ----------------------------------------------------------

async function findAttemptById(id) {
  const [rows] = await pool.query(
    `SELECT ${ATTEMPT_COLS} FROM quiz_attempts WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function startAttempt(studentId, quizId) {
  const [res] = await pool.query(
    `INSERT INTO quiz_attempts
       (student_id, quiz_id, current_difficulty, total_questions, correct_answers)
     VALUES (?, ?, 'medium', 0, 0)`,
    [studentId, quizId],
  );
  return findAttemptById(res.insertId);
}

async function getAttemptAnsweredQuestionIds(attemptId) {
  const [rows] = await pool.query(
    `SELECT question_id FROM attempt_answers
      WHERE attempt_id = ?
      ORDER BY answered_at ASC, id ASC`,
    [attemptId],
  );
  return rows.map((r) => r.question_id);
}

// Most-recent-first list of `is_correct` for the last N answers in an attempt.
async function getLastNCorrectness(attemptId, n) {
  const [rows] = await pool.query(
    `SELECT is_correct FROM attempt_answers
      WHERE attempt_id = ?
      ORDER BY answered_at DESC, id DESC
      LIMIT ?`,
    [attemptId, n],
  );
  return rows.map((r) => !!r.is_correct);
}

async function recordAttemptAnswer({
  attemptId,
  questionId,
  selectedAnswerId,
  isCorrect,
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO attempt_answers
         (attempt_id, question_id, selected_answer_id, is_correct)
       VALUES (?, ?, ?, ?)`,
      [attemptId, questionId, selectedAnswerId, isCorrect ? 1 : 0],
    );
    await conn.query(
      `UPDATE quiz_attempts
          SET total_questions = total_questions + 1,
              correct_answers = correct_answers + ?
        WHERE id = ?`,
      [isCorrect ? 1 : 0, attemptId],
    );
    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function updateCurrentDifficulty(attemptId, difficulty) {
  await pool.query(
    `UPDATE quiz_attempts SET current_difficulty = ? WHERE id = ?`,
    [difficulty, attemptId],
  );
}

async function completeAttempt(attemptId) {
  const [rows] = await pool.query(
    `SELECT total_questions, correct_answers FROM quiz_attempts WHERE id = ? LIMIT 1`,
    [attemptId],
  );
  if (rows.length === 0) return null;
  const { total_questions, correct_answers } = rows[0];
  const score =
    total_questions > 0
      ? Number(((correct_answers / total_questions) * 100).toFixed(2))
      : 0;
  await pool.query(
    `UPDATE quiz_attempts SET completed_at = NOW(), score = ? WHERE id = ?`,
    [score, attemptId],
  );
  return findAttemptById(attemptId);
}

// Loads a question + its answers but WITHOUT is_correct — ready to send
// straight to a student during a quiz attempt.
async function loadQuestionForStudent(questionId) {
  const [qRows] = await pool.query(
    `SELECT id, quiz_id, question_text, difficulty
       FROM questions WHERE id = ? LIMIT 1`,
    [questionId],
  );
  if (qRows.length === 0) return null;
  const [aRows] = await pool.query(
    `SELECT id, question_id, answer_text
       FROM answers WHERE question_id = ? ORDER BY id ASC`,
    [questionId],
  );
  return { ...qRows[0], answers: aRows };
}

// Pick the next question for an in-progress attempt. Prefer one matching
// preferredDifficulty; fall back to any unanswered question in the quiz.
// Returns null when every question has been answered.
async function findNextQuestion(quizId, attemptId, preferredDifficulty) {
  if (preferredDifficulty) {
    const [pref] = await pool.query(
      `SELECT id FROM questions
        WHERE quiz_id = ?
          AND difficulty = ?
          AND id NOT IN (
            SELECT question_id FROM attempt_answers WHERE attempt_id = ?
          )
        ORDER BY id ASC
        LIMIT 1`,
      [quizId, preferredDifficulty, attemptId],
    );
    if (pref.length > 0) return loadQuestionForStudent(pref[0].id);
  }

  const [any] = await pool.query(
    `SELECT id FROM questions
      WHERE quiz_id = ?
        AND id NOT IN (
          SELECT question_id FROM attempt_answers WHERE attempt_id = ?
        )
      ORDER BY id ASC
      LIMIT 1`,
    [quizId, attemptId],
  );
  if (any.length > 0) return loadQuestionForStudent(any[0].id);

  return null;
}

// Full breakdown of an attempt: every answered question with the student's
// pick AND the correct answer revealed. Used by GET /api/attempts/:id/result.
async function getAttemptBreakdown(attemptId) {
  const [rows] = await pool.query(
    `SELECT aa.id              AS attempt_answer_id,
            aa.question_id,
            aa.selected_answer_id,
            aa.is_correct,
            aa.answered_at,
            q.question_text,
            q.difficulty,
            sa.answer_text     AS selected_answer_text,
            ca.id              AS correct_answer_id,
            ca.answer_text     AS correct_answer_text
       FROM attempt_answers aa
       JOIN questions q  ON q.id = aa.question_id
       LEFT JOIN answers sa ON sa.id = aa.selected_answer_id
       LEFT JOIN answers ca ON ca.question_id = aa.question_id AND ca.is_correct = 1
      WHERE aa.attempt_id = ?
      ORDER BY aa.answered_at ASC, aa.id ASC`,
    [attemptId],
  );
  return rows.map((r) => ({ ...r, is_correct: !!r.is_correct }));
}

module.exports = {
  findQuizById,
  listForCourse,
  findQuizWithDetails,
  createQuizWithQuestions,
  findQuestionById,
  findAnswerById,
  findAttemptById,
  startAttempt,
  getAttemptAnsweredQuestionIds,
  getLastNCorrectness,
  recordAttemptAnswer,
  updateCurrentDifficulty,
  completeAttempt,
  loadQuestionForStudent,
  findNextQuestion,
  getAttemptBreakdown,
};
