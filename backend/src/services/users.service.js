const { pool } = require('../config/db');

const PUBLIC_COLUMNS =
  'id, email, first_name, last_name, role, created_at, updated_at';

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  return rows[0] || null;
}

async function findByEmailPublic(email) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function create({ email, passwordHash, firstName, lastName, role }) {
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    [email, passwordHash, firstName, lastName, role],
  );
  return findById(result.insertId);
}

async function listAll() {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY id ASC`,
  );
  return rows;
}

async function updateRole(id, role) {
  const [result] = await pool.query(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, id],
  );
  if (result.affectedRows === 0) return null;
  return findById(id);
}

async function deleteById(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  findById,
  findByEmail,
  findByEmailPublic,
  create,
  listAll,
  updateRole,
  deleteById,
};
