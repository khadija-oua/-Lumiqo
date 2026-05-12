const { pool } = require('../config/db');

// Phase 5: read-only access to vark_profiles so the chatbot can adapt
// explanations to the student's dominant learning style. Phase 6 will add
// write paths (questionnaire scoring, profile creation/update).

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

module.exports = { findByStudentId };
