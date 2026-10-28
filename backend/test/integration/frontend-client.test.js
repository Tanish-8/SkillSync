import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Project from '../../src/models/Project.js';
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
    await Project.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    clientApiUrl = `http://127.0.0.1:${port}/api`;
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

  let projectCookie = null;
  let testProjectId = null;

  it('7. createProject: creates project with required fields and returns 201', async () => {
    // Re-authenticate Samantha
    const loginRes = await fetch(`${clientApiUrl}/auth/login`, {
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
    assert.equal(loginRes.status, 200);
    projectCookie = loginRes.headers.get('set-cookie').split(';')[0];

    const res = await fetch(`${clientApiUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: projectCookie,
      },
      body: JSON.stringify({
        title: 'Distributed Consensus Lab',
        description:
          'Building Raft and Paxos simulation sandboxes in Go and TypeScript with web visualizers.',
        requiredSkills: [
          { name: 'Go', minLevel: 4 },
          { name: 'TypeScript', minLevel: 3 },
        ],
        timeSlots: ['mon_morning', 'wed_afternoon'],
        goals: ['research', 'portfolio'],
        timeline: 'Spring 2026',
        workingStyle: 'mixed',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.project);
    assert.equal(data.project.title, 'Distributed Consensus Lab');
    assert.equal(data.project.status, 'open');
    testProjectId = data.project.id;
  });

  it('8. getProjects & getMyProjects: returns open projects and caller projects with pagination', async () => {
    // Open projects
    const openRes = await fetch(`${clientApiUrl}/projects?page=1&limit=10`, {
      method: 'GET',
      headers: { Cookie: projectCookie },
    });
    assert.equal(openRes.status, 200);
    const openData = await openRes.json();
    assert.ok(Array.isArray(openData.projects));
    assert.ok(openData.pagination);
    assert.equal(openData.pagination.totalProjects, 1);
    assert.equal(openData.projects[0].id, testProjectId);

    // My projects
    const myRes = await fetch(`${clientApiUrl}/projects/mine?page=1&limit=10`, {
      method: 'GET',
      headers: { Cookie: projectCookie },
    });
    assert.equal(myRes.status, 200);
    const myData = await myRes.json();
    assert.ok(Array.isArray(myData.projects));
    assert.equal(myData.pagination.totalProjects, 1);
    assert.equal(myData.projects[0].id, testProjectId);
  });

  it('9. getProject: retrieves single project details by ID', async () => {
    const res = await fetch(`${clientApiUrl}/projects/${testProjectId}`, {
      method: 'GET',
      headers: { Cookie: projectCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.project.id, testProjectId);
    assert.equal(data.project.title, 'Distributed Consensus Lab');
  });

  it('10. updateProject: updates project fields and status via PATCH', async () => {
    const res = await fetch(`${clientApiUrl}/projects/${testProjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: projectCookie,
      },
      body: JSON.stringify({
        title: 'Distributed Consensus Lab (Updated)',
        status: 'closed',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.project.title, 'Distributed Consensus Lab (Updated)');
    assert.equal(data.project.status, 'closed');
  });

  it('11. deleteProject: removes project via DELETE and subsequent GET returns 404', async () => {
    const res = await fetch(`${clientApiUrl}/projects/${testProjectId}`, {
      method: 'DELETE',
      headers: { Cookie: projectCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.message, 'Project successfully deleted');

    // Confirm deletion
    const getRes = await fetch(`${clientApiUrl}/projects/${testProjectId}`, {
      method: 'GET',
      headers: { Cookie: projectCookie },
    });
    assert.equal(getRes.status, 404);
  });

  it('12. getProjectRecommendations: returns recommendations envelope with completeness and pagination', async () => {
    const res = await fetch(`${clientApiUrl}/matching/recommendations/projects?page=1&limit=5`, {
      method: 'GET',
      headers: { Cookie: projectCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.recommendations));
    assert.ok(data.completeness !== undefined);
    assert.ok(data.pagination !== undefined);
    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 5);
  });

  it('13. getStudyBuddyRecommendations: returns recommendations envelope with completeness and pagination', async () => {
    const res = await fetch(`${clientApiUrl}/matching/recommendations/study-buddies?page=1&limit=5`, {
      method: 'GET',
      headers: { Cookie: projectCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.recommendations));
    assert.ok(data.completeness !== undefined);
    assert.ok(data.pagination !== undefined);
  });

  it('14. getSkillSwapRecommendations: returns recommendations envelope with completeness and pagination', async () => {
    const res = await fetch(`${clientApiUrl}/matching/recommendations/skillswap?page=1&limit=5`, {
      method: 'GET',
      headers: { Cookie: projectCookie },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.recommendations));
    assert.ok(data.completeness !== undefined);
    assert.ok(data.pagination !== undefined);
  });
});

