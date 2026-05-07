const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';

function sign(payload) {
  if (!SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verify(token) {
  if (!SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
