const { validationResult } = require('express-validator');
const { HttpError } = require('../utils/http-error');

// Run after a chain of express-validator checks. Aggregates errors
// into a 400 response with a French message and per-field details.
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fields = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  return next(
    new HttpError(400, 'VALIDATION_ERROR', 'Les données envoyées sont invalides.', { fields }),
  );
}

module.exports = { validate };
