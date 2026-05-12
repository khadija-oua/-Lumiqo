const { Router } = require('express');
const { param } = require('express-validator');

const varkController = require('../controllers/vark.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(requireAuth);

// Anyone authenticated may fetch the questionnaire (e.g. teachers previewing).
router.get('/questions', varkController.getQuestions);

// Submitting and reading your own profile is student-only.
router.post('/submit', requireRole('student'), varkController.submit);

router.get('/me', requireRole('student'), varkController.me);

// Teacher of a course the student is enrolled in, or admin.
router.get(
  '/student/:id',
  [param('id').isInt({ min: 1 }).withMessage("ID d'étudiant invalide.")],
  validate,
  varkController.getStudentProfile,
);

module.exports = router;
