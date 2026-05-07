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

module.exports = { authLimiter };
