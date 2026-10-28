import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import StudentProfile from '../../src/models/StudentProfile.js';
import Project from '../../src/models/Project.js';
import CollaborationRequest from '../../src/models/CollaborationRequest.js';
import { connectDB, closeDB } from '../../src/config/db.js';

describe('SkillSync Collaboration Requests API - Integration Tests (Phase 7)', () => {
  let server;
  let baseUrl;
  let aliceCookie, bobCookie, charlieCookie, dianaCookie;
  let aliceId, bobId, charlieId, dianaId;
  let bobProjectId, closedProjectId;

  const TEST_DB_URI =
    process.env.MONGODB_URI_COLLAB_TEST ||
    'mongodb://127.0.0.1:27017/skillsync_collab_req_test';

  before(async () => {
    process.env.JWT_SECRET = 'collab-requests-test-secret-key-32-chars';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';

    await connectDB(TEST_DB_URI);

    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await Project.deleteMany({});
    await CollaborationRequest.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;

    // 1. Register Alice (Requester)
    const regAlice = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Cooper',
        email: 'alice.cooper@university.edu',
        password: 'Password123!',
      }),
    });
    const dAlice = await regAlice.json();
    aliceId = dAlice.user.id;
    aliceCookie = regAlice.headers.get('set-cookie').split(';')[0];

    // 2. Register Bob (Project owner & partner)
    const regBob = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Marley',
        email: 'bob.marley@university.edu',
        password: 'Password123!',
      }),
    });
    const dBob = await regBob.json();
    bobId = dBob.user.id;
    bobCookie = regBob.headers.get('set-cookie').split(';')[0];

    // 3. Register Charlie (Non-reciprocal student)
    const regCharlie = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie Brown',
        email: 'charlie.brown@university.edu',
        password: 'Password123!',
      }),
    });
    const dCharlie = await regCharlie.json();
    charlieId = dCharlie.user.id;
    charlieCookie = regCharlie.headers.get('set-cookie').split(';')[0];

    // 4. Register Diana (Incomplete profile)
    const regDiana = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Diana Prince',
        email: 'diana.prince@university.edu',
        password: 'Password123!',
      }),
    });
    const dDiana = await regDiana.json();
    dianaId = dDiana.user.id;
    dianaCookie = regDiana.headers.get('set-cookie').split(';')[0];

    // Alice's complete profile
    await StudentProfile.create({
      userId: aliceId,
      bio: 'Alice full stack developer',
      skills: [
        { name: 'React', level: 4 },
        { name: 'JavaScript', level: 4 },
      ],
      desiredSkills: [{ name: 'Python', targetLevel: 4 }],
      timeSlots: ['mon_morning', 'wed_afternoon'],
      goals: ['portfolio', 'networking'],
      timeline: '3 months',
      workingStyle: 'synchronous',
      courseCode: 'CS101',
      topics: ['Algorithms', 'Data Structures'],
      learningPreferences: ['problem_solving', 'discussion'],
      weeklyHours: 10,
      academicBackground: {
        degree: 'B.Tech',
        branch: 'Computer Science',
        yearOfStudy: 3,
        semester: 5,
        relevantSubjects: ['Algorithms'],
      },
      academicPerformance: { scale: 'gpa_4', score: 3.8 },
      learningStyle: 'hands_on',
    });

    // Bob's complete profile (reciprocal with Alice)
    await StudentProfile.create({
      userId: bobId,
      bio: 'Bob AI engineer',
      skills: [
        { name: 'Python', level: 4 },
        { name: 'PyTorch', level: 3 },
      ],
      desiredSkills: [{ name: 'React', targetLevel: 3 }],
      timeSlots: ['mon_morning', 'fri_afternoon'],
      goals: ['portfolio', 'competition'],
      timeline: '3 months',
      workingStyle: 'synchronous',
      courseCode: 'CS101',
      topics: ['Algorithms', 'Machine Learning'],
      learningPreferences: ['problem_solving'],
      weeklyHours: 12,
      academicBackground: {
        degree: 'B.Tech',
        branch: 'AI and Robotics',
        yearOfStudy: 3,
        semester: 5,
        relevantSubjects: ['Algorithms'],
      },
      academicPerformance: { scale: 'gpa_4', score: 3.9 },
      learningStyle: 'hands_on',
    });

    // Charlie's profile (non-reciprocal with Alice)
    await StudentProfile.create({
      userId: charlieId,
      bio: 'Charlie Systems programmer',
      skills: [{ name: 'Rust', level: 4 }],
      desiredSkills: [{ name: 'Golang', targetLevel: 4 }],
      timeSlots: ['sun_evening'],
      goals: ['exam_prep'],
      timeline: '6 months',
      workingStyle: 'asynchronous',
      courseCode: 'PHYS201',
      topics: ['Thermodynamics'],
      learningPreferences: ['reading'],
      weeklyHours: 5,
      learningStyle: 'reading',
    });

    // Bob's Open Project
    const bobProject = await Project.create({
      title: 'Distributed Neural Net Training',
      description: 'Building a distributed training pipeline for large student vision models.',
      ownerId: bobId,
      requiredSkills: [{ name: 'React', minLevel: 3 }],
      timeSlots: ['mon_morning', 'wed_afternoon'],
      goals: ['portfolio'],
      timeline: '3 months',
      workingStyle: 'synchronous',
      status: 'open',
    });
    bobProjectId = bobProject._id.toString();

    // Bob's Closed Project
    const closedProject = await Project.create({
      title: 'Archived Vision Project',
      description: 'Historical computer vision benchmark run.',
      ownerId: bobId,
      requiredSkills: [{ name: 'React', minLevel: 2 }],
      timeSlots: ['mon_morning'],
      goals: ['portfolio'],
      timeline: '1 month',
      workingStyle: 'synchronous',
      status: 'closed',
    });
    closedProjectId = closedProject._id.toString();
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await Project.deleteMany({});
    await CollaborationRequest.deleteMany({});
    await closeDB();
  });

  beforeEach(async () => {
    await CollaborationRequest.deleteMany({});
  });

  describe('1. Authentication and Authorization Guardrails', () => {
    it('rejects unauthenticated requests to send collaboration request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /Authentication required/);
    });

    it('rejects unauthenticated requests to view sent requests with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/sent`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated requests to view received requests with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/received`);
      assert.equal(res.status, 401);
    });
  });

  describe('2. POST /api/collaboration-requests — Request Creation & Snapshots', () => {
    it('rejects invalid request body or unknown mode with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({ mode: 'invalid_mode' }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /mode must be one of/);
    });

    it('rejects self-requests for projects with HTTP 400', async () => {
      // Bob requests his own project
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Cannot send a collaboration request to your own project/);
    });

    it('rejects self-requests for study buddies with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'study_buddy',
          recipientId: aliceId,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Cannot send a collaboration request to yourself/);
    });

    it('rejects project requests on a closed project with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: closedProjectId,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Cannot request to collaborate on a closed project/);
    });

    it('creates project collaboration request with server-calculated snapshot', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
          message: 'Hi Bob, I have strong React skills and can contribute to your vision project.',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();

      assert.equal(data.mode, 'project');
      assert.equal(data.status, 'pending');
      assert.equal(data.requesterId, aliceId);
      assert.equal(data.recipientId, bobId);
      assert.equal(data.projectId, bobProjectId);
      assert.equal(data.project.title, 'Distributed Neural Net Training');
      assert.equal(data.requester.name, 'Alice Cooper');
      assert.equal(data.recipient.name, 'Bob Marley');
      assert.ok(data.compatibilitySnapshot);
      assert.equal(data.compatibilitySnapshot.mode, 'project');
      assert.ok(data.compatibilitySnapshot.score >= 0);
      assert.ok(Array.isArray(data.compatibilitySnapshot.factors));
      assert.ok(data.compatibilitySnapshot.factors.length > 0);
      assert.match(data.message, /Hi Bob/);
    });

    it('prevents duplicate active pending requests with HTTP 409 Conflict', async () => {
      // First request
      const first = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });
      assert.equal(first.status, 201);

      // Duplicate attempt
      const second = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });

      assert.equal(second.status, 409);
      const data = await second.json();
      assert.match(data.error, /active pending collaboration request already exists/);
    });

    it('creates study buddy request with server-calculated snapshot', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'study_buddy',
          recipientId: bobId,
          message: 'Would love to study Algorithms and CS101 together!',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.mode, 'study_buddy');
      assert.equal(data.status, 'pending');
      assert.equal(data.requesterId, aliceId);
      assert.equal(data.recipientId, bobId);
      assert.ok(data.compatibilitySnapshot);
      assert.equal(data.compatibilitySnapshot.mode, 'study_buddy');
      assert.ok(data.compatibilitySnapshot.score > 0);
    });

    it('rejects SkillSwap request when there is no bilateral reciprocity with HTTP 400', async () => {
      // Alice tries to send SkillSwap request to Charlie (no overlap in wanted/offered skills)
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'skillswap',
          recipientId: charlieId,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /reciprocal skill exchange is not mutually compatible/);
    });

    it('creates SkillSwap request when bilateral reciprocity is satisfied', async () => {
      // Alice has React (wants Python), Bob has Python (wants React)
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'skillswap',
          recipientId: bobId,
          message: 'I can teach React if you can help me learn Python!',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.mode, 'skillswap');
      assert.equal(data.status, 'pending');
      assert.ok(data.compatibilitySnapshot);
      assert.equal(data.compatibilitySnapshot.mode, 'skillswap');
      assert.ok(data.compatibilitySnapshot.score > 0);
    });

    it('rejects sending requests when caller profile is incomplete with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: dianaCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /profile is incomplete/);
    });
  });

  describe('3. GET /api/collaboration-requests/sent & /received', () => {
    let reqProject, reqStudy;

    beforeEach(async () => {
      // Alice sends project request to Bob
      const r1 = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
          message: 'Project request note',
        }),
      });
      reqProject = await r1.json();

      // Alice sends study buddy request to Bob
      const r2 = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'study_buddy',
          recipientId: bobId,
          message: 'Study request note',
        }),
      });
      reqStudy = await r2.json();
    });

    it('Alice views sent requests with pagination', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/sent?page=1&limit=10`, {
        headers: { Cookie: aliceCookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.pagination.totalRequests, 2);
      assert.equal(data.requests.length, 2);
      assert.equal(data.requests[0].recipient.name, 'Bob Marley');
    });

    it('Bob views received requests with pagination', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/received?page=1&limit=10`, {
        headers: { Cookie: bobCookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.pagination.totalRequests, 2);
      assert.equal(data.requests.length, 2);
      assert.equal(data.requests[0].requester.name, 'Alice Cooper');
    });

    it('filters requests by status', async () => {
      // Filter by accepted (none yet)
      const res = await fetch(`${baseUrl}/api/collaboration-requests/sent?status=accepted`, {
        headers: { Cookie: aliceCookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.requests.length, 0);

      // Rejects invalid status filter
      const resInvalid = await fetch(`${baseUrl}/api/collaboration-requests/sent?status=random`, {
        headers: { Cookie: aliceCookie },
      });
      assert.equal(resInvalid.status, 400);
    });
  });

  describe('4. GET /api/collaboration-requests/:id', () => {
    let requestId;

    beforeEach(async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });
      const data = await res.json();
      requestId = data.id;
    });

    it('allows requester to retrieve the request', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}`, {
        headers: { Cookie: aliceCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, requestId);
    });

    it('allows recipient to retrieve the request', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}`, {
        headers: { Cookie: bobCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, requestId);
    });

    it('forbids unrelated third-party student with HTTP 403', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}`, {
        headers: { Cookie: charlieCookie },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /not authorized to view/);
    });
  });

  describe('5. PATCH /api/collaboration-requests/:id/respond — Accept & Reject', () => {
    let requestId;

    beforeEach(async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });
      const data = await res.json();
      requestId = data.id;
    });

    it('forbids requester from responding with HTTP 403', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Only the recipient can respond/);
    });

    it('allows recipient to accept request', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'accepted');
    });

    it('allows recipient to reject request', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({ action: 'reject' }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'rejected');
    });

    it('rejects responding to an already responded request with HTTP 409', async () => {
      // First accept
      await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      // Second attempt
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({ action: 'reject' }),
      });

      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.error, /Cannot respond to a collaboration request that is already accepted/);
    });

    it('re-verifies project availability on accept and rejects if project closed with HTTP 400', async () => {
      // Close project before Bob accepts
      await Project.findByIdAndUpdate(bobProjectId, { status: 'closed' });

      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /the project is closed or no longer available/);

      // Re-open for next tests
      await Project.findByIdAndUpdate(bobProjectId, { status: 'open' });
    });
  });

  describe('6. PATCH /api/collaboration-requests/:id/cancel', () => {
    let requestId;

    beforeEach(async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify({
          mode: 'project',
          projectId: bobProjectId,
        }),
      });
      const data = await res.json();
      requestId = data.id;
    });

    it('forbids recipient from cancelling with HTTP 403', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: bobCookie },
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Only the requester can cancel/);
    });

    it('allows requester to cancel pending request', async () => {
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: aliceCookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'cancelled');
    });

    it('rejects cancelling an already accepted request with HTTP 409', async () => {
      // Bob accepts
      await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      // Alice tries to cancel
      const res = await fetch(`${baseUrl}/api/collaboration-requests/${requestId}/cancel`, {
        method: 'PATCH',
        headers: { Cookie: aliceCookie },
      });

      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.error, /Cannot cancel a collaboration request that is already accepted/);
    });
  });
});
