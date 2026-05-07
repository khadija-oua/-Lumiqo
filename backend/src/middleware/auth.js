const { verify } = require('../utils/jwt');
const { HttpError } = require('../utils/http-error');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'UNAUTHENTICATED', 'Authentification requise.'));
  }

  try {
    const payload = verify(token);
    req.user = {
      id: payload.userId,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    const message =
      err.name === 'TokenExpiredError'
        ? 'Votre session a expiré. Veuillez vous reconnecter.'
        : 'Jeton d\'authentification invalide.';
    return next(new HttpError(401, code, message));
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'UNAUTHENTICATED', 'Authentification requise.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'FORBIDDEN', 'Accès refusé.'));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
