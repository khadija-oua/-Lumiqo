const { Router } = require('express');
const { body, query } = require('express-validator');

const learningPathsController = require('../controllers/learningPaths.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(requireAuth, requireRole('student'));

router.post(
  '/generate',
  [body('courseId').isInt({ min: 1 }).withMessage('ID de cours invalide.').toInt()],
  validate,
  learningPathsController.generate,
);

router.post(
  '/refresh',
  [body('courseId').isInt({ min: 1 }).withMessage('ID de cours invalide.').toInt()],
  validate,
  learningPathsController.refresh,
);

router.get(
  '/me',
  [query('courseId').isInt({ min: 1 }).withMessage('Paramètre courseId requis.').toInt()],
  validate,
  learningPathsController.me,
);

module.exports = router;
