const { Router } = require('express');
const { body, param } = require('express-validator');

const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', adminController.listUsers);

router.patch(
  '/users/:id/role',
  [
    param('id').isInt({ min: 1 }).withMessage('ID utilisateur invalide.'),
    body('role')
      .isIn(['student', 'teacher', 'admin'])
      .withMessage('Le rôle doit être student, teacher ou admin.'),
  ],
  validate,
  adminController.changeRole,
);

router.delete(
  '/users/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID utilisateur invalide.')],
  validate,
  adminController.deleteUser,
);

module.exports = router;
