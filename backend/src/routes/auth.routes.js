const { Router } = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères.'),
    body('firstName')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Le prénom est requis.'),
    body('lastName')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Le nom est requis.'),
    body('role')
      .isIn(['student', 'teacher'])
      .withMessage('Le rôle doit être student ou teacher.'),
  ],
  validate,
  authController.register,
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Mot de passe requis.'),
  ],
  validate,
  authController.login,
);

router.get('/me', requireAuth, authController.me);

module.exports = router;
