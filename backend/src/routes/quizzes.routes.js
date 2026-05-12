const { Router } = require('express');
const { param } = require('express-validator');

const quizzesController = require('../controllers/quizzes.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();
router.use(requireAuth);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID de quiz invalide.')],
  validate,
  quizzesController.detail,
);

router.post(
  '/:id/start',
  requireRole('student'),
  [param('id').isInt({ min: 1 }).withMessage('ID de quiz invalide.')],
  validate,
  quizzesController.start,
);

module.exports = router;
