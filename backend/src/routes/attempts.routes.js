const { Router } = require('express');
const { body, param } = require('express-validator');

const attemptsController = require('../controllers/attempts.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();
router.use(requireAuth);

router.post(
  '/:attemptId/answer',
  [
    param('attemptId').isInt({ min: 1 }).withMessage('ID de tentative invalide.'),
    body('questionId').isInt({ min: 1 }).withMessage('ID de question invalide.'),
    body('selectedAnswerId')
      .isInt({ min: 1 })
      .withMessage('ID de réponse invalide.'),
  ],
  validate,
  attemptsController.answer,
);

router.get(
  '/:id/result',
  [param('id').isInt({ min: 1 }).withMessage('ID de tentative invalide.')],
  validate,
  attemptsController.result,
);

module.exports = router;
