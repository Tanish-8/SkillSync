import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword } from '../../src/utils/password.js';
import {
  signAuthToken,
  verifyAuthToken,
  getCookieOptions,
  parseDurationToMs,
  AUTH_COOKIE_NAME,
} from '../../src/utils/token.js';

describe('Authentication Utilities - Unit Tests', () => {
  // Setup safe mock JWT secret for unit testing
  process.env.JWT_SECRET = 'unit-test-secret-key-at-least-32-chars-long-12345';
  process.env.JWT_EXPIRES_IN = '30m';

  describe('Password Hashing (bcryptjs)', () => {
    it('hashes passwords with work factor 12 and verifies them correctly', async () => {
      const password = 'SecurePassword2026!';
      const hash = await hashPassword(password);

      assert.ok(hash, 'Hash should be generated');
      assert.notEqual(hash, password, 'Hash must not equal plaintext');
      assert.ok(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$'), 'Must use work factor 12');

      const matches = await comparePassword(password, hash);
      assert.equal(matches, true, 'Correct password must verify');

      const wrong = await comparePassword('WrongPassword!', hash);
      assert.equal(wrong, false, 'Incorrect password must fail verification');
    });

    it('rejects empty or invalid parameters gracefully', async () => {
      assert.equal(await comparePassword('', 'somehash'), false);
      assert.equal(await comparePassword('password', ''), false);
      assert.equal(await comparePassword(null, null), false);
    });
  });

  describe('JWT Signing & Verification', () => {
    it('signs and verifies a valid JWT payload containing user ID and tokenVersion', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        tokenVersion: 2,
      };

      const token = signAuthToken(mockUser);
      assert.ok(typeof token === 'string' && token.split('.').length === 3, 'Must be a valid 3-part JWT');

      const decoded = verifyAuthToken(token);
      assert.equal(decoded.sub, '507f1f77bcf86cd799439011');
      assert.equal(decoded.tokenVersion, 2);
      assert.ok(decoded.exp, 'Expiration must be present in claims');
    });

    it('throws error for invalid token signature or tampered tokens', () => {
      const mockUser = { id: 'user123', tokenVersion: 0 };
      const token = signAuthToken(mockUser);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      assert.throws(() => verifyAuthToken(tamperedToken));
    });
  });

  describe('Cookie Configuration', () => {
    it('returns strict HTTP-only and lax sameSite cookie options', () => {
      const options = getCookieOptions();
      assert.equal(options.httpOnly, true, 'Cookie must be httpOnly');
      assert.equal(options.sameSite, 'lax', 'Cookie sameSite must be lax');
      assert.equal(options.path, '/', 'Cookie path must be root');
      assert.equal(options.maxAge, 30 * 60 * 1000, 'Cookie maxAge must match 30m');
      assert.equal(AUTH_COOKIE_NAME, 'skillsync_token');
    });

    it('parses duration strings accurately', () => {
      assert.equal(parseDurationToMs('15m'), 15 * 60 * 1000);
      assert.equal(parseDurationToMs('1h'), 60 * 60 * 1000);
      assert.equal(parseDurationToMs('2d'), 2 * 24 * 60 * 60 * 1000);
      assert.equal(parseDurationToMs(120), 120 * 1000);
    });
  });
});

