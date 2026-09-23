const config = require('../config');

/**
 * Centralized error-handling middleware.
 * Produces a consistent JSON error response shape for all errors.
 *
 * Response shape:
 * {
 *   success: false,
 *   error: {
 *     code: 'MACHINE_READABLE_CODE',
 *     message: 'Human-readable message',
 *     details: [...] | null
 *   }
 * }
 */
function errorHandler(err, req, res, _next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose duplicate key error
  if (err.code === 11000 || err.code === '11000') {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const fields = Object.keys(err.keyPattern || {}).join(', ');
    message = `Duplicate value for: ${fields}`;
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for ${err.path}: ${err.value}`;
  }

  // Rate limit error — set Retry-After header
  if (statusCode === 429 && err.retryAfter) {
    res.set('Retry-After', String(err.retryAfter));
  }

  // Log unexpected errors (non-operational)
  if (!err.isOperational) {
    console.error('[ERROR] Unexpected error:', err);
  }

  // In production, hide internal error details
  if (config.isProduction && statusCode === 500) {
    message = 'Internal server error';
    details = null;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

module.exports = errorHandler;
