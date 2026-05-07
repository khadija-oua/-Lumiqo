// Lightweight HTTP error class controllers can throw.
// The centralized error handler converts it to {error: {code, message}}.
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { HttpError };
