const { pool } = require('../config/db');

// Read + write for vark_profiles and vark_responses. The questionnaire
// scoring lives here; the controller is a thin wrapper.

const PROFILE_COLS =
  'id, student_id, visual_score, auditory_score, reading_score, ' +
  'kinesthetic_score, dominant_style, last_updated';

async function findByStudentId(studentId) {
  const [rows] = await pool.query(
    `SELECT ${PROFILE_COLS} FROM vark_profiles WHERE student_id = ? LIMIT 1`,
    [studentId],
  );
  return rows[0] || null;
}

async function listResponsesForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT id, student_id, question_index, selected_styles, created_at
       FROM vark_responses
      WHERE student_id = ?
      ORDER BY question_index ASC`,
    [studentId],
  );
  // mysql2 returns JSON columns already parsed; coerce defensively in case
  // the column type ever drifts.
  return rows.map((r) => ({
    ...r,
    selected_styles:
      typeof r.selected_styles === 'string'
        ? JSON.parse(r.selected_styles)
        : r.selected_styles,
  }));
}

// Replaces all stored responses for the student and upserts the profile
// in a single transaction. `responses` is the validated payload from
// POST /api/vark/submit. `scores` is {V,A,R,K} counts; `dominantStyle`
// is the lowercased canonical name (visual/auditory/reading/kinesthetic).
async function saveQuestionnaire({
  studentId,
  responses,
  scores,
  dominantStyle,
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Wipe the student's previous answers — re-submission is allowed and
    // we don't want phantom rows from an earlier attempt skewing scores.
    await conn.query('DELETE FROM vark_responses WHERE student_id = ?', [
      studentId,
    ]);

    for (const r of responses) {
      await conn.query(
        `INSERT INTO vark_responses (student_id, question_index, selected_styles)
         VALUES (?, ?, CAST(? AS JSON))`,
        [studentId, r.questionIndex, JSON.stringify(r.selectedStyles)],
      );
    }

    await conn.query(
      `INSERT INTO vark_profiles
         (student_id, visual_score, auditory_score, reading_score,
          kinesthetic_score, dominant_style)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         visual_score = VALUES(visual_score),
         auditory_score = VALUES(auditory_score),
         reading_score = VALUES(reading_score),
         kinesthetic_score = VALUES(kinesthetic_score),
         dominant_style = VALUES(dominant_style)`,
      [
        studentId,
        scores.V,
        scores.A,
        scores.R,
        scores.K,
        dominantStyle,
      ],
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

  return findByStudentId(studentId);
}

module.exports = {
  findByStudentId,
  listResponsesForStudent,
  saveQuestionnaire,
};
