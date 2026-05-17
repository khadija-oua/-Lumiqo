const { Router } = require('express');
const { body, param } = require('express-validator');

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

router.patch(
  '/:id/mode',
  requireRole('teacher', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID de quiz invalide.'),
    body('mode')
      .isIn(['training', 'evaluation'])
      .withMessage('Le mode doit être "training" ou "evaluation".'),
    body('maxAttempts')
      .optional({ nullable: true })
      .isInt({ min: 1, max: 10 })
      .withMessage('maxAttempts doit être un entier entre 1 et 10.')
      .toInt(),
  ],
  validate,
  quizzesController.updateMode,
);

router.get(
  '/:id/attempts',
  requireRole('teacher', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('ID de quiz invalide.')],
  validate,
  quizzesController.listAttempts,
);

module.exports = router;
