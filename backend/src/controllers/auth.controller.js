const bcrypt = require('bcryptjs');

const usersService = require('../services/users.service');
const { sign } = require('../utils/jwt');
const { publicUser } = require('../utils/sanitize');
const { HttpError } = require('../utils/http-error');

const BCRYPT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'Cet email est déjà utilisé.');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await usersService.create({
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      role,
    });

    const token = sign({ userId: user.id, role: user.role, email: user.email });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const row = await usersService.findByEmail(normalizedEmail);
    if (!row) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }

    const token = sign({ userId: row.id, role: row.role, email: row.email });
    res.json({ token, user: publicUser(row) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await usersService.findById(req.user.id);
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
