import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import StudentProfile from '../../src/models/StudentProfile.js';
import Project from '../../src/models/Project.js';
import { connectDB, closeDB } from '../../src/config/db.js';

describe('SkillSync Recommendations API - Integration Tests (Phase 6A)', () => {
  let server;
  let baseUrl;
  let user1Cookie, user2Cookie, user3Cookie, incompleteUserCookie;
  let user1Id, user2Id, user3Id, incompleteUserId;

  const TEST_DB_URI =
    process.env.MONGODB_URI_REC_TEST || 'mongodb://127.0.0.1:27017/skillsync_recommendations_test';

  before(async () => {
    process.env.JWT_SECRET = 'recommendations-test-secret-key-32-chars-safe';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';

    await connectDB(TEST_DB_URI);

    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await Project.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    // 1. Register User 1 (Alex: React/TS specialist, wants Python, study CS61A)
    const reg1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Rivera',
        email: 'alex.rivera@university.edu',
        password: 'Password123!',
      }),
    });
    const d1 = await reg1.json();
    user1Id = d1.user.id;
    user1Cookie = reg1.headers.get('set-cookie').split(';')[0];

    // 2. Register User 2 (Jordan: Python/AI specialist, wants React, study CS61A)
    const reg2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Chen',
        email: 'jordan.chen@university.edu',
        password: 'Password123!',
      }),
    });
    const d2 = await reg2.json();
    user2Id = d2.user.id;
    user2Cookie = reg2.headers.get('set-cookie').split(';')[0];

    // 3. Register User 3 (Sam: Java specialist, wants Go, study CS189 - non-reciprocal to Alex)
    const reg3 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sam Taylor',
        email: 'sam.taylor@university.edu',
        password: 'Password123!',
      }),
    });
    const d3 = await reg3.json();
    user3Id = d3.user.id;
    user3Cookie = reg3.headers.get('set-cookie').split(';')[0];

    // 4. Register Incomplete User (No profile)
    const regInc = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Incomplete Student',
        email: 'incomplete@university.edu',
        password: 'Password123!',
      }),
    });
    const dInc = await regInc.json();
    incompleteUserId = dInc.user.id;
    incompleteUserCookie = regInc.headers.get('set-cookie').split(';')[0];

    // Create Complete Profile for User 1 (Alex)
    await StudentProfile.create({
      userId: user1Id,
      bio: 'Frontend enthusiast working on developer tooling',
      skills: [
        { name: 'React', level: 5 },
        { name: 'TypeScript', level: 4 },
      ],
      desiredSkills: [
        { name: 'Python', targetLevel: 3 },
      ],
      timeSlots: ['mon_morning', 'wed_afternoon', 'sat_morning'],
      goals: ['portfolio', 'hackathon'],
      timeline: 'Spring 2026',
      workingStyle: 'mixed',
      learningStyle: 'hands_on',
      courseCode: 'CS61A',
      topics: ['Recursion', 'Functional Programming', 'Trees'],
      learningPreferences: ['hands_on', 'visual'],
      weeklyHours: 10,
      academicBackground: {
        degree: 'B.S.',
        branch: 'Computer Science',
        yearOfStudy: 2,
        semester: 4,
        relevantSubjects: ['Data Structures', 'Web Development'],
      },
      academicPerformance: {
        scale: 'gpa_4',
        score: 3.85,
      },
      previousProjects: [
        {
          title: 'React Design System',
          skills: ['React', 'TypeScript'],
          domain: 'portfolio',
          role: 'Lead Frontend',
          achievements: '500+ GitHub stars',
        },
      ],
    });

    // Create Complete Profile for User 2 (Jordan: Perfect bilateral match for Alex)
    await StudentProfile.create({
      userId: user2Id,
      bio: 'Data science & ML researcher looking to learn UI development',
      skills: [
        { name: 'Python', level: 5 },
        { name: 'PyTorch', level: 4 },
      ],
      desiredSkills: [
        { name: 'React', targetLevel: 4 },
      ],
      timeSlots: ['mon_morning', 'wed_afternoon', 'sun_evening'],
      goals: ['portfolio', 'research_paper'],
      timeline: 'Spring 2026',
      workingStyle: 'mixed',
      learningStyle: 'hands_on',
      courseCode: 'CS61A',
      topics: ['Recursion', 'Trees', 'Interpreters'],
      learningPreferences: ['hands_on'],
      weeklyHours: 10,
      academicBackground: {
        degree: 'B.S.',
        branch: 'Computer Science',
        yearOfStudy: 2,
        semester: 4,
        relevantSubjects: ['Data Structures', 'Linear Algebra'],
      },
      academicPerformance: {
        scale: 'gpa_4',
        score: 3.9,
      },
    });

    // Create Complete Profile for User 3 (Sam: One-way only with Alex)
    // Offers Java (Alex doesn't desire Java), desires Python (Alex doesn't offer Python)
    await StudentProfile.create({
      userId: user3Id,
      bio: 'Backend systems programmer',
      skills: [
        { name: 'Java', level: 4 },
      ],
      desiredSkills: [
        { name: 'Go', targetLevel: 4 },
      ],
      timeSlots: ['tue_evening', 'thu_evening'],
      goals: ['open_source'],
      timeline: 'Fall 2026',
      workingStyle: 'asynchronous',
      learningStyle: 'reading',
      courseCode: 'CS189',
      topics: ['Neural Networks', 'SVMs'],
      learningPreferences: ['reading'],
      weeklyHours: 8,
    });
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await StudentProfile.deleteMany({});
      await Project.deleteMany({});
      await closeDB();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================================================
  // 1. Authentication Protection
  // ==========================================================================
  describe('1. Authentication Protection', () => {
    it('rejects unauthenticated project recommendations with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/projects`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects unauthenticated study-buddy recommendations with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/study-buddies`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects unauthenticated skillswap recommendations with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/skillswap`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });
  });

  // ==========================================================================
  // 2. Profile Completeness Enforcement
  // ==========================================================================
  describe('2. Incomplete Profile Handling', () => {
    it('returns empty project recommendations with completeness status when profile is missing', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/projects`, {
        headers: { Cookie: incompleteUserCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.recommendations, []);
      assert.equal(data.completeness.isComplete, false);
      assert.ok(data.completeness.missingFields.length > 0);
      assert.equal(data.pagination.totalRecommendations, 0);
    });

    it('returns empty study-buddy recommendations with completeness status when profile is missing', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/study-buddies`, {
        headers: { Cookie: incompleteUserCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.recommendations, []);
      assert.equal(data.completeness.isComplete, false);
      assert.ok(data.completeness.missingFields.length > 0);
    });

    it('returns empty skillswap recommendations with completeness status when profile is missing', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/skillswap`, {
        headers: { Cookie: incompleteUserCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.recommendations, []);
      assert.equal(data.completeness.isComplete, false);
      assert.ok(data.completeness.missingFields.length > 0);
    });
  });

  // ==========================================================================
  // 3. Project Recommendations (/api/matching/recommendations/projects)
  // ==========================================================================
  describe('3. Project Recommendations Engine', () => {
    let openProjId1, openProjId2, closedProjId, user1ProjId;

    before(async () => {
      await Project.deleteMany({});

      // Project 1 by User 2: Strong match for Alex (React/TypeScript, Web Dev)
      const p1 = await Project.create({
        title: 'Fullstack Collaborative Canvas',
        description: 'Building a real-time multiplayer whiteboard application using React and TypeScript.',
        ownerId: user2Id,
        requiredSkills: [
          { name: 'React', minLevel: 4 },
          { name: 'TypeScript', minLevel: 3 },
        ],
        timeSlots: ['mon_morning', 'wed_afternoon'],
        goals: ['portfolio'],
        timeline: 'Spring 2026',
        workingStyle: 'mixed',
        relevantSubjects: ['Web Development'],
        preferredLearningStyle: 'hands_on',
        status: 'open',
      });
      openProjId1 = p1._id.toString();

      // Project 2 by User 3: Low match for Alex (C++, Embedded)
      const p2 = await Project.create({
        title: 'Embedded Firmware RTOS Kernel',
        description: 'Low-level RTOS scheduler in pure C++ and Assembly for ARM Cortex microcontrollers.',
        ownerId: user3Id,
        requiredSkills: [
          { name: 'C++', minLevel: 5 },
          { name: 'Assembly', minLevel: 4 },
        ],
        timeSlots: ['fri_evening', 'sat_evening'],
        goals: ['open_source'],
        timeline: 'Fall 2026',
        workingStyle: 'asynchronous',
        status: 'open',
      });
      openProjId2 = p2._id.toString();

      // Project 3: Closed project (must not be recommended)
      const p3 = await Project.create({
        title: 'Closed Web Project',
        description: 'Previously filled position for web frontend developer with React skills.',
        ownerId: user2Id,
        requiredSkills: [{ name: 'React', minLevel: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['portfolio'],
        timeline: 'Spring 2026',
        workingStyle: 'mixed',
        status: 'closed',
      });
      closedProjId = p3._id.toString();

      // Project 4: Owned by Alex (User 1) - must never recommend own project to self
      const p4 = await Project.create({
        title: 'Alex Self-Owned Project',
        description: 'My own experimental frontend project that I am hosting.',
        ownerId: user1Id,
        requiredSkills: [{ name: 'React', minLevel: 5 }],
        timeSlots: ['mon_morning'],
        goals: ['portfolio'],
        timeline: 'Spring 2026',
        workingStyle: 'mixed',
        status: 'open',
      });
      user1ProjId = p4._id.toString();
    });

    it('returns open project recommendations sorted by descending compatibility score', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/projects`, {
        headers: { Cookie: user1Cookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.completeness.isComplete, true);
      assert.ok(Array.isArray(data.recommendations));
      assert.equal(data.recommendations.length, 2);

      // Verify sorting: Highest score first
      const [topRec, secondRec] = data.recommendations;
      assert.ok(topRec.score > secondRec.score, 'Recommendations must be sorted descending');
      assert.equal(topRec.project.id, openProjId1);
      assert.ok(topRec.score >= 80, 'Top recommendation should have high compatibility');

      // Verify owner metadata is populated without leaking secrets
      assert.equal(topRec.project.owner.name, 'Jordan Chen');
      assert.equal(topRec.project.owner.id, user2Id);
      assert.equal(topRec.project.owner.email, undefined);
      assert.equal(topRec.project.owner.passwordHash, undefined);

      // Verify factors and reasons
      assert.equal(topRec.factors.length, 6);
      assert.ok(topRec.reasons.length >= 3);
      const totalWeight = topRec.factors.reduce((acc, f) => acc + f.weight, 0);
      assert.equal(totalWeight, 100);

      // Verify exclusion of own project and closed project
      const allIds = data.recommendations.map((r) => r.project.id);
      assert.ok(!allIds.includes(closedProjId), 'Closed projects must not be recommended');
      assert.ok(!allIds.includes(user1ProjId), 'Caller own projects must not be recommended');
    });

    it('supports pagination parameters for project recommendations', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/projects?page=1&limit=1`, {
        headers: { Cookie: user1Cookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.recommendations.length, 1);
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.limit, 1);
      assert.equal(data.pagination.totalRecommendations, 2);
      assert.equal(data.pagination.totalPages, 2);
      assert.equal(data.pagination.hasMore, true);
    });

    it('rejects invalid pagination values with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/projects?page=-1`, {
        headers: { Cookie: user1Cookie },
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /page must be a positive integer/);
    });
  });

  // ==========================================================================
  // 4. Study Buddy Recommendations (/api/matching/recommendations/study-buddies)
  // ==========================================================================
  describe('4. Study Buddy Recommendations Engine', () => {
    it('returns ranked study candidates excluding self and incomplete candidates', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/study-buddies`, {
        headers: { Cookie: user1Cookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.completeness.isComplete, true);
      assert.ok(Array.isArray(data.recommendations));
      // User 2 (Jordan: CS61A) and User 3 (Sam: CS189) are candidates; incomplete user is excluded
      assert.equal(data.recommendations.length, 2);

      const [topMatch, secondMatch] = data.recommendations;
      // Jordan is in same course CS61A, same year, shared topics -> significantly higher score than Sam (CS189)
      assert.ok(topMatch.score > secondMatch.score);
      assert.equal(topMatch.student.userId, user2Id);
      assert.equal(topMatch.student.name, 'Jordan Chen');
      assert.equal(topMatch.student.courseCode, 'CS61A');
      assert.deepEqual(topMatch.student.topics, ['Recursion', 'Trees', 'Interpreters']);

      // Grounded explanations
      assert.ok(topMatch.reasons.length >= 3);
      assert.ok(topMatch.reasons.some((r) => r.includes('CS61A')));

      // Security: verify no passwords, emails, or marks are exposed
      assert.equal(topMatch.student.email, undefined);
      assert.equal(topMatch.student.passwordHash, undefined);
      assert.equal(topMatch.student.academicPerformance, undefined);

      // Verify self is never recommended
      const candidateUserIds = data.recommendations.map((r) => r.student.userId);
      assert.ok(!candidateUserIds.includes(user1Id));
      assert.ok(!candidateUserIds.includes(incompleteUserId));
    });

    it('paginates study buddy recommendations accurately', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/study-buddies?page=2&limit=1`, {
        headers: { Cookie: user1Cookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.recommendations.length, 1);
      assert.equal(data.pagination.page, 2);
      assert.equal(data.pagination.hasMore, false);
    });
  });

  // ==========================================================================
  // 5. SkillSwap Recommendations (/api/matching/recommendations/skillswap)
  // ==========================================================================
  describe('5. SkillSwap Recommendations & Strict Bilateral Reciprocity', () => {
    it('returns reciprocal SkillSwap partners and completely excludes one-way matches', async () => {
      const res = await fetch(`${baseUrl}/api/matching/recommendations/skillswap`, {
        headers: { Cookie: user1Cookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.completeness.isComplete, true);
      assert.ok(Array.isArray(data.recommendations));

      // Jordan: Alex offers React (Jordan desires), Jordan offers Python (Alex desires) -> BILATERAL
      // Sam: Alex offers React (Sam desires Go), Sam offers Java (Alex desires Python) -> ONE-WAY / 0 RECIPROCAL -> EXCLUDED!
      assert.equal(data.recommendations.length, 1, 'Only bilateral reciprocal matches should be returned');

      const rec = data.recommendations[0];
      assert.equal(rec.student.userId, user2Id);
      assert.equal(rec.student.name, 'Jordan Chen');
      assert.ok(rec.score >= 70);

      // Reciprocal factor score must be positive
      const recipFactor = rec.factors.find(
        (f) => f.name === 'reciprocal_teach_want' || f.name === 'reciprocal_skills'
      );
      assert.ok(recipFactor);
      assert.ok(recipFactor.score > 0, 'Reciprocal factor score must be > 0');

      // Check safe summary fields
      assert.deepEqual(rec.student.offeredSkills, [
        { name: 'Python', level: 5 },
        { name: 'PyTorch', level: 4 },
      ]);
      assert.deepEqual(rec.student.desiredSkills, [
        { name: 'React', targetLevel: 4 },
      ]);
      assert.equal(rec.student.email, undefined);
      assert.equal(rec.student.passwordHash, undefined);
    });

    it('returns empty array when user has no reciprocal SkillSwap matches in the database', async () => {
      // User 3 (Sam) offers Java and desires Go. Nobody in the pool offers Go while desiring Java.
      const res = await fetch(`${baseUrl}/api/matching/recommendations/skillswap`, {
        headers: { Cookie: user3Cookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.completeness.isComplete, true);
      assert.deepEqual(data.recommendations, []);
      assert.equal(data.pagination.totalRecommendations, 0);
    });
  });
});
