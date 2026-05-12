const { Router } = require('express');
const { body, param } = require('express-validator');

const chatController = require('../controllers/chat.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { chatLimiter } = require('../middleware/rate-limit');

const router = Router();

router.use(requireAuth);

// Posting a message is student-only AND rate-limited per user.
router.post(
  '/message',
  requireRole('student'),
  chatLimiter,
  [
    body('sessionId')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('ID de session invalide.')
      .toInt(),
    body('courseId')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('ID de cours invalide.')
      .toInt(),
    body('message')
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Le message doit contenir entre 1 et 2000 caractères.'),
  ],
  validate,
  chatController.sendMessage,
);

// Listing and reading sessions is student-only too (admins can still read
// via the `getSession` ownership check, but the listing is per-student).
router.get('/sessions', requireRole('student'), chatController.listSessions);

router.get(
  '/sessions/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID de session invalide.')],
  validate,
  chatController.getSession,
);

router.delete(
  '/sessions/:id',
  requireRole('student'),
  [param('id').isInt({ min: 1 }).withMessage('ID de session invalide.')],
  validate,
  chatController.deleteSession,
);

module.exports = router;
