const { Router } = require('express');
const { body } = require('express-validator');

const enrollmentsController = require('../controllers/enrollments.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  requireRole('student'),
  [body('courseId').isInt({ min: 1 }).withMessage('ID de cours invalide.')],
  validate,
  enrollmentsController.enroll,
);

router.get('/me', requireRole('student'), enrollmentsController.listMine);

module.exports = router;
