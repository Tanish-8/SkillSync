import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints (register, login).
 * Limits repeated authentication attempts to protect against brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Limit each IP to 30 authentication attempts per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many authentication attempts. Please try again later.',
  },
  skip: (req) => {
    // Skip rate limiting during local automated test execution
    return process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'];
  },
});

/**
 * Rate limiter for matching preview computation endpoints.
 * Protects server resources from computational abuse while allowing standard preview usage.
 */
export const matchingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  limit: (req) => (process.env.MATCHING_RATE_LIMIT_MAX ? Number(process.env.MATCHING_RATE_LIMIT_MAX) : 100),
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many matching preview requests. Please try again later.',
  },
  skip: (req) => {
    // Skip rate limiting during local automated test execution unless testing rate limit
    return process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'];
  },
});
