const { Router } = require('express');
const { body, param } = require('express-validator');

const coursesController = require('../controllers/courses.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

// All course endpoints require authentication.
router.use(requireAuth);

router.get('/', coursesController.list);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID de cours invalide.')],
  validate,
  coursesController.detail,
);

router.get(
  '/:id/students',
  [param('id').isInt({ min: 1 }).withMessage('ID de cours invalide.')],
  validate,
  requireRole('teacher', 'admin'),
  coursesController.listStudents,
);

router.post(
  '/',
  requireRole('teacher'),
  [
    body('title')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Le titre est requis (255 caractères max).'),
    body('description').optional({ nullable: true }).isString(),
    body('coverImageUrl')
      .optional({ nullable: true })
      .isURL()
      .withMessage('URL de couverture invalide.'),
  ],
  validate,
  coursesController.create,
);

router.put(
  '/:id',
  requireRole('teacher', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID de cours invalide.'),
    body('title')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Titre invalide.'),
    body('description').optional({ nullable: true }).isString(),
    body('coverImageUrl')
      .optional({ nullable: true })
      .isURL()
      .withMessage('URL de couverture invalide.'),
  ],
  validate,
  coursesController.update,
);

router.delete(
  '/:id',
  requireRole('teacher', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('ID de cours invalide.')],
  validate,
  coursesController.remove,
);

module.exports = router;
