import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import { connectDB, closeDB } from '../../src/config/db.js';
import { AUTH_COOKIE_NAME } from '../../src/utils/token.js';

describe('SkillSync Matching API - Integration Tests', () => {
  let server;
  let baseUrl;
  let authCookie;
  const TEST_DB_URI = process.env.MONGODB_URI_MATCHING_TEST || 'mongodb://127.0.0.1:27017/skillsync_matching_test';

  before(async () => {
    // 1. Set required test environment variables
    process.env.JWT_SECRET = 'matching-api-test-secret-key-32-chars-minimum';
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

    // 5. Register a test user to obtain a valid session cookie
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Matching Tester',
        email: 'matching.tester@university.edu',
        password: 'ValidSecurePass2026!',
      }),
    });

    assert.equal(registerRes.status, 201);
    const rawCookie = registerRes.headers.get('set-cookie');
    assert.ok(rawCookie);
    authCookie = rawCookie.split(';')[0];
    assert.ok(authCookie.startsWith(`${AUTH_COOKIE_NAME}=`));
  });

  after(async () => {
    // Clean up test data and connections
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await closeDB();
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================================================
  // 1. Authentication Protection Tests
  // ==========================================================================
  describe('1. Authentication Protection', () => {
    it('rejects unauthenticated requests to project matching with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: {}, student: {} }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects unauthenticated requests to study matching with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/study`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentA: {}, studentB: {} }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects unauthenticated requests to skillswap matching with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/skillswap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentA: {}, studentB: {} }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects requests with an invalid/tampered cookie with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${AUTH_COOKIE_NAME}=tampered.token.value`,
        },
        body: JSON.stringify({ project: {}, student: {} }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Session expired or invalid');
    });
  });

  // ==========================================================================
  // 2. Documented Example Payloads & Valid Calculations (Phase 5D Aligned)
  // ==========================================================================
  describe('2. Documented Example Computations (Phase 5D 6-Factor & 5-Factor Models)', () => {
    it('computes Project Compatibility example returning score 72 across 6 factors', async () => {
      const payload = {
        project: {
          requiredSkills: [
            { name: 'React', minLevel: 4 },
            { name: 'Node.js', minLevel: 3 },
          ],
          timeSlots: ['mon_morning', 'tue_evening'],
          goals: ['portfolio', 'hackathon'],
          timeline: 'short_term',
          learningStyle: 'hands_on',
        },
        student: {
          skills: [
            { name: 'React', level: 2 },
            { name: 'Node.js', level: 4 },
          ],
          timeSlots: ['mon_morning'],
          goals: ['portfolio'],
          timeline: 'short_term',
          learningStyle: 'hands_on',
          academicBackground: {
            degree: 'B.Tech',
            branch: 'Computer Science',
            relevantSubjects: ['Web Engineering'],
          },
          previousProjects: [
            {
              title: 'API Server',
              skills: ['Node.js'],
            },
          ],
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'calculated');
      assert.equal(data.factors.length, 6);
      assert.equal(data.score, 72);

      const skills = data.factors.find((f) => f.name === 'skills_alignment');
      const goals = data.factors.find((f) => f.name === 'goals_alignment');
      const exp = data.factors.find((f) => f.name === 'project_experience');
      const acad = data.factors.find((f) => f.name === 'academic_relevance');
      const avail = data.factors.find((f) => f.name === 'availability_compatibility');
      const learn = data.factors.find((f) => f.name === 'learning_style_compatibility');

      assert.equal(skills.weight, 30);
      assert.equal(skills.score, 75);

      assert.equal(goals.weight, 20);
      assert.equal(goals.score, 70);

      assert.equal(exp.weight, 15);
      assert.equal(exp.score, 55);

      assert.equal(acad.weight, 15);
      assert.equal(acad.score, 80);

      assert.equal(avail.weight, 10);
      assert.equal(avail.score, 50);

      assert.equal(learn.weight, 10);
      assert.equal(learn.score, 100);

      // Verify total factor weights sum to 100
      const totalWeight = data.factors.reduce((sum, f) => sum + f.weight, 0);
      assert.equal(totalWeight, 100);

      assert.ok(Array.isArray(data.reasons));
      assert.ok(data.reasons.length >= 3);
      assert.ok(data.reasons[0].includes('React (level 2/4)'));
    });

    it('computes Study Compatibility example across 5 factors totaling 100% weight', async () => {
      const payload = {
        studentA: {
          courseCode: 'CS101',
          topics: ['data_structures', 'algorithms'],
          timeSlots: ['mon_morning', 'thu_afternoon'],
          learningPreferences: ['problem_solving', 'discussion'],
          learningStyle: 'discussion',
          academicBackground: { yearOfStudy: 2 },
          goals: ['exam_prep'],
        },
        studentB: {
          courseCode: 'cs101',
          topics: ['algorithms', 'web_dev'],
          timeSlots: ['mon_morning', 'fri_evening'],
          learningPreferences: ['problem_solving'],
          learningStyle: 'discussion',
          academicBackground: { yearOfStudy: 2 },
          goals: ['exam_prep'],
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'calculated');
      assert.equal(data.factors.length, 5);

      const courseSubject = data.factors.find((f) => f.name === 'subject_course_overlap');
      const learnStyle = data.factors.find((f) => f.name === 'learning_style_compatibility');
      const schedule = data.factors.find((f) => f.name === 'shared_schedule');
      const acadLevel = data.factors.find((f) => f.name === 'academic_level_compatibility');
      const goals = data.factors.find((f) => f.name === 'goals_alignment');

      assert.equal(courseSubject.weight, 30);
      assert.equal(courseSubject.score, 80);

      assert.equal(learnStyle.weight, 25);
      assert.equal(learnStyle.score, 85);

      assert.equal(schedule.weight, 20);
      assert.equal(schedule.score, 33);

      assert.equal(acadLevel.weight, 15);
      assert.equal(acadLevel.score, 100);

      assert.equal(goals.weight, 10);
      assert.equal(goals.score, 100);

      const totalWeight = data.factors.reduce((sum, f) => sum + f.weight, 0);
      assert.equal(totalWeight, 100);

      assert.ok(Array.isArray(data.reasons));
      assert.ok(data.reasons[0].includes('CS101'));
      assert.ok(data.reasons[0].includes('algorithms'));
    });

    it('computes SkillSwap Compatibility example across 5 factors with strict reciprocity', async () => {
      const payload = {
        studentA: {
          offeredSkills: [{ name: 'Python', level: 4 }],
          desiredSkills: [{ name: 'Figma', targetLevel: 3 }],
          timeSlots: ['mon_morning', 'wed_evening'],
          weeklyHours: 4,
          learningStyle: 'hands_on',
          goals: ['portfolio'],
        },
        studentB: {
          offeredSkills: [{ name: 'Figma', level: 4 }],
          desiredSkills: [{ name: 'Python', targetLevel: 4 }],
          timeSlots: ['mon_morning', 'fri_afternoon'],
          weeklyHours: 6,
          learningStyle: 'hands_on',
          goals: ['portfolio'],
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/skillswap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'calculated');
      assert.equal(data.factors.length, 5);

      const reciprocal = data.factors.find((f) => f.name === 'reciprocal_teach_want');
      const skillLevel = data.factors.find((f) => f.name === 'skill_level_compatibility');
      const goals = data.factors.find((f) => f.name === 'goals_alignment');
      const avail = data.factors.find((f) => f.name === 'availability_compatibility');
      const learn = data.factors.find((f) => f.name === 'learning_style_compatibility');

      assert.equal(reciprocal.weight, 40);
      assert.equal(reciprocal.score, 100);

      assert.equal(skillLevel.weight, 20);
      assert.equal(skillLevel.score, 100);

      assert.equal(goals.weight, 15);
      assert.equal(goals.score, 100);

      assert.equal(avail.weight, 15);
      assert.equal(avail.score, 43);

      assert.equal(learn.weight, 10);
      assert.equal(learn.score, 100);

      const totalWeight = data.factors.reduce((sum, f) => sum + f.weight, 0);
      assert.equal(totalWeight, 100);

      assert.ok(Array.isArray(data.reasons));
      assert.ok(data.reasons[0].includes('Mutual skill exchange'));
    });
  });

  // ==========================================================================
  // 3. Request Envelope Validation (HTTP 400)
  // ==========================================================================
  describe('3. Request Envelope Validation', () => {
    it('returns HTTP 400 when project matching request body is missing student', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ project: {} }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('"project" and "student"'));
    });

    it('returns HTTP 400 when project matching request body is missing project', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ student: {} }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('"project" and "student"'));
    });

    it('returns HTTP 400 when top-level property is an array or primitive', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ project: 'not-an-object', student: {} }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('"project" and "student"'));
    });

    it('returns HTTP 400 when study matching is missing studentB', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/study`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ studentA: {} }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('"studentA" and "studentB"'));
    });

    it('returns HTTP 400 when skillswap matching is missing studentA', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/skillswap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({ studentB: {} }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('"studentA" and "studentB"'));
    });

    it('returns HTTP 400 for malformed JSON request bodies', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: '{ "project": invalid_json_syntax',
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Malformed JSON payload'));
    });
  });

  // ==========================================================================
  // 4. Insufficient Data Preservation
  // ==========================================================================
  describe('4. Insufficient Compatibility Data Contract', () => {
    it('preserves insufficient_data status and null score for incomplete project data', async () => {
      const payload = {
        project: {
          requiredSkills: [],
          timeSlots: [],
          goals: [],
          // missing timeline
          workingStyle: 'synchronous',
        },
        student: {
          skills: [],
          timeSlots: [],
          goals: [],
          timeline: 'short_term',
          workingStyle: 'synchronous',
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'insufficient_data');
      assert.equal(data.score, null);
      assert.deepEqual(data.factors, []);
      assert.ok(data.reasons.some((r) => r.includes('project.timeline')));
    });

    it('preserves insufficient_data status for missing courseCode in study preview', async () => {
      const payload = {
        studentA: {
          courseCode: '', // empty
          topics: [],
          timeSlots: [],
          learningPreferences: [],
        },
        studentB: {
          courseCode: 'CS101',
          topics: [],
          timeSlots: [],
          learningPreferences: [],
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/study`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'insufficient_data');
      assert.equal(data.score, null);
      assert.ok(data.reasons.some((r) => r.includes('courseCode')));
    });

    it('preserves insufficient_data status for missing weeklyHours in skillswap preview', async () => {
      const payload = {
        studentA: {
          offeredSkills: [],
          desiredSkills: [],
          timeSlots: [],
          // missing weeklyHours
        },
        studentB: {
          offeredSkills: [],
          desiredSkills: [],
          timeSlots: [],
          weeklyHours: 5,
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/skillswap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'insufficient_data');
      assert.equal(data.score, null);
      assert.ok(data.reasons.some((r) => r.includes('weeklyHours')));
    });
  });

  // ==========================================================================
  // 5. Empty-List Behavior & Strict Reciprocity via API
  // ==========================================================================
  describe('5. Empty-List Scoring Integrity and Strict Reciprocity via API', () => {
    it('does not award artificial 100 scores when project requiredSkills or timeSlots are empty', async () => {
      const payload = {
        project: {
          requiredSkills: [],
          timeSlots: [],
          goals: ['app'],
          timeline: 'short_term',
          workingStyle: 'synchronous',
        },
        student: {
          skills: [{ name: 'React', level: 4 }],
          timeSlots: ['mon_morning'],
          goals: ['app'],
          timeline: 'short_term',
          workingStyle: 'synchronous',
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'calculated');

      const skillsFactor = data.factors.find((f) => f.name === 'skills_alignment');
      const availFactor = data.factors.find((f) => f.name === 'availability_compatibility');

      assert.equal(skillsFactor.score, 0);
      assert.equal(availFactor.score, 0);
    });

    it('returns score 0 for reciprocal skills when desiredSkills are empty in both directions', async () => {
      const payload = {
        studentA: {
          offeredSkills: [{ name: 'Python', level: 4 }],
          desiredSkills: [],
          timeSlots: ['mon_morning'],
          weeklyHours: 5,
        },
        studentB: {
          offeredSkills: [{ name: 'React', level: 4 }],
          desiredSkills: [],
          timeSlots: ['mon_morning'],
          weeklyHours: 5,
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/skillswap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'calculated');
      const reciprocal = data.factors.find((f) => f.name === 'reciprocal_teach_want');
      const skillLevel = data.factors.find((f) => f.name === 'skill_level_compatibility');

      assert.equal(reciprocal.score, 0);
      assert.equal(skillLevel.score, 0);
    });

    it('scores 0 for reciprocal factor on a one-way skill match', async () => {
      // Student A desires what B offers, but Student B does NOT desire what A offers
      const payload = {
        studentA: {
          offeredSkills: [{ name: 'Rust', level: 4 }],
          desiredSkills: [{ name: 'React', targetLevel: 3 }],
          timeSlots: ['mon_morning'],
          weeklyHours: 5,
        },
        studentB: {
          offeredSkills: [{ name: 'React', level: 4 }],
          desiredSkills: [{ name: 'Go', targetLevel: 3 }], // desires Go, not Rust!
          timeSlots: ['mon_morning'],
          weeklyHours: 5,
        },
      };

      const res = await fetch(`${baseUrl}/api/matching/preview/skillswap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'calculated');

      const reciprocal = data.factors.find((f) => f.name === 'reciprocal_teach_want');
      assert.equal(reciprocal.score, 0);
      assert.ok(data.reasons.some((r) => r.includes('One-way match')));
    });
  });

  // ==========================================================================
  // 6. HTTP Methods & Unknown Routes
  // ==========================================================================
  describe('6. Unsupported HTTP Methods and Unknown Routes', () => {
    it('returns HTTP 404 for GET requests on preview endpoints', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/project`, {
        method: 'GET',
        headers: { Cookie: authCookie },
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'Endpoint not found');
    });

    it('returns HTTP 404 for PUT requests on preview endpoints', async () => {
      const res = await fetch(`${baseUrl}/api/matching/preview/study`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'Endpoint not found');
    });

    it('returns HTTP 404 for unknown endpoints under /api/matching', async () => {
      const res = await fetch(`${baseUrl}/api/matching/nonexistent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'Endpoint not found');
    });
  });
});
