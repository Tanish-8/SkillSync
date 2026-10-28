/**
 * Centralized error-handling middleware.
 * Returns consistent, sanitized JSON responses without leaking stack traces,
 * database internals, passwords, or environment secrets.
 */
export function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle malformed JSON request bodies
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON payload in request body',
    });
  }

  // Handle Mongoose duplicate key errors (code 11000)
  if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
    return res.status(409).json({
      error: 'An account with this email address already exists',
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      error: messages[0] || 'Validation error',
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid resource identifier format',
    });
  }

  // Generic sanitized fallback error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.isOperational ? err.message : 'An unexpected internal error occurred',
  });
}

