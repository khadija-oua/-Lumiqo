const { pool } = require('../config/db');

const COLUMNS =
  'id, course_id, title, file_type, drive_file_id, drive_url, uploaded_by, created_at';

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM course_materials WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function listForCourse(courseId) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM course_materials WHERE course_id = ? ORDER BY created_at ASC`,
    [courseId],
  );
  return rows;
}

async function create({
  courseId,
  title,
  fileType,
  driveFileId,
  driveUrl,
  uploadedBy,
}) {
  const [result] = await pool.query(
    `INSERT INTO course_materials
       (course_id, title, file_type, drive_file_id, drive_url, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [courseId, title, fileType, driveFileId, driveUrl, uploadedBy],
  );
  return findById(result.insertId);
}

async function deleteById(id) {
  const [result] = await pool.query(
    'DELETE FROM course_materials WHERE id = ?',
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = { findById, listForCourse, create, deleteById };
