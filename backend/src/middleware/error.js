const { HttpError } = require('../utils/http-error');

function notFound(_req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Ressource introuvable.'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  // Unexpected — log full stack, return generic message in English.
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' },
  });
}

module.exports = { notFound, errorHandler };
