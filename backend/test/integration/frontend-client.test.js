import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import { connectDB, closeDB } from '../../src/config/db.js';

describe('Frontend API Client & Auth Integration Tests', () => {
  let server;
  let clientApiUrl;
  const TEST_DB_URI = 'mongodb://127.0.0.1:27017/skillsync_frontend_test';

  before(async () => {
    process.env.JWT_SECRET = 'frontend-client-test-secret-at-least-32-chars';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';

    await connectDB(TEST_DB_URI);
    await User.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    clientApiUrl = `http://127.0.0.1:${port}/api`;
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await closeDB();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  let savedCookie = null;

  it('1. registerUser: registers personal email and receives safe user + cookie', async () => {
    const res = await fetch(`${clientApiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        name: 'Samantha Morgan',
        email: 'samantha@gmail.com',
        password: 'ValidPassword123!',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.name, 'Samantha Morgan');
    assert.equal(data.user.email, 'samantha@gmail.com');
    assert.equal(data.user.passwordHash, undefined);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes('skillsync_token'));
    savedCookie = setCookie.split(';')[0];
  });

  it('2. getCurrentUser (session restore): restores session using cookie', async () => {
    const res = await fetch(`${clientApiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: savedCookie,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.name, 'Samantha Morgan');
    assert.equal(data.user.email, 'samantha@gmail.com');
  });

  it('3. duplicate registration: returns HTTP 409 and user-friendly error', async () => {
    const res = await fetch(`${clientApiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        name: 'Another Samantha',
        email: 'samantha@gmail.com',
        password: 'Password999!',
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.error, 'An account with this email address already exists');
  });

  it('4. loginUser: fails with wrong credentials', async () => {
    const res = await fetch(`${clientApiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        email: 'samantha@gmail.com',
        password: 'WrongPassword!',
      }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'Invalid email or password');
  });

  it('5. loginUser: succeeds with correct credentials and returns new cookie', async () => {
    const res = await fetch(`${clientApiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        email: 'samantha@gmail.com',
        password: 'ValidPassword123!',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.user);
    assert.equal(data.user.name, 'Samantha Morgan');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    savedCookie = setCookie.split(';')[0];
  });

  it('6. logoutUser: clears cookie and invalidates session token', async () => {
    const res = await fetch(`${clientApiUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: savedCookie,
        Origin: 'http://localhost:5173',
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Successfully logged out');

    // Subsequent /me call with old cookie must fail (401)
    const meRes = await fetch(`${clientApiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: savedCookie,
      },
    });
    assert.equal(meRes.status, 401);
  });
});

