const { Router } = require('express');
const { body, param } = require('express-validator');

const materialsController = require('../controllers/materials.controller');
const quizzesController = require('../controllers/quizzes.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(requireAuth);

router.get(
  '/:id/download',
  [param('id').isInt({ min: 1 }).withMessage('ID de matériel invalide.')],
  validate,
  materialsController.download,
);

router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID de matériel invalide.')],
  validate,
  materialsController.remove,
);

// Generate an AI-authored MCQ quiz from a PDF material. Teacher-only,
// ownership check happens in the controller. Long-running (~10–30 s).
router.post(
  '/:id/generate-quiz',
  requireRole('teacher'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID de matériel invalide.'),
    body('numEasy')
      .optional()
      .isInt({ min: 0, max: 20 })
      .withMessage('numEasy doit être un entier entre 0 et 20.')
      .toInt(),
    body('numMedium')
      .optional()
      .isInt({ min: 0, max: 20 })
      .withMessage('numMedium doit être un entier entre 0 et 20.')
      .toInt(),
    body('numHard')
      .optional()
      .isInt({ min: 0, max: 20 })
      .withMessage('numHard doit être un entier entre 0 et 20.')
      .toInt(),
  ],
  validate,
  quizzesController.generateFromMaterial,
);

module.exports = router;
