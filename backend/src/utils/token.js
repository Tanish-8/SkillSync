import jwt from 'jsonwebtoken';

export const AUTH_COOKIE_NAME = 'skillsync_token';

/**
 * Parses duration strings like '30m', '1h', '7d' or numbers into milliseconds.
 *
 * @param {string|number} duration
 * @returns {number} Milliseconds
 */
export function parseDurationToMs(duration) {
  if (typeof duration === 'number') {
    return duration * 1000;
  }

  const str = String(duration).trim().toLowerCase();
  const match = str.match(/^(\d+)([smhd]?)$/);

  if (!match) {
    return 30 * 60 * 1000; // default 30 minutes
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}

/**
 * Returns consistent secure cookie options.
 *
 * @returns {import('express').CookieOptions}
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = parseDurationToMs(process.env.JWT_EXPIRES_IN || '30m');

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge,
  };
}

/**
 * Signs a short-lived JWT containing user ID and tokenVersion.
 *
 * @param {object} user Mongoose user document or object with _id/id and tokenVersion
 * @returns {string} Signed JWT
 */
export function signAuthToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const userId = user._id ? user._id.toString() : user.id;
  const tokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;

  const payload = {
    sub: userId,
    tokenVersion,
  };

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '30m',
  });
}

/**
 * Verifies and decodes an authentication token.
 *
 * @param {string} token Signed JWT
 * @returns {object} Decoded payload
 */
export function verifyAuthToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
  });
}

/**
 * Sets the signed JWT in an HTTP-only cookie on the response.
 *
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
}

/**
 * Clears the authentication cookie using matching path and security attributes.
 *
 * @param {import('express').Response} res
 */
export function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  });
}

