const chatService = require('../services/chat.service');
const coursesService = require('../services/courses.service');
const materialsService = require('../services/materials.service');
const varkService = require('../services/vark.service');
const geminiService = require('../services/gemini.service');
const accessService = require('../services/access.service');
const {
  buildSystemPrimer,
  detectsQuizCheating,
  CHEAT_REFUSAL,
} = require('./prompts/chatPrompt');
const { HttpError } = require('../utils/http-error');

const HISTORY_TURNS = 20;

function logUsage(tag, usage) {
  if (!usage) return;
  console.log(
    `[gemini] ${tag} tokens prompt=${usage.promptTokenCount ?? '?'} ` +
      `candidates=${usage.candidatesTokenCount ?? '?'} ` +
      `total=${usage.totalTokenCount ?? '?'}`,
  );
}

async function fetchCourseContext(courseId) {
  const course = await coursesService.findById(courseId);
  if (!course) return null;
  const materials = await materialsService.listForCourse(courseId);
  return {
    title: course.title,
    description: course.description || null,
    materialTitles: materials.map((m) => m.title),
  };
}

function dbHistoryToGemini(rows) {
  // Map our 'student'/'bot' enum to Gemini's 'user'/'model' role names.
  return rows.map((m) => ({
    role: m.sender === 'student' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
}

// Gemini's chat API requires history to start with a user turn and to
// alternate user/model strictly. If the very first stored message in this
// session is a bot turn (e.g., a cheat-refusal that opened the session for
// some reason), drop it. Then collapse any accidental same-role pairs.
function sanitizeHistory(history) {
  const out = [];
  for (const turn of history) {
    if (out.length === 0 && turn.role !== 'user') continue;
    if (out.length > 0 && out[out.length - 1].role === turn.role) {
      // Same role twice in a row — drop the older one.
      out.pop();
    }
    out.push(turn);
  }
  return out;
}

async function sendMessage({ studentId, sessionId, courseId, userMessage }) {
  // 1. Resolve or create the session
  let session;
  if (sessionId != null) {
    session = await chatService.findSessionById(sessionId);
    if (!session) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', 'Session de discussion introuvable.');
    }
    if (session.student_id !== studentId) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }
    // If the caller passes a courseId, it must match the session's existing one.
    if (
      courseId != null &&
      session.course_id != null &&
      session.course_id !== courseId
    ) {
      throw new HttpError(
        400,
        'COURSE_MISMATCH',
        'Cette session est rattachée à un autre cours.',
      );
    }
  } else {
    if (courseId != null) {
      // Verify the student can actually access the course before binding it.
      await accessService.ensureCourseReadAccess(
        { id: studentId, role: 'student' },
        courseId,
      );
    }
    session = await chatService.createSession({
      studentId,
      courseId: courseId ?? null,
    });
  }

  // 2. Cheat guardrail — refuse without calling Gemini.
  if (detectsQuizCheating(userMessage)) {
    await chatService.appendMessage({
      sessionId: session.id,
      sender: 'student',
      content: userMessage,
    });
    const botMessage = await chatService.appendMessage({
      sessionId: session.id,
      sender: 'bot',
      content: CHEAT_REFUSAL,
    });
    console.log(`[chatAgent] cheat refusal (session=${session.id})`);
    return { sessionId: session.id, botMessage, refused: true };
  }

  // 3. Persist the student turn first so the message survives any Gemini failure.
  const studentMsg = await chatService.appendMessage({
    sessionId: session.id,
    sender: 'student',
    content: userMessage,
  });

  try {
    // 4. Load prior conversation (excluding the just-inserted student turn).
    const recent = await chatService.listRecentMessages(
      session.id,
      HISTORY_TURNS + 1,
    );
    const prior = recent.filter((m) => m.id !== studentMsg.id);
    const history = sanitizeHistory(dbHistoryToGemini(prior));

    // 5. Build system primer with course + VARK context.
    const effectiveCourseId = session.course_id;
    const [courseContext, varkProfile] = await Promise.all([
      effectiveCourseId ? fetchCourseContext(effectiveCourseId) : null,
      varkService.findByStudentId(studentId),
    ]);
    const systemInstruction = buildSystemPrimer({
      courseContext,
      varkStyle: varkProfile?.dominant_style,
    });

    // 6. Gemini call (multi-turn).
    const { text, usage } = await geminiService.generateChat({
      systemInstruction,
      history,
      userMessage,
    });
    logUsage(`chat session=${session.id}`, usage);

    const reply = (text || '').trim();
    if (!reply) {
      throw new Error('Gemini returned an empty reply');
    }

    // 7. Persist the bot turn.
    const botMessage = await chatService.appendMessage({
      sessionId: session.id,
      sender: 'bot',
      content: reply,
    });

    return { sessionId: session.id, botMessage, refused: false };
  } catch (err) {
    // Compensating delete: roll back the orphaned student turn so the next
    // request's history stays consistently alternating user/model.
    try {
      await chatService.deleteMessageById(studentMsg.id);
    } catch (_) {
      /* best-effort */
    }
    if (err instanceof HttpError) throw err;
    console.error(
      `[chatAgent] Gemini call failed (session=${session.id}):`,
      err.message,
    );
    throw new HttpError(
      502,
      'CHAT_ERROR',
      "Le chatbot n'est pas disponible pour le moment. Veuillez réessayer dans quelques instants.",
    );
  }
}

module.exports = { sendMessage };
