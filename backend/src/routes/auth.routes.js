import { Router } from 'express';
import User from '../models/User.js';
import {
  validateName,
  validateEmail,
  validatePassword,
  normalizeEmail,
} from '../utils/validation.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
} from '../utils/token.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

/**
 * POST /api/auth/register
 * Registers a new student account using a personal or institutional email.
 * Sets an HTTP-only authentication cookie upon success.
 */
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // 1. Validate inputs
    const nameError = validateName(name);
    if (nameError) {
      return res.status(400).json({ error: nameError });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const normalizedEmail = normalizeEmail(email);

    // 2. Check for duplicate account early
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email address already exists',
      });
    }

    // 3. Hash password with bcryptjs (work factor 12)
    const passwordHash = await hashPassword(password);

    // 4. Create and persist user record
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      tokenVersion: 0,
    });

    // 5. Issue short-lived JWT stored in an HTTP-only cookie
    const token = signAuthToken(user);
    setAuthCookie(res, token);

    // 6. Return safe public user object (HTTP 201)
    return res.status(201).json({
      user: user.toSafeObject(),
    });
  } catch (error) {
    // Explicit duplicate key handling for concurrent registration race conditions
    if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
      return res.status(409).json({
        error: 'An account with this email address already exists',
      });
    }
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and issues an HTTP-only authentication cookie.
 * Returns a generic error on failure without revealing whether the email exists.
 */
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate request structure
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Look up user by normalized email, explicitly selecting passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Verify password with bcryptjs
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Issue short-lived JWT stored in an HTTP-only cookie
    const token = signAuthToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's safe public profile.
 * Requires a valid, unexpired, and non-invalidated authentication cookie.
 */
router.get('/me', requireAuth, async (req, res) => {
  return res.status(200).json({
    user: req.user.toSafeObject(),
  });
});

/**
 * POST /api/auth/logout
 * Invalidates the user's tokenVersion in the database, clears the authentication cookie,
 * and returns a successful response. Remains safe if no cookie or invalid cookie is present.
 */
router.post('/logout', optionalAuth, async (req, res, next) => {
  try {
    // If request has a valid authenticated session, increment tokenVersion to invalidate existing tokens
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { tokenVersion: 1 },
      });
    }

    // Clear authentication cookie with matching security options
    clearAuthCookie(res);

    return res.status(200).json({
      message: 'Successfully logged out',
    });
  } catch (error) {
    // Ensure cookie is cleared even if database operation fails
    clearAuthCookie(res);
    next(error);
  }
});

export default router;

