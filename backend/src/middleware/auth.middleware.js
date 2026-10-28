import { AUTH_COOKIE_NAME, verifyAuthToken } from '../utils/token.js';
import User from '../models/User.js';

/**
 * Middleware requiring a valid signed authentication cookie.
 * Verifies JWT signature, expiration, and user tokenVersion.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    let decoded;
    try {
      decoded = verifyAuthToken(token);
    } catch (err) {
      return res.status(401).json({
        error: 'Session expired or invalid',
      });
    }

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        error: 'Invalid authentication token claims',
      });
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        error: 'Account not found',
      });
    }

    // Check if token was invalidated by a subsequent logout or password change
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        error: 'Session has been invalidated. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware.
 * Attaches user if a valid token is present; does not reject request if absent or invalid.
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = verifyAuthToken(token);
      if (decoded?.sub) {
        const user = await User.findById(decoded.sub);
        if (user && user.tokenVersion === decoded.tokenVersion) {
          req.user = user;
          return next();
        }
      }
    } catch {
      // Ignore token verification errors for optional auth
    }

    req.user = null;
    next();
  } catch (error) {
    next(error);
  }
}

