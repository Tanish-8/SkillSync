import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import StudentProfile from '../../src/models/StudentProfile.js';
import { connectDB, closeDB } from '../../src/config/db.js';
import { AUTH_COOKIE_NAME } from '../../src/utils/token.js';

describe('SkillSync StudentProfile API - Integration Tests', () => {
  let server;
  let baseUrl;
  let userACookie;
  let userBCookie;
  let userAId;
  let userBId;
  const TEST_DB_URI = process.env.MONGODB_URI_PROFILE_TEST || 'mongodb://127.0.0.1:27017/skillsync_profile_test';

  before(async () => {
    // 1. Set required test environment variables
    process.env.JWT_SECRET = 'profile-api-test-secret-key-32-chars-minimum-safe';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';

    // 2. Connect to local test database
    await connectDB(TEST_DB_URI);

    // 3. Clear existing test data
    await User.deleteMany({});
    await StudentProfile.deleteMany({});

    // 4. Start HTTP server on an ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    // 5. Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Alpha',
        email: 'alpha@university.edu',
        password: 'PasswordAlpha2026!',
      }),
    });
    assert.equal(resA.status, 201);
    const dataA = await resA.json();
    userAId = dataA.user.id;
    userACookie = resA.headers.get('set-cookie').split(';')[0];

    // 6. Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Beta',
        email: 'beta@university.edu',
        password: 'PasswordBeta2026!',
      }),
    });
    assert.equal(resB.status, 201);
    const dataB = await resB.json();
    userBId = dataB.user.id;
    userBCookie = resB.headers.get('set-cookie').split(';')[0];
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await StudentProfile.deleteMany({});
      await closeDB();
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================================================
  // 1. Unauthenticated Access
  // ==========================================================================
  describe('1. Unauthenticated Access Protection', () => {
    it('rejects GET /api/profile/me without cookie with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects PUT /api/profile/me without cookie with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'Hacker bio' }),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects GET /api/profile/me with tampered cookie with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=invalid.jwt.token` },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Session expired or invalid');
    });
  });

  // ==========================================================================
  // 2. Profile Creation and Retrieval
  // ==========================================================================
  describe('2. Creating and Retrieving Profiles', () => {
    it('returns HTTP 404 when user has not yet created a profile', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        headers: { Cookie: userACookie },
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'Profile not found');
    });

    it('creates a new profile via PUT /api/profile/me with HTTP 201', async () => {
      const payload = {
        bio: 'Computer science major interested in web apps and machine learning.',
        skills: [
          { name: 'React', level: 4 },
          { name: 'Node.js', level: 3 },
        ],
        timeSlots: ['mon_morning', 'tue_evening'],
        goals: ['portfolio', 'hackathon'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
        courseCode: 'CS101',
        topics: ['algorithms', 'data_structures'],
        learningPreferences: ['problem_solving', 'discussion'],
        desiredSkills: [{ name: 'Python', targetLevel: 4 }],
        weeklyHours: 5,
      };

      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();

      assert.ok(data.profile);
      assert.equal(data.profile.userId, userAId);
      assert.equal(data.profile.bio, payload.bio);
      assert.equal(data.profile.workingStyle, 'synchronous');
      assert.equal(data.profile.weeklyHours, 5);
      assert.equal(data.profile.skills.length, 2);
      assert.equal(data.profile.skills[0].name, 'React');
      assert.equal(data.profile.skills[0].level, 4);

      // Verify completeness reporting
      assert.ok(data.completeness);
      assert.equal(data.completeness.project.isComplete, true);
      assert.equal(data.completeness.study.isComplete, true);
      assert.equal(data.completeness.skillswap.isComplete, true);

      // Verify secrets never leaked
      assert.equal(data.profile.passwordHash, undefined);
      assert.equal(data.profile.tokenVersion, undefined);
    });

    it('retrieves the existing profile via GET /api/profile/me with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        headers: { Cookie: userACookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.profile);
      assert.equal(data.profile.userId, userAId);
      assert.equal(data.profile.skills.length, 2);
      assert.equal(data.profile.courseCode, 'CS101');
      assert.ok(data.completeness);
      assert.equal(data.completeness.project.isComplete, true);
    });
  });

  // ==========================================================================
  // 3. Updating Without Duplicate Records
  // ==========================================================================
  describe('3. Updating Profile Without Creating Duplicate Records', () => {
    it('updates existing profile via PUT /api/profile/me with HTTP 200 and preserves uniqueness', async () => {
      const updatePayload = {
        bio: 'Updated bio: specializing in full-stack architecture.',
        weeklyHours: 10,
        workingStyle: 'mixed',
      };

      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify(updatePayload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.profile.bio, updatePayload.bio);
      assert.equal(data.profile.weeklyHours, 10);
      assert.equal(data.profile.workingStyle, 'mixed');
      // Skills from previous PUT remain intact
      assert.equal(data.profile.skills.length, 2);

      // Verify database uniqueness
      const count = await StudentProfile.countDocuments({ userId: userAId });
      assert.equal(count, 1, 'Must maintain exactly one profile per user in MongoDB');
    });
  });

  // ==========================================================================
  // 4. Security: Ownership & Boundary Enforcement
  // ==========================================================================
  describe('4. Ownership and Privilege Boundary Enforcement', () => {
    it('rejects client attempts to supply or overwrite userId with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify({
          userId: userBId, // attempting to overwrite ownership
          bio: 'Malicious update',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Unexpected property'));
      assert.ok(data.error.includes('userId'));
    });

    it('rejects unexpected non-profile properties with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify({
          role: 'admin',
          isSuperuser: true,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Unexpected property'));
    });

    it('ensures User A cannot view or modify User B profile data', async () => {
      // User B creates their own profile
      const resB = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userBCookie,
        },
        body: JSON.stringify({
          bio: 'Beta bio exclusively',
          courseCode: 'PHYS201',
        }),
      });
      assert.equal(resB.status, 201);

      // User A fetches /me and gets User A data, never User B data
      const resFetchA = await fetch(`${baseUrl}/api/profile/me`, {
        headers: { Cookie: userACookie },
      });
      const dataA = await resFetchA.json();
      assert.equal(dataA.profile.userId, userAId);
      assert.equal(dataA.profile.courseCode, 'CS101');

      // User B fetches /me and gets User B data
      const resFetchB = await fetch(`${baseUrl}/api/profile/me`, {
        headers: { Cookie: userBCookie },
      });
      const dataB = await resFetchB.json();
      assert.equal(dataB.profile.userId, userBId);
      assert.equal(dataB.profile.bio, 'Beta bio exclusively');
      assert.equal(dataB.profile.courseCode, 'PHYS201');
    });
  });

  // ==========================================================================
  // 5. Validation and Edge Cases
  // ==========================================================================
  describe('5. Input Validation and Edge Cases', () => {
    it('rejects skill levels outside 1-5 integer range with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          skills: [{ name: 'Rust', level: 6 }], // invalid 6
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('integer level between 1 and 5'));
    });

    it('rejects skills with empty names with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          skills: [{ name: '   ', level: 3 }],
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('non-empty name'));
    });

    it('rejects invalid working style with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          workingStyle: 'telepathic', // invalid
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('workingStyle must be one of'));
    });

    it('rejects weekly hours outside the 0.5 to 168 range (e.g. -5, 0, 0.25, 169) with HTTP 400', async () => {
      const invalidHours = [-5, 0, 0.25, 169];
      for (const hours of invalidHours) {
        const res = await fetch(`${baseUrl}/api/profile/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: userACookie },
          body: JSON.stringify({ weeklyHours: hours }),
        });

        assert.equal(res.status, 400, `Expected 400 for weeklyHours: ${hours}`);
        const data = await res.json();
        assert.ok(
          data.error.includes('between 0.5 and 168'),
          `Error for ${hours} should mention range 0.5 and 168: "${data.error}"`
        );
      }
    });

    it('accepts valid weekly-hour boundary and intermediate values (0.5, 10, 168) with HTTP 200', async () => {
      const validHours = [0.5, 10, 168];
      for (const hours of validHours) {
        const res = await fetch(`${baseUrl}/api/profile/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: userACookie },
          body: JSON.stringify({ weeklyHours: hours }),
        });

        assert.equal(res.status, 200, `Expected 200 for weeklyHours: ${hours}`);
        const data = await res.json();
        assert.equal(data.profile.weeklyHours, hours);
      }
    });

    it('accepts valid desired skills using canonical targetLevel with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          desiredSkills: [
            { name: 'Python', targetLevel: 4 },
            { name: 'Go', targetLevel: 3 },
          ],
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.profile.desiredSkills, [
        { name: 'Python', targetLevel: 4 },
        { name: 'Go', targetLevel: 3 },
      ]);
    });

    it('rejects alias-only desired skill objects (minLevel/level) with HTTP 400', async () => {
      // 1. Rejected alias minLevel
      const resMinLevel = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          desiredSkills: [{ name: 'Python', minLevel: 4 }],
        }),
      });
      assert.equal(resMinLevel.status, 400);
      const dataMinLevel = await resMinLevel.json();
      assert.ok(dataMinLevel.error.includes('Unexpected property in desired skill object: minLevel'));

      // 2. Rejected alias level
      const resLevel = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          desiredSkills: [{ name: 'Python', level: 4 }],
        }),
      });
      assert.equal(resLevel.status, 400);
      const dataLevel = await resLevel.json();
      assert.ok(dataLevel.error.includes('Unexpected property in desired skill object: level'));
    });

    it('rejects desired skills missing targetLevel with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          desiredSkills: [{ name: 'Python' }],
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('targetLevel between 1 and 5'));
    });

    it('rejects unexpected properties inside skill objects with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          skills: [{ name: 'React', level: 4, certified: true }],
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Unexpected property in skill object: certified'));
    });

    it('rejects unexpected properties inside desired skill objects with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          desiredSkills: [{ name: 'Python', targetLevel: 4, priority: 'urgent' }],
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Unexpected property in desired skill object: priority'));
    });

    it('rejects bio exceeding 500 characters with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          bio: 'A'.repeat(501),
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('cannot exceed 500 characters'));
    });

    it('stores explicitly empty arrays as [] and preserves incomplete status', async () => {
      // User B clears skills to []
      const res = await fetch(`${baseUrl}/api/profile/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
        body: JSON.stringify({
          skills: [],
          timeSlots: [],
          goals: [],
          timeline: 'flexible',
          workingStyle: 'asynchronous',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.profile.skills, []);
      assert.deepEqual(data.profile.timeSlots, []);
      // Project mode is now complete because all 5 required fields are declared (even if skills is [])
      assert.equal(data.completeness.project.isComplete, true);
    });

    it('enforces database-level unique index on userId', async () => {
      // Direct Mongoose insert of duplicate userId throws duplicate key error
      await assert.rejects(
        async () => {
          await StudentProfile.create({
            userId: userAId,
            bio: 'Duplicate test',
          });
        },
        (err) => {
          assert.equal(err.code, 11000);
          return true;
        }
      );
    });
  });
});
