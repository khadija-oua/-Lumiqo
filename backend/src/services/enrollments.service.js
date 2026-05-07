const { pool } = require('../config/db');

async function enroll(studentId, courseId) {
  const [result] = await pool.query(
    'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
    [studentId, courseId],
  );
  const [rows] = await pool.query(
    'SELECT id, student_id, course_id, enrolled_at FROM enrollments WHERE id = ?',
    [result.insertId],
  );
  return rows[0];
}

async function listForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT e.id AS enrollment_id, e.enrolled_at,
            c.id, c.title, c.description, c.teacher_id, c.cover_image_url,
            c.created_at, c.updated_at,
            u.first_name AS teacher_first_name,
            u.last_name  AS teacher_last_name
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u   ON u.id = c.teacher_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC`,
    [studentId],
  );
  return rows;
}

async function existsForStudentCourse(studentId, courseId) {
  const [rows] = await pool.query(
    'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? LIMIT 1',
    [studentId, courseId],
  );
  return rows.length > 0;
}

module.exports = { enroll, listForStudent, existsForStudentCourse };
