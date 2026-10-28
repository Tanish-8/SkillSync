/**
 * State-changing request origin verification middleware.
 *
 * For browser-originated state-changing requests (POST, PUT, PATCH, DELETE),
 * verifies that the supplied Origin header matches the configured CLIENT_URL.
 * Requests without an Origin header (e.g., CLI tools, curl, Node.js automated test suites)
 * are allowed for testing flexibility.
 */
export function checkOrigin(req, res, next) {
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  // Allow requests without Origin header (curl, Node.js tests, server-to-server)
  if (!origin) {
    return next();
  }

  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

  if (origin !== allowedOrigin) {
    return res.status(403).json({
      error: 'Forbidden: Origin header does not match allowed client origin',
    });
  }

  next();
}

