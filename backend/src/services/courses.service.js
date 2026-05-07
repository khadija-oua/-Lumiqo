const { pool } = require('../config/db');

async function listAll() {
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.description, c.teacher_id, c.cover_image_url,
            c.created_at, c.updated_at,
            u.first_name AS teacher_first_name,
            u.last_name  AS teacher_last_name
       FROM courses c
       JOIN users u ON u.id = c.teacher_id
      ORDER BY c.created_at DESC`,
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.description, c.teacher_id, c.cover_image_url,
            c.created_at, c.updated_at,
            u.first_name AS teacher_first_name,
            u.last_name  AS teacher_last_name
       FROM courses c
       JOIN users u ON u.id = c.teacher_id
      WHERE c.id = ?
      LIMIT 1`,
    [id],
  );
  return rows[0] || null;
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
