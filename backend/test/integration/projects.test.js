import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Project from '../../src/models/Project.js';
import { connectDB, closeDB } from '../../src/config/db.js';

describe('SkillSync Projects API - Integration Tests', () => {
  let server;
  let baseUrl;
  let userACookie;
  let userBCookie;
  let userAId;
  let userBId;
  const TEST_DB_URI =
    process.env.MONGODB_URI_PROJECTS_TEST || 'mongodb://127.0.0.1:27017/skillsync_projects_test';

  const validProjectPayload = {
    title: 'Distributed Systems Study Platform',
    description:
      'Building an open-source consensus visualization and benchmark suite for distributed algorithms and storage engines.',
    requiredSkills: [
      { name: 'Go', minLevel: 4 },
      { name: 'Docker', minLevel: 3 },
    ],
    timeSlots: ['mon_evening', 'wed_evening', 'sat_morning'],
    goals: ['portfolio', 'research_paper'],
    timeline: 'Spring 2026 semester',
    workingStyle: 'mixed',
    status: 'open',
  };

  before(async () => {
    // 1. Set required test environment variables
    process.env.JWT_SECRET = 'project-api-test-secret-key-32-chars-minimum-safe';
    process.env.JWT_EXPIRES_IN = '30m';
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';

    // 2. Connect to local test database
    await connectDB(TEST_DB_URI);

    // 3. Clear existing test data
    await User.deleteMany({});
    await Project.deleteMany({});

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
        name: 'Project Owner Alpha',
        email: 'alpha_owner@university.edu',
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
        name: 'Project Collaborator Beta',
        email: 'beta_collab@university.edu',
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
      await Project.deleteMany({});
      await closeDB();
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================================================
  // 1. Unauthenticated Access Protection
  // ==========================================================================
  describe('1. Unauthenticated Access Protection', () => {
    it('rejects POST /api/projects without cookie with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validProjectPayload),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects GET /api/projects without cookie with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/projects`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects GET /api/projects/mine without cookie with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/projects/mine`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects GET /api/projects/:id without cookie with HTTP 401', async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/projects/${dummyId}`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects PATCH /api/projects/:id without cookie with HTTP 401', async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/projects/${dummyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Unauthorized update' }),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });

    it('rejects DELETE /api/projects/:id without cookie with HTTP 401', async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/projects/${dummyId}`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required');
    });
  });

  // ==========================================================================
  // 2. Project Creation and Validation
  // ==========================================================================
  describe('2. Project Creation and Validation', () => {
    let createdProjectId;

    it('creates a project with HTTP 201 owned by authenticated User A', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify(validProjectPayload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.project);
      assert.ok(data.project.id);
      assert.equal(data.project.ownerId, userAId);
      assert.equal(data.project.title, validProjectPayload.title);
      assert.equal(data.project.description, validProjectPayload.description);
      assert.equal(data.project.workingStyle, validProjectPayload.workingStyle);
      assert.equal(data.project.status, 'open');
      assert.deepEqual(data.project.requiredSkills, validProjectPayload.requiredSkills);
      assert.deepEqual(data.project.timeSlots, validProjectPayload.timeSlots);
      assert.deepEqual(data.project.goals, validProjectPayload.goals);
      assert.equal(data.project.timeline, validProjectPayload.timeline);
      assert.ok(data.project.createdAt);
      assert.ok(data.project.updatedAt);

      // Verify no sensitive keys leaked
      assert.equal(data.project.password, undefined);
      assert.equal(data.project.__v, undefined);
      assert.equal(data.project._id, undefined);

      createdProjectId = data.project.id;

      // Verify DB persistence
      const dbDoc = await Project.findById(createdProjectId);
      assert.ok(dbDoc);
      assert.equal(dbDoc.ownerId.toString(), userAId);
    });

    it('rejects project creation when client provides ownerId with HTTP 400', async () => {
      const maliciousPayload = {
        ...validProjectPayload,
        ownerId: new mongoose.Types.ObjectId().toString(),
      };

      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify(maliciousPayload),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Unexpected property in request body: ownerId/);
    });

    it('rejects project creation when client provides _id with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify({
          ...validProjectPayload,
          _id: new mongoose.Types.ObjectId().toString(),
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Unexpected property in request body: _id/);
    });

    it('rejects project creation with unexpected fields with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
        },
        body: JSON.stringify({
          ...validProjectPayload,
          role: 'admin',
          extraBonus: true,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Unexpected property in request body/);
    });

    it('rejects project creation missing required fields with HTTP 400', async () => {
      const requiredFields = [
        'title',
        'description',
        'requiredSkills',
        'timeSlots',
        'goals',
        'timeline',
        'workingStyle',
      ];

      for (const field of requiredFields) {
        const payload = { ...validProjectPayload };
        delete payload[field];

        const res = await fetch(`${baseUrl}/api/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userACookie,
          },
          body: JSON.stringify(payload),
        });

        assert.equal(res.status, 400, `Expected 400 when missing ${field}`);
        const data = await res.json();
        assert.match(data.error, new RegExp(`Missing required field: ${field}`));
      }
    });

    it('rejects title shorter than 5 characters or longer than 100 characters with HTTP 400', async () => {
      const resShort = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({ ...validProjectPayload, title: 'Rust' }),
      });
      assert.equal(resShort.status, 400);

      const resLong = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({ ...validProjectPayload, title: 'A'.repeat(101) }),
      });
      assert.equal(resLong.status, 400);
    });

    it('rejects description shorter than 20 characters with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({ ...validProjectPayload, description: 'Too brief text.' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /description must be between 20 and 2000 characters/);
    });

    it('rejects requiredSkills when skill is missing minLevel or has invalid level with HTTP 400', async () => {
      const invalidSkills = [
        [{ name: 'Rust' }], // missing minLevel
        [{ name: 'Rust', minLevel: 0 }], // minLevel < 1
        [{ name: 'Rust', minLevel: 6 }], // minLevel > 5
        [{ name: 'Rust', minLevel: 3.5 }], // float
        [{ name: '', minLevel: 3 }], // empty name
        [{ name: 'Rust', level: 3 }], // alias instead of minLevel
        [{ name: 'Rust', targetLevel: 3 }], // alias instead of minLevel
      ];

      for (const sk of invalidSkills) {
        const res = await fetch(`${baseUrl}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: userACookie },
          body: JSON.stringify({ ...validProjectPayload, requiredSkills: sk }),
        });
        assert.equal(res.status, 400);
      }
    });

    it('rejects requiredSkills with unexpected nested properties with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          ...validProjectPayload,
          requiredSkills: [{ name: 'Rust', minLevel: 4, extraProp: 'hacker' }],
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Unexpected property in required skill: extraProp/);
    });

    it('rejects invalid workingStyle with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({ ...validProjectPayload, workingStyle: 'telepathic' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /workingStyle must be one of: synchronous, asynchronous, mixed/);
    });

    it('rejects invalid status with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({ ...validProjectPayload, status: 'archived' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /status must be one of: open, closed/);
    });
  });

  // ==========================================================================
  // 3. Retrieval by ID
  // ==========================================================================
  describe('3. Project Retrieval by ID', () => {
    let projectId;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          ...validProjectPayload,
          title: 'Algorithmic Trading Bot Project',
        }),
      });
      const data = await res.json();
      projectId = data.project.id;
    });

    it('retrieves project by ID for authenticated User B (collaborator) with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${projectId}`, {
        headers: { Cookie: userBCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.project);
      assert.equal(data.project.id, projectId);
      assert.equal(data.project.title, 'Algorithmic Trading Bot Project');
      assert.equal(data.project.ownerId, userAId);
    });

    it('returns HTTP 400 when project ID is malformed', async () => {
      const res = await fetch(`${baseUrl}/api/projects/not-a-valid-object-id`, {
        headers: { Cookie: userBCookie },
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'Invalid project ID format');
    });

    it('returns HTTP 404 when project ID is valid but nonexistent', async () => {
      const nonexistentId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/projects/${nonexistentId}`, {
        headers: { Cookie: userBCookie },
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'Project not found');
    });
  });

  // ==========================================================================
  // 4. Open-Project Listing and Pagination
  // ==========================================================================
  describe('4. Open-Project Listing and Pagination', () => {
    before(async () => {
      // Clear projects and seed 5 open projects and 2 closed projects
      await Project.deleteMany({});

      for (let i = 1; i <= 5; i++) {
        await fetch(`${baseUrl}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: userACookie },
          body: JSON.stringify({
            ...validProjectPayload,
            title: `Open Project Alpha ${i}`,
            status: 'open',
          }),
        });
      }

      // Create 2 closed projects
      for (let j = 1; j <= 2; j++) {
        await fetch(`${baseUrl}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: userACookie },
          body: JSON.stringify({
            ...validProjectPayload,
            title: `Closed Project Alpha ${j}`,
            status: 'closed',
          }),
        });
      }
    });

    it('lists only open projects sorted newest first with pagination metadata', async () => {
      const res = await fetch(`${baseUrl}/api/projects?page=1&limit=3`, {
        headers: { Cookie: userBCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.projects.length, 3);
      assert.equal(data.pagination.page, 1);
      assert.equal(data.pagination.limit, 3);
      assert.equal(data.pagination.totalProjects, 5); // Excludes the 2 closed projects
      assert.equal(data.pagination.totalPages, 2);
      assert.equal(data.pagination.hasMore, true);

      // Verify all returned projects have status 'open'
      for (const p of data.projects) {
        assert.equal(p.status, 'open');
      }

      // Newest first order
      const date1 = new Date(data.projects[0].createdAt).getTime();
      const date2 = new Date(data.projects[1].createdAt).getTime();
      assert.ok(date1 >= date2);
    });

    it('navigates to page 2 and shows hasMore = false', async () => {
      const res = await fetch(`${baseUrl}/api/projects?page=2&limit=3`, {
        headers: { Cookie: userBCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.projects.length, 2);
      assert.equal(data.pagination.page, 2);
      assert.equal(data.pagination.hasMore, false);
    });

    it('rejects invalid pagination parameters with HTTP 400', async () => {
      const invalidQueries = [
        'page=0',
        'page=-1',
        'page=abc',
        'page=1.5',
        'limit=0',
        'limit=-5',
        'limit=51',
        'limit=xyz',
      ];

      for (const q of invalidQueries) {
        const res = await fetch(`${baseUrl}/api/projects?${q}`, {
          headers: { Cookie: userBCookie },
        });
        assert.equal(res.status, 400, `Expected 400 for query ?${q}`);
        const data = await res.json();
        assert.ok(data.error);
      }
    });
  });

  // ==========================================================================
  // 5. User Project Isolation (/api/projects/mine)
  // ==========================================================================
  describe('5. Project Isolation via /api/projects/mine', () => {
    before(async () => {
      await Project.deleteMany({});

      // User A creates 2 projects (1 open, 1 closed)
      await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          ...validProjectPayload,
          title: "User Alpha's Open System",
          status: 'open',
        }),
      });

      await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          ...validProjectPayload,
          title: "User Alpha's Closed System",
          status: 'closed',
        }),
      });

      // User B creates 1 project
      await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
        body: JSON.stringify({
          ...validProjectPayload,
          title: "User Beta's Personal Tool",
          status: 'open',
        }),
      });
    });

    it('returns both open and closed projects owned by User A with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/projects/mine`, {
        headers: { Cookie: userACookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.projects.length, 2);
      assert.equal(data.pagination.totalProjects, 2);
      for (const p of data.projects) {
        assert.equal(p.ownerId, userAId);
      }

      const statuses = data.projects.map((p) => p.status);
      assert.ok(statuses.includes('open'));
      assert.ok(statuses.includes('closed'));
    });

    it('returns only User B projects for User B session', async () => {
      const res = await fetch(`${baseUrl}/api/projects/mine`, {
        headers: { Cookie: userBCookie },
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.projects.length, 1);
      assert.equal(data.projects[0].ownerId, userBId);
      assert.equal(data.projects[0].title, "User Beta's Personal Tool");
    });
  });

  // ==========================================================================
  // 6. Project Updates and Ownership Enforcement (PATCH /api/projects/:id)
  // ==========================================================================
  describe('6. Project Updates and Ownership Enforcement', () => {
    let alphaProjectId;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          ...validProjectPayload,
          title: 'Initial Alpha Project Title',
          status: 'open',
        }),
      });
      const data = await res.json();
      alphaProjectId = data.project.id;
    });

    it('allows owner (User A) to update project title and status with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${alphaProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          title: 'Updated Alpha Project Title',
          status: 'closed',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.project.title, 'Updated Alpha Project Title');
      assert.equal(data.project.status, 'closed');
      assert.equal(data.project.ownerId, userAId);
    });

    it('rejects update by non-owner (User B) with HTTP 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${alphaProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
        body: JSON.stringify({
          title: 'Malicious Beta Hijack',
        }),
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/);

      // Verify DB unchanged
      const dbDoc = await Project.findById(alphaProjectId);
      assert.equal(dbDoc.title, 'Updated Alpha Project Title');
    });

    it('rejects owner reassignment attempt with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${alphaProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          ownerId: userBId,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Unexpected property in request body: ownerId/);

      // Verify owner is still User A
      const dbDoc = await Project.findById(alphaProjectId);
      assert.equal(dbDoc.ownerId.toString(), userAId);
    });

    it('rejects empty PATCH payload with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${alphaProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'At least one field must be provided for update');
    });

    it('returns HTTP 400 on malformed ID during PATCH', async () => {
      const res = await fetch(`${baseUrl}/api/projects/not-valid-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({ title: 'New Valid Title' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'Invalid project ID format');
    });

    it('returns HTTP 404 on nonexistent project during PATCH', async () => {
      const nonexistentId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/projects/${nonexistentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({ title: 'New Valid Title' }),
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'Project not found');
    });
  });

  // ==========================================================================
  // 7. Project Deletion and Ownership Enforcement (DELETE /api/projects/:id)
  // ==========================================================================
  describe('7. Project Deletion and Ownership Enforcement', () => {
    let projectToDeleteId;

    beforeEach(async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookie },
        body: JSON.stringify({
          ...validProjectPayload,
          title: 'Project To Be Deleted Soon',
        }),
      });
      const data = await res.json();
      projectToDeleteId = data.project.id;
    });

    it('rejects delete by non-owner (User B) with HTTP 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${projectToDeleteId}`, {
        method: 'DELETE',
        headers: { Cookie: userBCookie },
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/);

      // Verify project still exists
      const dbDoc = await Project.findById(projectToDeleteId);
      assert.ok(dbDoc);
    });

    it('allows owner (User A) to delete project with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${projectToDeleteId}`, {
        method: 'DELETE',
        headers: { Cookie: userACookie },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.message, 'Project successfully deleted');

      // Subsequent GET should return 404
      const getRes = await fetch(`${baseUrl}/api/projects/${projectToDeleteId}`, {
        headers: { Cookie: userACookie },
      });
      assert.equal(getRes.status, 404);
    });

    it('returns HTTP 400 on malformed ID during DELETE', async () => {
      const res = await fetch(`${baseUrl}/api/projects/bad-id-123`, {
        method: 'DELETE',
        headers: { Cookie: userACookie },
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, 'Invalid project ID format');
    });

    it('returns HTTP 404 on nonexistent project during DELETE', async () => {
      const nonexistentId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/projects/${nonexistentId}`, {
        method: 'DELETE',
        headers: { Cookie: userACookie },
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.error, 'Project not found');
    });
  });

  // ==========================================================================
  // 8. Matching Engine Contract Alignment
  // ==========================================================================
  describe('8. Matching Engine Contract Alignment', () => {
    it('Project instance provides toMatchingEnginePayload() compliant with Phase 4A engine', async () => {
      const projectDoc = new Project({
        title: 'Matching Engine Conformance Project',
        description: 'Verifying data contract alignment with compatibility engine functions.',
        ownerId: new mongoose.Types.ObjectId(),
        requiredSkills: [
          { name: 'TypeScript', minLevel: 4 },
          { name: 'React', minLevel: 3 },
        ],
        timeSlots: ['mon_morning', 'fri_afternoon'],
        goals: ['portfolio', 'hackathon'],
        timeline: 'flexible',
        workingStyle: 'synchronous',
        status: 'open',
      });

      const payload = projectDoc.toMatchingEnginePayload();
      assert.deepEqual(payload.requiredSkills, [
        { name: 'TypeScript', minLevel: 4 },
        { name: 'React', minLevel: 3 },
      ]);
      assert.deepEqual(payload.timeSlots, ['mon_morning', 'fri_afternoon']);
      assert.deepEqual(payload.goals, ['portfolio', 'hackathon']);
      assert.equal(payload.timeline, 'flexible');
      assert.equal(payload.workingStyle, 'synchronous');
    });
  });
});
