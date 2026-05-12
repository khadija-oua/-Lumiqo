const { pool } = require('../config/db');

const SESSION_COLS =
  'id, student_id, course_id, started_at, last_message_at';
const MESSAGE_COLS = 'id, session_id, sender, content, created_at';

async function findSessionById(id) {
  const [rows] = await pool.query(
    `SELECT ${SESSION_COLS} FROM chat_sessions WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function createSession({ studentId, courseId }) {
  const [res] = await pool.query(
    `INSERT INTO chat_sessions (student_id, course_id) VALUES (?, ?)`,
    [studentId, courseId ?? null],
  );
  return findSessionById(res.insertId);
}

// Lists the current student's sessions with a short preview of the first
// student message in each — useful for an "Open recent chat" UI.
async function listSessionsForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.course_id, s.started_at, s.last_message_at,
            c.title AS course_title,
            (SELECT m.content FROM chat_messages m
              WHERE m.session_id = s.id AND m.sender = 'student'
              ORDER BY m.id ASC LIMIT 1) AS preview
       FROM chat_sessions s
       LEFT JOIN courses c ON c.id = s.course_id
      WHERE s.student_id = ?
      ORDER BY s.last_message_at DESC, s.id DESC`,
    [studentId],
  );
  return rows.map((r) => ({
    ...r,
    preview: r.preview ? r.preview.slice(0, 200) : null,
  }));
}

async function getSessionWithMessages(sessionId) {
  const session = await findSessionById(sessionId);
  if (!session) return null;
  const [messages] = await pool.query(
    `SELECT ${MESSAGE_COLS} FROM chat_messages
      WHERE session_id = ?
      ORDER BY id ASC`,
    [sessionId],
  );
  return { ...session, messages };
}

async function deleteSessionById(id) {
  const [res] = await pool.query(
    `DELETE FROM chat_sessions WHERE id = ?`,
    [id],
  );
  return res.affectedRows > 0;
}

async function appendMessage({ sessionId, sender, content }) {
  const [ins] = await pool.query(
    `INSERT INTO chat_messages (session_id, sender, content) VALUES (?, ?, ?)`,
    [sessionId, sender, content],
  );
  // Bump last_message_at explicitly (rather than via a no-op UPDATE).
  await pool.query(
    `UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [sessionId],
  );
  const [rows] = await pool.query(
    `SELECT ${MESSAGE_COLS} FROM chat_messages WHERE id = ? LIMIT 1`,
    [ins.insertId],
  );
  return rows[0];
}

async function deleteMessageById(id) {
  const [res] = await pool.query(
    `DELETE FROM chat_messages WHERE id = ?`,
    [id],
  );
  return res.affectedRows > 0;
}

// Returns up to `limit` most-recent messages in chronological (oldest first)
// order — ready to be passed as Gemini chat history.
async function listRecentMessages(sessionId, limit) {
  const [rows] = await pool.query(
    `SELECT ${MESSAGE_COLS} FROM (
        SELECT ${MESSAGE_COLS}
          FROM chat_messages
         WHERE session_id = ?
         ORDER BY id DESC
         LIMIT ?
      ) AS recent
      ORDER BY id ASC`,
    [sessionId, limit],
  );
  return rows;
}

module.exports = {
  findSessionById,
  createSession,
  listSessionsForStudent,
  getSessionWithMessages,
  deleteSessionById,
  appendMessage,
  deleteMessageById,
  listRecentMessages,
};
