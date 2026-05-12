const { pool } = require('../config/db');

// learning_paths schema (Phase 1):
//   id, student_id, course_id, recommended_materials JSON,
//   recommended_difficulty ENUM('easy','medium','hard'), generated_at,
//   UNIQUE(student_id, course_id)
//
// We store both the ordered material IDs AND tailored tips in the JSON
// column under one envelope: { material_order: [int], tips: [string] }.

const COLS =
  'id, student_id, course_id, recommended_materials, recommended_difficulty, generated_at';

function decodePath(row) {
  if (!row) return null;
  const raw =
    typeof row.recommended_materials === 'string'
      ? JSON.parse(row.recommended_materials)
      : row.recommended_materials || {};
  return {
    id: row.id,
    student_id: row.student_id,
    course_id: row.course_id,
    recommended_difficulty: row.recommended_difficulty,
    material_order: Array.isArray(raw.material_order) ? raw.material_order : [],
    tips: Array.isArray(raw.tips) ? raw.tips : [],
    generated_at: row.generated_at,
  };
}

async function findByStudentCourse(studentId, courseId) {
  const [rows] = await pool.query(
    `SELECT ${COLS} FROM learning_paths
      WHERE student_id = ? AND course_id = ?
      LIMIT 1`,
    [studentId, courseId],
  );
  return decodePath(rows[0]);
}

async function upsert({
  studentId,
  courseId,
  materialOrder,
  recommendedDifficulty,
  tips,
}) {
  const payload = {
    material_order: Array.isArray(materialOrder) ? materialOrder : [],
    tips: Array.isArray(tips) ? tips : [],
  };
  await pool.query(
    `INSERT INTO learning_paths
       (student_id, course_id, recommended_materials, recommended_difficulty)
     VALUES (?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE
       recommended_materials = VALUES(recommended_materials),
       recommended_difficulty = VALUES(recommended_difficulty),
       generated_at = CURRENT_TIMESTAMP`,
    [studentId, courseId, JSON.stringify(payload), recommendedDifficulty],
  );
  return findByStudentCourse(studentId, courseId);
}

module.exports = { findByStudentCourse, upsert };
