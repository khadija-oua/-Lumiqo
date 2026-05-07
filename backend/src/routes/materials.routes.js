const { Router } = require('express');
const { param } = require('express-validator');

const materialsController = require('../controllers/materials.controller');
const { requireAuth } = require('../middleware/auth');
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

module.exports = router;
