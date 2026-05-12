const chatService = require('../services/chat.service');
const chatbotAgent = require('../agents/chatbotAgent');
const { HttpError } = require('../utils/http-error');

// POST /api/chat/message
//
// TODO(later): consider switching to SSE streaming (POST /api/chat/stream)
// that pipes Gemini chunks back. For now we wait for the full reply, which
// is fine on gemini-2.5-flash-lite (typically a few seconds) and keeps the
// client integration trivial.
async function sendMessage(req, res, next) {
  try {
    const { sessionId, courseId, message } = req.body;
    const result = await chatbotAgent.sendMessage({
      studentId: req.user.id,
      sessionId: sessionId ?? null,
      courseId: courseId ?? null,
      userMessage: message.trim(),
    });
    res.json({
      sessionId: result.sessionId,
      reply: result.botMessage.content,
      message: result.botMessage,
      refused: !!result.refused,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/chat/sessions  — current student's own sessions
async function listSessions(req, res, next) {
  try {
    const sessions = await chatService.listSessionsForStudent(req.user.id);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

// GET /api/chat/sessions/:id  — owner student OR admin
async function getSession(req, res, next) {
  try {
    const id = Number(req.params.id);
    const session = await chatService.getSessionWithMessages(id);
    if (!session) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', 'Session de discussion introuvable.');
    }
    if (req.user.role !== 'admin' && session.student_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/chat/sessions/:id  — owner student only (spec)
async function deleteSession(req, res, next) {
  try {
    const id = Number(req.params.id);
    const session = await chatService.findSessionById(id);
    if (!session) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', 'Session de discussion introuvable.');
    }
    if (session.student_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }
    await chatService.deleteSessionById(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMessage, listSessions, getSession, deleteSession };
