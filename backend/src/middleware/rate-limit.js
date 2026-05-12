const rateLimit = require('express-rate-limit');

// 10 requests per 15 minutes per IP, scoped to /api/auth/*
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Trop de tentatives. Veuillez réessayer plus tard.',
    },
  },
});

// 30 messages per 5 minutes PER USER, scoped to /api/chat/message.
// Must run AFTER requireAuth so req.user.id is populated.
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  message: {
    error: {
      code: 'RATE_LIMITED',
      message:
        'Trop de messages envoyés au chatbot. Veuillez patienter quelques minutes.',
    },
  },
});

module.exports = { authLimiter, chatLimiter };
