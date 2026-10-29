import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../../src/models/User.js';
import StudentProfile from '../../src/models/StudentProfile.js';
import Project from '../../src/models/Project.js';
import CollaborationRequest from '../../src/models/CollaborationRequest.js';
import { connectDB, closeDB } from '../../src/config/db.js';
import {
  seedDemoData,
  cleanDemoData,
  verifySafeDatabase,
  sanitizeMongoUri,
  DEMO_USER_SPECS,
} from '../../scripts/seedDemoData.js';
import {
  getStudyBuddyRecommendations,
  getSkillSwapRecommendations,
  getProjectRecommendations,
} from '../../src/controllers/matching.controller.js';

describe('SkillSync Presentation Demo Seeder - Integration Tests', () => {
  const TEST_DB_URI = 'mongodb://127.0.0.1:27017/skillsync_seeder_test';
  let anchorUser;
  let anchorProfile;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB(TEST_DB_URI);
  });

  after(async () => {
    await cleanDemoData({ dbUri: TEST_DB_URI, silent: true });
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await Project.deleteMany({});
    await CollaborationRequest.deleteMany({});
    await closeDB();
  });

  beforeEach(async () => {
    // Reset test collections
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await Project.deleteMany({});
    await CollaborationRequest.deleteMany({});

    // Create an anchor student user with complete profile
    anchorUser = await User.create({
      name: 'Presentation Presenter',
      email: 'presenter.anchor@university.edu',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLM',
      tokenVersion: 0,
    });

    anchorProfile = await StudentProfile.create({
      userId: anchorUser._id,
      bio: 'Lead presenter student profile for SkillSync presentation.',
      courseCode: 'CS101',
      topics: ['dsa', 'algorithms'],
      timeSlots: ['mon_afternoon', 'wed_afternoon', 'fri_afternoon'],
      learningPreferences: ['problem_solving'],
      learningStyle: 'hands_on',
      skills: [
        { name: 'JavaScript', level: 4 },
        { name: 'React', level: 3 },
      ],
      desiredSkills: [
        { name: 'Python', targetLevel: 3 },
      ],
      weeklyHours: 5,
      goals: ['portfolio', 'capstone'],
      timeline: 'full_semester',
      workingStyle: 'mixed',
      academicBackground: {
        degree: 'B.E',
        branch: 'Computer Science',
        yearOfStudy: 3,
        semester: 5,
        relevantSubjects: ['DSA', 'Web Engineering'],
      },
      academicPerformance: {
        scale: 'gpa_10',
        score: 8.5,
      },
    });
  });

  describe('1. Safety Guards and URL Sanitization', () => {
    it('sanitizes mongo credentials from connection strings', () => {
      const sanitized = sanitizeMongoUri('mongodb://admin:secretPass123@127.0.0.1:27017/skillsync');
      assert.equal(sanitized, 'mongodb://***:***@127.0.0.1:27017/skillsync');
      assert.ok(!sanitized.includes('secretPass123'));
    });

    it('positively validates safe local development databases', () => {
      assert.equal(verifySafeDatabase('mongodb://127.0.0.1:27017/skillsync').safe, true);
      assert.equal(verifySafeDatabase('mongodb://localhost:27017/skillsync_dev').safe, true);
      assert.equal(verifySafeDatabase('mongodb://127.0.0.1:27017/skillsync_demo').safe, true);
      assert.equal(verifySafeDatabase('mongodb://127.0.0.1:27017/skillsync_test').safe, true);
    });

    it('rejects remote or non-local hosts by default', () => {
      const result = verifySafeDatabase('mongodb://prod.cluster0.mongodb.net/skillsync_prod');
      assert.equal(result.safe, false);
      assert.ok(result.reason.includes('remote'));
    });

    it('refuses to run when NODE_ENV is set to production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await assert.rejects(
          async () => {
            await seedDemoData({
              anchorEmail: 'presenter.anchor@university.edu',
              confirm: true,
              dbUri: TEST_DB_URI,
              silent: true,
            });
          },
          (err) => err.message.includes('NODE_ENV=production')
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('refuses to run when anchor email is omitted', async () => {
      await assert.rejects(
        async () => {
          await seedDemoData({
            anchorEmail: '',
            confirm: false,
            dbUri: TEST_DB_URI,
            silent: true,
          });
        },
        (err) => err.message.includes('Anchor email required')
      );
    });

    it('refuses to run when anchor student account does not exist', async () => {
      await assert.rejects(
        async () => {
          await seedDemoData({
            anchorEmail: 'nonexistent.student@example.com',
            confirm: false,
            dbUri: TEST_DB_URI,
            silent: true,
          });
        },
        (err) => err.message.includes('not found')
      );
    });

    it('refuses to seed when anchor profile is missing mandatory mode fields', async () => {
      // Invalidate anchor profile by wiping skills
      await StudentProfile.updateOne({ userId: anchorUser._id }, { $unset: { skills: 1 } });

      await assert.rejects(
        async () => {
          await seedDemoData({
            anchorEmail: 'presenter.anchor@university.edu',
            confirm: false,
            dbUri: TEST_DB_URI,
            silent: true,
          });
        },
        (err) => err.message.includes('Anchor profile is incomplete')
      );
    });
  });

  describe('2. Dry-Run / Preview Mode', () => {
    it('returns predicted compatibility scores without modifying the database when confirm is false', async () => {
      const res = await seedDemoData({
        anchorEmail: 'presenter.anchor@university.edu',
        confirm: false,
        dbUri: TEST_DB_URI,
        silent: true,
      });

      assert.equal(res.preview, true);
      assert.equal(res.seededUsersCount, 0);
      assert.equal(res.studyCandidates.length, 3);
      assert.equal(res.swapCandidates.length, 3);

      // Verify no demo users were written
      const demoUsers = await User.find({ email: { $regex: /^skillsync\.demo\./ } });
      assert.equal(demoUsers.length, 0);
    });
  });

  describe('3. Applying Seed Data & Idempotency', () => {
    it('seeds demo users, profiles, projects, and requests idempotently', async () => {
      const res1 = await seedDemoData({
        anchorEmail: 'presenter.anchor@university.edu',
        confirm: true,
        dbUri: TEST_DB_URI,
        silent: true,
      });

      assert.equal(res1.preview, false);
      assert.equal(res1.seededUsersCount, 7);
      assert.equal(res1.seededProjectsCount, 3);
      assert.equal(res1.seededRequestsCount, 3);

      // Verify counts in MongoDB
      const totalDemoUsers = await User.countDocuments({ email: { $regex: /^skillsync\.demo\./ } });
      assert.equal(totalDemoUsers, 7);

      const totalDemoProjects = await Project.countDocuments({ title: { $regex: /^\[DEMO\]/ } });
      assert.equal(totalDemoProjects, 3);

      const totalDemoRequests = await CollaborationRequest.countDocuments({ message: { $regex: /^\[DEMO\]/ } });
      assert.equal(totalDemoRequests, 3);

      // Run a second time to verify strict idempotency
      const res2 = await seedDemoData({
        anchorEmail: 'presenter.anchor@university.edu',
        confirm: true,
        dbUri: TEST_DB_URI,
        silent: true,
      });

      assert.equal(res2.seededUsersCount, 7);
      assert.equal(await User.countDocuments({ email: { $regex: /^skillsync\.demo\./ } }), 7);
      assert.equal(await Project.countDocuments({ title: { $regex: /^\[DEMO\]/ } }), 3);
      assert.equal(await CollaborationRequest.countDocuments({ message: { $regex: /^\[DEMO\]/ } }), 3);
    });

    it('ensures all 3 recommendation controllers return real, eligible candidates', async () => {
      await seedDemoData({
        anchorEmail: 'presenter.anchor@university.edu',
        confirm: true,
        dbUri: TEST_DB_URI,
        silent: true,
      });

      function mockRes() {
        return {
          statusCode: null,
          data: null,
          status(code) { this.statusCode = code; return this; },
          json(data) { this.data = data; return this; },
        };
      }

      // 1. Study Buddy Recommendations
      const resStudy = mockRes();
      await getStudyBuddyRecommendations({ user: anchorUser, query: {} }, resStudy, () => {});
      assert.equal(resStudy.statusCode, 200);
      assert.ok(resStudy.data.recommendations.length >= 3);
      resStudy.data.recommendations.forEach((r) => {
        assert.ok(r.score >= 0 && r.score <= 100);
        assert.ok(r.student.userId);
        assert.ok(!r.student.passwordHash);
        assert.ok(!r.student.email);
      });

      // 2. SkillSwap Recommendations (Strict Bilateral Reciprocity)
      const resSwap = mockRes();
      await getSkillSwapRecommendations({ user: anchorUser, query: {} }, resSwap, () => {});
      assert.equal(resSwap.statusCode, 200);
      assert.ok(resSwap.data.recommendations.length >= 3);
      resSwap.data.recommendations.forEach((r) => {
        assert.ok(r.score >= 0 && r.score <= 100);
        const recipFactor = r.factors.find((f) => f.name === 'reciprocal_teach_want');
        assert.ok(recipFactor && recipFactor.score > 0);
      });

      // 3. Project Recommendations
      const resProj = mockRes();
      await getProjectRecommendations({ user: anchorUser, query: {} }, resProj, () => {});
      assert.equal(resProj.statusCode, 200);
      assert.ok(resProj.data.recommendations.length >= 3);
      resProj.data.recommendations.forEach((r) => {
        assert.ok(r.score >= 0 && r.score <= 100);
        assert.notEqual(r.project.owner.id, anchorUser._id.toString());
        assert.equal(r.project.status, 'open');
        assert.ok(r.project.title.startsWith('[DEMO]'));
      });
    });
  });

  describe('4. Cleanup Operation', () => {
    it('removes only synthetic demo records and preserves anchor user and profile', async () => {
      await seedDemoData({
        anchorEmail: 'presenter.anchor@university.edu',
        confirm: true,
        dbUri: TEST_DB_URI,
        silent: true,
      });

      const cleanRes = await cleanDemoData({ dbUri: TEST_DB_URI, silent: true });
      assert.equal(cleanRes.deletedUsersCount, 7);
      assert.equal(cleanRes.deletedProjectsCount, 3);
      assert.equal(cleanRes.deletedRequestsCount, 3);

      // Verify anchor still exists
      const anchorCheck = await User.findById(anchorUser._id);
      assert.ok(anchorCheck);
      assert.equal(anchorCheck.email, 'presenter.anchor@university.edu');

      const profileCheck = await StudentProfile.findOne({ userId: anchorUser._id });
      assert.ok(profileCheck);
      assert.equal(profileCheck.courseCode, 'CS101');
    });
  });
});
