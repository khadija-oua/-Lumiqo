const { pool } = require('../config/db');

// Single source of truth for the SELECT projection. Includes per-course
// counts (enrollments / materials / quizzes) as correlated subqueries
// so every consumer gets them for free without N+1 calls.
const COURSE_SELECT = `
  c.id, c.title, c.description, c.teacher_id, c.cover_image_url,
  c.created_at, c.updated_at,
  u.first_name AS teacher_first_name,
  u.last_name  AS teacher_last_name,
  (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id)      AS enrollment_count,
  (SELECT COUNT(*) FROM course_materials m WHERE m.course_id = c.id) AS material_count,
  (SELECT COUNT(*) FROM quizzes q WHERE q.course_id = c.id)          AS quiz_count
`;

function decodeCourseRow(row) {
  if (!row) return null;
  return {
    ...row,
    enrollment_count: Number(row.enrollment_count) || 0,
    material_count: Number(row.material_count) || 0,
    quiz_count: Number(row.quiz_count) || 0,
  };
}

async function listAll() {
  const [rows] = await pool.query(
    `SELECT ${COURSE_SELECT}
       FROM courses c
       JOIN users u ON u.id = c.teacher_id
      ORDER BY c.created_at DESC`,
  );
  return rows.map(decodeCourseRow);
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${COURSE_SELECT}
       FROM courses c
       JOIN users u ON u.id = c.teacher_id
      WHERE c.id = ?
      LIMIT 1`,
    [id],
  );
  return decodeCourseRow(rows[0]);
}

async function findByIdWithMaterials(id) {
  const course = await findById(id);
  if (!course) return null;
  const [materials] = await pool.query(
    `SELECT id, course_id, title, file_type, drive_file_id, drive_url,
            uploaded_by, created_at
       FROM course_materials
      WHERE course_id = ?
      ORDER BY created_at ASC`,
    [id],
  );
  return { ...course, materials };
}

async function create({ title, description, teacherId, coverImageUrl }) {
  const [result] = await pool.query(
    `INSERT INTO courses (title, description, teacher_id, cover_image_url)
     VALUES (?, ?, ?, ?)`,
    [title, description ?? null, teacherId, coverImageUrl ?? null],
  );
  return findById(result.insertId);
}

async function update(id, { title, description, coverImageUrl }) {
  const [result] = await pool.query(
    `UPDATE courses
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            cover_image_url = COALESCE(?, cover_image_url)
      WHERE id = ?`,
    [title ?? null, description ?? null, coverImageUrl ?? null, id],
  );
  if (result.affectedRows === 0) return null;
  return findById(id);
}

async function deleteById(id) {
  const [result] = await pool.query('DELETE FROM courses WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function listStudents(courseId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
            e.enrolled_at
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
      WHERE e.course_id = ?
      ORDER BY e.enrolled_at ASC`,
    [courseId],
  );
  return rows;
}

module.exports = {
  listAll,
  findById,
  findByIdWithMaterials,
  create,
  update,
  deleteById,
  listStudents,
};
