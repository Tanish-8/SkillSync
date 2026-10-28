import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import { connectDB, closeDB } from '../../src/config/db.js';
import { AUTH_COOKIE_NAME } from '../../src/utils/token.js';

describe('SkillSync Backend Authentication & MongoDB - Integration Tests', () => {
  let server;
  let baseUrl;
  const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/skillsync_test';

  before(async () => {
    // 1. Set required test environment variables
    process.env.JWT_SECRET = 'integration-test-secret-key-32-chars-minimum-safe';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';

    // 2. Connect to local test database
    await connectDB(TEST_DB_URI);

    // 3. Clear existing test users
    await User.deleteMany({});

    // 4. Start HTTP server on an ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    // Clean up test data
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await closeDB();
    }

    // Close HTTP server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Flow 1: Register using a valid personal email
  it('1. registers a new user with a valid personal email (student@gmail.com)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Alex Personal',
        email: 'student@gmail.com',
        password: 'Password123!',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.email, 'student@gmail.com');
    assert.equal(data.user.name, 'Alex Personal');
    assert.equal(typeof data.user.id, 'string');
    assert.equal(data.user.passwordHash, undefined, 'passwordHash must never be exposed');

    // Verify Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Set-Cookie header must be present');
    assert.ok(setCookie.includes(AUTH_COOKIE_NAME));
    assert.ok(setCookie.toLowerCase().includes('httponly'));
    assert.ok(setCookie.toLowerCase().includes('samesite=lax'));
  });

  // Flow 2: Register using a valid academic email
  it('2. registers a new user with a valid academic email (student@iitd.ac.in)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Priya Academic',
        email: 'student@iitd.ac.in',
        password: 'AcademicSecurePass2026!',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.email, 'student@iitd.ac.in');
    assert.equal(data.user.name, 'Priya Academic');
    assert.equal(data.user.passwordHash, undefined);
  });

  // Flow 3: Reject malformed email and invalid password inputs
  it('3. rejects malformed emails and invalid password inputs with HTTP 400', async () => {
    // Malformed email
    const resEmail = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'notanemail',
        password: 'ValidPassword123!',
      }),
    });
    assert.equal(resEmail.status, 400);
    const errEmail = await resEmail.json();
    assert.equal(errEmail.error, 'Please enter a valid email address');

    // Password too short (< 8 chars)
    const resShortPass = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Pass User',
        email: 'valid.user@university.edu',
        password: 'short',
      }),
    });
    assert.equal(resShortPass.status, 400);
    const errShortPass = await resShortPass.json();
    assert.equal(errShortPass.error, 'Password must be at least 8 characters long');

    // Missing name
    const resNoName = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '   ',
        email: 'valid.user2@university.edu',
        password: 'ValidPassword123!',
      }),
    });
    assert.equal(resNoName.status, 400);
  });

  // Flow 4: Reject duplicate registration
  it('4. rejects duplicate registration with HTTP 409 Conflict', async () => {
    // Attempt to register again with student@gmail.com (differing casing)
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Alex',
        email: 'STUDENT@GMAIL.COM',
        password: 'AnotherPassword123!',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.error, 'An account with this email address already exists');
  });

  // Flow 5: Log in with correct credentials
  let authCookie;
  it('5. logs in successfully with correct credentials and returns HTTP-only cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@gmail.com',
        password: 'Password123!',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.email, 'student@gmail.com');
    assert.equal(data.user.passwordHash, undefined);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes(AUTH_COOKIE_NAME));

    // Store cookie string for subsequent authenticated requests
    authCookie = setCookie.split(';')[0];
  });

  // Flow 6: Reject incorrect credentials
  it('6. rejects incorrect password with generic HTTP 401 error', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@gmail.com',
        password: 'WrongPassword999!',
      }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Invalid email or password');
  });

  it('6b. rejects nonexistent email with identical generic HTTP 401 error', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@university.edu',
        password: 'SomePassword123!',
      }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Invalid email or password');
  });

  // Flow 7: Verify passwords are stored as hashes
  it('7. verifies user password is stored as a bcrypt hash in MongoDB', async () => {
    const dbUser = await User.findOne({ email: 'student@gmail.com' }).select('+passwordHash');
    assert.ok(dbUser);
    assert.ok(dbUser.passwordHash);
    assert.notEqual(dbUser.passwordHash, 'Password123!');
    assert.ok(dbUser.passwordHash.startsWith('$2a$12$') || dbUser.passwordHash.startsWith('$2b$12$'));
  });

  // Flow 8: Access /api/auth/me while authenticated
  it('8. accesses /api/auth/me successfully with valid cookie (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: authCookie,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.email, 'student@gmail.com');
    assert.equal(data.user.name, 'Alex Personal');
    assert.equal(data.user.passwordHash, undefined);
  });

  // Flow 9: Reject /api/auth/me without valid cookie
  it('9. rejects /api/auth/me without cookie (HTTP 401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Authentication required');
  });

  it('9b. rejects /api/auth/me with invalid/corrupt cookie (HTTP 401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=invalid.jwt.token`,
      },
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Session expired or invalid');
  });

  // Flow 10: Log out and confirm prior token is invalidated
  it('10. logs out, clears cookie, and invalidates previously issued token', async () => {
    const resLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: authCookie,
      },
    });

    assert.equal(resLogout.status, 200);
    const dataLogout = await resLogout.json();
    assert.equal(dataLogout.message, 'Successfully logged out');

    // Verify clearing cookie was sent
    const clearCookieHeader = resLogout.headers.get('set-cookie');
    assert.ok(clearCookieHeader);
    assert.ok(clearCookieHeader.includes('Max-Age=0') || clearCookieHeader.includes('Thu, 01 Jan 1970'));

    // Verify tokenVersion was incremented in database
    const dbUser = await User.findOne({ email: 'student@gmail.com' });
    assert.equal(dbUser.tokenVersion, 1, 'tokenVersion must be incremented upon logout');

    // Attempt to use the prior authCookie now that tokenVersion has changed
    const resSubsequentMe = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: authCookie,
      },
    });

    assert.equal(resSubsequentMe.status, 401, 'Previous token must be rejected because tokenVersion is outdated');
    const dataSubsequent = await resSubsequentMe.json();
    assert.equal(dataSubsequent.error, 'Session has been invalidated. Please log in again.');
  });

  // Flow 11: Origin checks and CORS
  it('11. verifies origin header protection against unauthorized cross-site POSTs', async () => {
    // Malicious external origin
    const resForbidden = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://malicious-attacker.com',
      },
      body: JSON.stringify({
        email: 'student@gmail.com',
        password: 'Password123!',
      }),
    });

    assert.equal(resForbidden.status, 403);
    const dataForbidden = await resForbidden.json();
    assert.ok(dataForbidden.error.includes('Origin header does not match'));

    // Legitimate configured frontend origin
    const resAllowed = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        email: 'student@gmail.com',
        password: 'Password123!',
      }),
    });

    assert.equal(resAllowed.status, 200);
  });

  // Flow 12: Health check endpoint
  it('12. verifies /api/health reflects active database connection without leaking secrets', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'skillsync-backend');
    assert.equal(data.database.status, 'connected');
    assert.equal(typeof data.uptime, 'number');
    assert.equal(data.database.password, undefined);
    assert.equal(data.database.uri, undefined);
  });
});

