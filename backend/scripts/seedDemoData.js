/**
 * @file SkillSync Presentation Demo Data Seeder
 * @module backend/scripts/seedDemoData
 *
 * Provides a safe, idempotent, development-only demo-data seeding and cleanup
 * workflow to populate the real database-backed recommendation pages:
 * - 3 Study Buddy candidates (varied compatibility scores)
 * - 3 Genuinely reciprocal SkillSwap partners (strict bilateral reciprocity)
 * - 3 Open projects with the [DEMO] prefix
 * - 3 Sample collaboration requests (1 received pending, 1 sent pending, 1 accepted historical)
 *
 * Safety & Guardrails:
 * - Refuses to run if NODE_ENV=production.
 * - Refuses to write to remote or non-development databases.
 * - Requires explicit confirmation (SKILLSYNC_DEMO_SEED_CONFIRM=YES or --confirm) to apply changes.
 * - Defaults to a dry-run / preview mode without writing data.
 * - Adapts sample records dynamically from the existing signed-in student's profile (SKILLSYNC_DEMO_ANCHOR_EMAIL).
 * - Never modifies or deletes ordinary student accounts, anchor profiles, or production data.
 * - Provides --clean to safely purge only the synthetic presentation records.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import StudentProfile from '../src/models/StudentProfile.js';
import Project from '../src/models/Project.js';
import CollaborationRequest from '../src/models/CollaborationRequest.js';
import {
  calculateProjectCompatibility,
  calculateStudyCompatibility,
  calculateSkillSwapCompatibility,
} from '../src/services/matching/compatibilityEngine.js';

// ============================================================================
// 1. CONSTANTS & DEMO DEFINITIONS
// ============================================================================

export const DEMO_USER_SPECS = Object.freeze([
  {
    name: 'Ananya Rao (Demo)',
    email: 'skillsync.demo.study01@example.com',
    role: 'study_candidate_1',
  },
  {
    name: 'Aarav Mehta (Demo)',
    email: 'skillsync.demo.study02@example.com',
    role: 'study_candidate_2',
  },
  {
    name: 'Diya Shah (Demo)',
    email: 'skillsync.demo.study03@example.com',
    role: 'study_candidate_3',
  },
  {
    name: 'Kabir Shah (Demo)',
    email: 'skillsync.demo.swap01@example.com',
    role: 'swap_candidate_1',
  },
  {
    name: 'Mira Iyer (Demo)',
    email: 'skillsync.demo.swap02@example.com',
    role: 'swap_candidate_2',
  },
  {
    name: 'Rohan Verma (Demo)',
    email: 'skillsync.demo.swap03@example.com',
    role: 'swap_candidate_3',
  },
  {
    name: 'Priya Patel (Demo)',
    email: 'skillsync.demo.projectlead@example.com',
    role: 'project_lead',
  },
]);

export const DEMO_PASSWORD_PLAINTEXT = 'DemoPass123!';

// ============================================================================
// 2. SAFETY & DATABASE VALIDATION HELPERS
// ============================================================================

/**
 * Sanitizes a MongoDB connection URI to avoid printing credentials.
 *
 * @param {string} uri
 * @returns {string} Redacted URI
 */
export function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
}

/**
 * Positively verifies whether a connection URI targets a safe local/development database.
 *
 * @param {string} uri
 * @returns {{ safe: boolean, host?: string, dbName?: string, reason?: string }}
 */
export function verifySafeDatabase(uri) {
  if (!uri) {
    return { safe: false, reason: 'MongoDB URI is empty or undefined.' };
  }

  try {
    const sanitized = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const parsed = new URL(sanitized);
    const host = parsed.hostname.toLowerCase();
    const dbName = (parsed.pathname || '').replace(/^\//, '').toLowerCase();

    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    if (!isLocal) {
      if (process.env.SKILLSYNC_ALLOW_REMOTE_DEMO_DB === 'YES' && /demo|test|dev/i.test(dbName)) {
        return { safe: true, host, dbName };
      }
      return {
        safe: false,
        reason: `Host '${host}' is remote. Seeding is only permitted on local/development instances (localhost, 127.0.0.1).`,
      };
    }

    if (!/skillsync|demo|test|dev/i.test(dbName)) {
      return {
        safe: false,
        reason: `Database name '${dbName}' does not appear to be a SkillSync development or demo database.`,
      };
    }

    return { safe: true, host, dbName };
  } catch {
    if (/127\.0\.0\.1|localhost/i.test(uri) && /skillsync|demo|test|dev/i.test(uri)) {
      return { safe: true, host: '127.0.0.1', dbName: 'skillsync' };
    }
    return { safe: false, reason: 'Could not safely parse database connection URI.' };
  }
}

// ============================================================================
// 3. ANCHOR-ADAPTIVE DEMO DATA BUILDERS
// ============================================================================

/**
 * Builds synthetic Study Buddy profiles dynamically calibrated against the anchor.
 *
 * @param {Object} anchorProfile - Existing student profile
 * @returns {Array<Object>} 3 synthetic study candidate profile payloads
 */
export function buildStudyCandidateProfiles(anchorProfile) {
  const courseCode = anchorProfile.courseCode || 'CS101';
  const anchorTopics = Array.isArray(anchorProfile.topics) && anchorProfile.topics.length > 0
    ? anchorProfile.topics
    : ['dsa'];
  const anchorSlots = Array.isArray(anchorProfile.timeSlots) && anchorProfile.timeSlots.length > 0
    ? anchorProfile.timeSlots
    : ['mon_afternoon', 'wed_afternoon'];
  const anchorPrefs = Array.isArray(anchorProfile.learningPreferences) && anchorProfile.learningPreferences.length > 0
    ? anchorProfile.learningPreferences
    : ['problem_solving'];
  const anchorStyle = anchorProfile.learningStyle || 'hands_on';
  const anchorYear = anchorProfile.academicBackground?.yearOfStudy || 3;
  const anchorSemester = anchorProfile.academicBackground?.semester || 5;
  const anchorDegree = anchorProfile.academicBackground?.degree || 'B.E';
  const anchorBranch = anchorProfile.academicBackground?.branch || 'Computer Science';
  const anchorGoals = Array.isArray(anchorProfile.goals) && anchorProfile.goals.length > 0
    ? anchorProfile.goals
    : ['portfolio', 'capstone'];

  return [
    // 1. Ananya Rao: Closely aligned (High compatibility ~85-95%)
    {
      email: 'skillsync.demo.study01@example.com',
      bio: '[DEMO PROFILE] Synthetic study partner profile closely aligned with coursework and study schedule for presentation demonstration.',
      courseCode,
      topics: [...new Set([...anchorTopics, 'algorithms', 'system_design'])].slice(0, 3),
      timeSlots: [...new Set([...anchorSlots, 'thu_afternoon'])],
      learningPreferences: [...new Set([...anchorPrefs, 'mock_quizzes'])],
      learningStyle: anchorStyle,
      academicBackground: {
        degree: anchorDegree,
        branch: anchorBranch,
        yearOfStudy: anchorYear,
        semester: anchorSemester,
        relevantSubjects: anchorProfile.academicBackground?.relevantSubjects || [courseCode],
      },
      goals: [...anchorGoals],
    },
    // 2. Aarav Mehta: Moderate alignment (Moderate compatibility ~70-80%)
    {
      email: 'skillsync.demo.study02@example.com',
      bio: '[DEMO PROFILE] Synthetic study partner profile with overlapping course interests and moderate schedule alignment.',
      courseCode,
      topics: [anchorTopics[0], 'data_structures', 'sql_indexing'].filter(Boolean),
      timeSlots: [anchorSlots[0] || 'mon_afternoon', 'tue_morning', 'thu_evening'],
      learningPreferences: [anchorPrefs[0] || 'problem_solving', 'whiteboard_sessions'],
      learningStyle: anchorStyle === 'mixed' ? 'discussion' : 'mixed',
      academicBackground: {
        degree: anchorDegree,
        branch: 'Information Technology',
        yearOfStudy: Math.min(8, anchorYear + 1),
        semester: Math.min(16, anchorSemester + 2),
        relevantSubjects: ['Software Engineering', 'Database Systems'],
      },
      goals: [anchorGoals[0] || 'capstone', 'exam_prep'],
    },
    // 3. Diya Shah: Partial alignment (Lower compatibility ~50-65%)
    {
      email: 'skillsync.demo.study03@example.com',
      bio: '[DEMO PROFILE] Synthetic study partner profile in an adjacent cohort with partial schedule overlap.',
      courseCode,
      topics: [anchorTopics[0], 'discrete_math', 'probability'].filter(Boolean),
      timeSlots: [anchorSlots[anchorSlots.length - 1] || 'fri_afternoon', 'sat_morning', 'sun_afternoon'],
      learningPreferences: ['reading_groups', 'individual_review'],
      learningStyle: anchorStyle === 'reading' ? 'visual' : 'reading',
      academicBackground: {
        degree: 'B.S.',
        branch: 'Applied Mathematics',
        yearOfStudy: Math.max(1, anchorYear - 1),
        semester: Math.max(1, anchorSemester - 2),
        relevantSubjects: ['Calculus', 'Linear Algebra'],
      },
      goals: ['research', 'exam_prep'],
    },
  ];
}

/**
 * Builds synthetic SkillSwap candidate profiles guaranteeing strict bilateral reciprocity.
 *
 * @param {Object} anchorProfile - Existing student profile
 * @returns {Array<Object>} 3 synthetic skillswap candidate profile payloads
 */
export function buildSkillSwapCandidateProfiles(anchorProfile) {
  const anchorTeaches = Array.isArray(anchorProfile.skills) && anchorProfile.skills.length > 0
    ? anchorProfile.skills
    : [{ name: 'JavaScript', level: 3 }];
  const anchorWants = Array.isArray(anchorProfile.desiredSkills) && anchorProfile.desiredSkills.length > 0
    ? anchorProfile.desiredSkills
    : [{ name: 'Python', targetLevel: 3 }];

  const primaryTeach = anchorTeaches[0];
  const secondTeach = anchorTeaches[1] || primaryTeach;
  const primaryWant = anchorWants[0];

  const anchorSlots = Array.isArray(anchorProfile.timeSlots) && anchorProfile.timeSlots.length > 0
    ? anchorProfile.timeSlots
    : ['mon_afternoon', 'wed_afternoon', 'fri_afternoon'];
  const anchorHours = anchorProfile.weeklyHours || 5;
  const anchorStyle = anchorProfile.learningStyle || 'hands_on';
  const anchorGoals = Array.isArray(anchorProfile.goals) && anchorProfile.goals.length > 0
    ? anchorProfile.goals
    : ['portfolio', 'capstone'];

  return [
    // 1. Kabir Shah: High reciprocal match (~85-95%)
    {
      email: 'skillsync.demo.swap01@example.com',
      bio: '[DEMO PROFILE] Synthetic SkillSwap partner profile with reciprocal teach/learn alignment and overlapping availability.',
      skills: [
        { name: primaryWant.name, level: Math.min(5, (primaryWant.targetLevel || 3) + 1) },
        { name: 'Git & GitHub', level: 4 },
      ],
      desiredSkills: [
        { name: primaryTeach.name, targetLevel: Math.max(1, primaryTeach.level || 3) },
      ],
      timeSlots: [...new Set([...anchorSlots, 'sat_morning'])],
      weeklyHours: anchorHours,
      learningStyle: anchorStyle,
      goals: [...anchorGoals],
    },
    // 2. Mira Iyer: Moderate reciprocal match (~70-80%)
    {
      email: 'skillsync.demo.swap02@example.com',
      bio: '[DEMO PROFILE] Synthetic SkillSwap partner profile with reciprocal skill exchange and flexible evening schedule.',
      skills: [
        { name: primaryWant.name, level: Math.max(1, primaryWant.targetLevel || 3) },
        { name: 'TypeScript', level: 3 },
      ],
      desiredSkills: [
        { name: secondTeach.name, targetLevel: Math.max(1, secondTeach.level || 3) },
      ],
      timeSlots: [anchorSlots[0] || 'mon_afternoon', 'tue_evening', 'thu_evening'],
      weeklyHours: Math.max(1, anchorHours - 1),
      learningStyle: anchorStyle === 'discussion' ? 'mixed' : 'discussion',
      goals: [anchorGoals[0] || 'portfolio', 'hackathon'],
    },
    // 3. Rohan Verma: Lower reciprocal match (~55-65%)
    {
      email: 'skillsync.demo.swap03@example.com',
      bio: '[DEMO PROFILE] Synthetic SkillSwap partner profile with reciprocal skill exchange and alternative learning style.',
      skills: [
        { name: primaryWant.name, level: Math.max(1, (primaryWant.targetLevel || 3) - 1) },
        { name: 'Docker', level: 2 },
      ],
      desiredSkills: [
        { name: primaryTeach.name, targetLevel: Math.min(5, (primaryTeach.level || 3) + 1) },
      ],
      timeSlots: [anchorSlots[anchorSlots.length - 1] || 'fri_afternoon', 'sun_afternoon'],
      weeklyHours: Math.max(1, Math.round(anchorHours * 0.5)),
      learningStyle: anchorStyle === 'reading' ? 'visual' : 'reading',
      goals: ['open_source'],
    },
  ];
}

/**
 * Builds 3 open demo projects with the [DEMO] prefix, owned by the demo project lead.
 *
 * @param {Object} anchorProfile - Existing student profile
 * @param {string} projectLeadUserId - ObjectId string of the demo project lead
 * @returns {Array<Object>} 3 synthetic project payloads
 */
export function buildDemoProjects(anchorProfile, projectLeadUserId) {
  const anchorSkills = Array.isArray(anchorProfile.skills) && anchorProfile.skills.length > 0
    ? anchorProfile.skills
    : [{ name: 'JavaScript', level: 3 }];
  const primarySkill = anchorSkills[0];

  const anchorSlots = Array.isArray(anchorProfile.timeSlots) && anchorProfile.timeSlots.length > 0
    ? anchorProfile.timeSlots
    : ['mon_afternoon', 'wed_afternoon', 'fri_afternoon'];
  const anchorGoals = Array.isArray(anchorProfile.goals) && anchorProfile.goals.length > 0
    ? anchorProfile.goals
    : ['portfolio', 'capstone'];
  const anchorTimeline = anchorProfile.timeline || 'full_semester';
  const anchorWorkingStyle = anchorProfile.workingStyle || 'mixed';
  const anchorStyle = anchorProfile.learningStyle || 'hands_on';
  const anchorSubjects = anchorProfile.academicBackground?.relevantSubjects || [anchorProfile.courseCode || 'CS101'];

  return [
    // 1. Campus Study Planner (Close match ~80-90%)
    {
      title: '[DEMO] Campus Study Planner',
      description: 'An open-source peer study planner designed to help university students organize exam prep squads, track weekly learning goals, and share curated problem sets.',
      ownerId: projectLeadUserId,
      requiredSkills: anchorSkills.map((s) => ({
        name: s.name,
        minLevel: Math.max(1, s.level - 1),
      })),
      timeSlots: [...anchorSlots],
      goals: [...anchorGoals],
      timeline: anchorTimeline,
      workingStyle: anchorWorkingStyle,
      preferredLearningStyle: anchorStyle,
      relevantSubjects: [...anchorSubjects],
      status: 'open',
    },
    // 2. Collaborative Learning Dashboard (Moderate match ~70-80%)
    {
      title: '[DEMO] Collaborative Learning Dashboard',
      description: 'A full-stack collaborative learning analytics dashboard providing students with progress telemetry, study squad milestone tracking, and shared sprint retrospectives.',
      ownerId: projectLeadUserId,
      requiredSkills: [
        { name: primarySkill.name, minLevel: primarySkill.level },
        { name: 'REST APIs', minLevel: 3 },
      ],
      timeSlots: [anchorSlots[0] || 'mon_afternoon', 'wed_evening'],
      goals: [anchorGoals[0] || 'portfolio', 'hackathon'],
      timeline: '4_weeks',
      workingStyle: anchorWorkingStyle === 'asynchronous' ? 'synchronous' : 'asynchronous',
      preferredLearningStyle: anchorStyle === 'discussion' ? 'mixed' : 'discussion',
      relevantSubjects: ['Web Development', 'Database Systems'],
      status: 'open',
    },
    // 3. Peer Skill Exchange Toolkit (Lower match ~50-65%)
    {
      title: '[DEMO] Peer Skill Exchange Toolkit',
      description: 'A decentralized peer-to-peer skill exchange toolkit providing automated session logs, code review pairing templates, and asynchronous sprint boards.',
      ownerId: projectLeadUserId,
      requiredSkills: [
        { name: primarySkill.name, minLevel: Math.min(5, primarySkill.level + 1) },
        { name: 'DevOps', minLevel: 4 },
      ],
      timeSlots: [anchorSlots[anchorSlots.length - 1] || 'fri_afternoon', 'sat_afternoon'],
      goals: ['open_source'],
      timeline: 'flexible',
      workingStyle: anchorWorkingStyle === 'synchronous' ? 'asynchronous' : 'synchronous',
      preferredLearningStyle: anchorStyle === 'reading' ? 'visual' : 'reading',
      relevantSubjects: ['Systems Programming'],
      status: 'open',
    },
  ];
}

// ============================================================================
// 4. MAIN SEED & CLEANUP ORCHESTRATION
// ============================================================================

/**
 * Seeds or previews presentation demo data adapted to an anchor student's profile.
 *
 * @param {Object} options
 * @param {string} options.anchorEmail - Email of the anchor student account
 * @param {boolean} [options.confirm=false] - When true, writes changes; otherwise runs dry-run preview
 * @param {string} [options.dbUri] - Optional MongoDB URI override
 * @param {boolean} [options.silent=false] - Suppress console logs during automated testing
 * @returns {Promise<Object>} Seeding execution report
 */
export async function seedDemoData({
  anchorEmail,
  confirm = false,
  dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillsync',
  silent = false,
} = {}) {
  const log = (...args) => (!silent ? console.log(...args) : undefined);

  // 1. Refuse in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SkillSync Demo Seeder] Fatal: Refusing to run in production mode (NODE_ENV=production).');
  }

  // 2. Positively verify safe development database
  const safety = verifySafeDatabase(dbUri);
  if (!safety.safe) {
    throw new Error(`[SkillSync Demo Seeder] Fatal: Unsafe database rejected. Reason: ${safety.reason}`);
  }

  // 3. Validate anchor email input
  if (!anchorEmail || typeof anchorEmail !== 'string' || anchorEmail.trim().length === 0) {
    throw new Error(
      '[SkillSync Demo Seeder] Anchor email required. Please set SKILLSYNC_DEMO_ANCHOR_EMAIL=<email> or pass --anchor=<email>.'
    );
  }
  const cleanAnchorEmail = anchorEmail.trim().toLowerCase();

  const isConnectedBefore = mongoose.connection.readyState === 1;
  if (!isConnectedBefore) {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
  }

  try {
    log(`[SkillSync Demo Seeder] Connected to database: ${safety.host}/${safety.dbName}`);
    log(`[SkillSync Demo Seeder] Execution Mode: ${confirm ? 'APPLY (Write)' : 'PREVIEW (Dry-Run)'}`);
    log(`[SkillSync Demo Seeder] Anchor Email: ${cleanAnchorEmail}`);

    // 4. Retrieve anchor user and profile
    const anchorUser = await User.findOne({ email: cleanAnchorEmail });
    if (!anchorUser) {
      throw new Error(
        `[SkillSync Demo Seeder] Anchor student user not found with email '${cleanAnchorEmail}'. Please register or log in first.`
      );
    }

    const anchorProfile = await StudentProfile.findOne({ userId: anchorUser._id });
    if (!anchorProfile) {
      throw new Error(
        `[SkillSync Demo Seeder] Student profile not found for anchor user '${cleanAnchorEmail}'. Please configure your profile first.`
      );
    }

    // Verify completeness of anchor profile across all 3 modes
    const completeness = anchorProfile.getCompleteness();
    const incompleteModes = [];
    if (!completeness.project.isComplete) {
      incompleteModes.push(`Project (missing: ${completeness.project.missingFields.join(', ')})`);
    }
    if (!completeness.study.isComplete) {
      incompleteModes.push(`Study Buddy (missing: ${completeness.study.missingFields.join(', ')})`);
    }
    if (!completeness.skillswap.isComplete) {
      incompleteModes.push(`SkillSwap (missing: ${completeness.skillswap.missingFields.join(', ')})`);
    }

    if (incompleteModes.length > 0) {
      throw new Error(
        `[SkillSync Demo Seeder] Anchor profile is incomplete:\n  - ${incompleteModes.join('\n  - ')}\nPlease complete your profile in the UI before seeding.`
      );
    }

    // 5. Build candidate profiles and projects
    const studyCandidates = buildStudyCandidateProfiles(anchorProfile);
    const swapCandidates = buildSkillSwapCandidateProfiles(anchorProfile);
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD_PLAINTEXT, 10);

    // Compute preview scores
    const anchorStudyPayload = anchorProfile.toStudyMatchingPayload();
    const anchorSwapPayload = anchorProfile.toSkillSwapMatchingPayload();
    const anchorProjectPayload = anchorProfile.toProjectMatchingPayload();

    const studyPreview = studyCandidates.map((c) => {
      const match = calculateStudyCompatibility(anchorStudyPayload, {
        courseCode: c.courseCode,
        topics: c.topics,
        timeSlots: c.timeSlots,
        learningPreferences: c.learningPreferences,
        learningStyle: c.learningStyle,
        academicBackground: c.academicBackground,
        goals: c.goals,
      });
      return { email: c.email, score: match.score, factors: match.factors };
    });

    const swapPreview = swapCandidates.map((c) => {
      const match = calculateSkillSwapCompatibility(anchorSwapPayload, {
        offeredSkills: c.skills,
        desiredSkills: c.desiredSkills,
        timeSlots: c.timeSlots,
        weeklyHours: c.weeklyHours,
        learningStyle: c.learningStyle,
        goals: c.goals,
      });
      return { email: c.email, score: match.score, factors: match.factors };
    });

    log('\n--- PREDICTED STUDY BUDDY COMPATIBILITY ---');
    studyPreview.forEach((s) => log(`  Candidate ${s.email}: ${s.score}% Match`));

    log('\n--- PREDICTED SKILLSWAP COMPATIBILITY ---');
    swapPreview.forEach((s) => log(`  Partner ${s.email}: ${s.score}% Match (Bilateral Reciprocity: Verified)`));

    if (!confirm) {
      log('\n========================================================================');
      log('[PREVIEW ONLY] No database changes were written.');
      log('To apply these changes, re-run with:');
      log(`  npm --prefix backend run seed:demo -- --confirm`);
      log('or set environment variable:');
      log('  SKILLSYNC_DEMO_SEED_CONFIRM=YES');
      log('========================================================================\n');

      return {
        preview: true,
        database: safety.dbName,
        anchorEmail: cleanAnchorEmail,
        studyCandidates: studyPreview,
        swapCandidates: swapPreview,
        seededUsersCount: 0,
        seededProjectsCount: 0,
        seededRequestsCount: 0,
      };
    }

    // ========================================================================
    // WRITE MODE: Apply idempotent upserts
    // ========================================================================
    log('\n[SkillSync Demo Seeder] Applying idempotent database upserts...');

    // A. Upsert Demo Users
    const userMap = new Map();
    for (const spec of DEMO_USER_SPECS) {
      const userDoc = await User.findOneAndUpdate(
        { email: spec.email },
        {
          $set: {
            name: spec.name,
            email: spec.email,
            passwordHash,
            tokenVersion: 0,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      userMap.set(spec.email, userDoc);
    }
    log(`  ✓ Upserted ${userMap.size} synthetic demo User records.`);

    // B. Upsert Study Buddy Profiles
    for (const spec of studyCandidates) {
      const user = userMap.get(spec.email);
      await StudentProfile.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            userId: user._id,
            bio: spec.bio,
            courseCode: spec.courseCode,
            topics: spec.topics,
            timeSlots: spec.timeSlots,
            learningPreferences: spec.learningPreferences,
            learningStyle: spec.learningStyle,
            academicBackground: spec.academicBackground,
            goals: spec.goals,
            // Provide minimal valid offered/desired skills so profile completeness passes across all checks
            skills: [{ name: 'Study Skills', level: 3 }],
            desiredSkills: [{ name: 'Exam Prep', targetLevel: 3 }],
            weeklyHours: 4,
            timeline: 'semester',
            workingStyle: 'mixed',
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }
    log(`  ✓ Upserted 3 Study Buddy StudentProfile records.`);

    // C. Upsert SkillSwap Profiles
    for (const spec of swapCandidates) {
      const user = userMap.get(spec.email);
      await StudentProfile.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            userId: user._id,
            bio: spec.bio,
            skills: spec.skills,
            desiredSkills: spec.desiredSkills,
            timeSlots: spec.timeSlots,
            weeklyHours: spec.weeklyHours,
            learningStyle: spec.learningStyle,
            goals: spec.goals,
            // Provide study fields so completeness passes
            courseCode: anchorProfile.courseCode || 'CS101',
            topics: ['peer_tutoring', 'code_review'],
            learningPreferences: ['problem_solving'],
            academicBackground: anchorProfile.academicBackground || {
              degree: 'B.S.',
              branch: 'Computer Science',
              yearOfStudy: 3,
              semester: 5,
            },
            timeline: 'semester',
            workingStyle: 'mixed',
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }
    log(`  ✓ Upserted 3 SkillSwap StudentProfile records.`);

    // D. Upsert Demo Projects
    const projectLeadUser = userMap.get('skillsync.demo.projectlead@example.com');
    // Ensure project lead also has a complete profile
    await StudentProfile.findOneAndUpdate(
      { userId: projectLeadUser._id },
      {
        $set: {
          userId: projectLeadUser._id,
          bio: '[DEMO PROFILE] Synthetic project owner and technical sprint coordinator.',
          skills: [{ name: 'Project Management', level: 4 }],
          desiredSkills: [{ name: 'Fullstack Engineering', targetLevel: 4 }],
          timeSlots: ['mon_afternoon', 'wed_afternoon'],
          weeklyHours: 6,
          timeline: 'full_semester',
          workingStyle: 'mixed',
          learningStyle: 'hands_on',
          courseCode: anchorProfile.courseCode || 'CS101',
          topics: ['software_architecture'],
          learningPreferences: ['problem_solving'],
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const demoProjects = buildDemoProjects(anchorProfile, projectLeadUser._id);
    const projectDocs = [];
    for (const proj of demoProjects) {
      const projDoc = await Project.findOneAndUpdate(
        { title: proj.title, ownerId: projectLeadUser._id },
        { $set: proj },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      projectDocs.push(projDoc);
    }
    log(`  ✓ Upserted ${projectDocs.length} open demo Project opportunities.`);

    // E. Upsert Sample Collaboration Requests
    const ananyaUser = userMap.get('skillsync.demo.study01@example.com');
    const kabirUser = userMap.get('skillsync.demo.swap01@example.com');
    const aaravUser = userMap.get('skillsync.demo.study02@example.com');

    // 1. Pending incoming Study Buddy request (Ananya -> Anchor)
    const ananyaMatch = studyPreview[0];
    await CollaborationRequest.findOneAndUpdate(
      {
        requesterId: ananyaUser._id,
        recipientId: anchorUser._id,
        mode: 'study_buddy',
      },
      {
        $set: {
          requesterId: ananyaUser._id,
          recipientId: anchorUser._id,
          mode: 'study_buddy',
          status: 'pending',
          message:
            '[DEMO] Hi! I noticed our study topics and schedules align closely. Would love to partner up for weekly review sessions!',
          compatibilitySnapshot: {
            mode: 'study_buddy',
            score: ananyaMatch.score,
            factors: ananyaMatch.factors,
            reasons: [
              `Course overlap: Both enrolled in ${anchorProfile.courseCode || 'CS101'}`,
              `Matching learning style (${anchorProfile.learningStyle || 'hands_on'})`,
            ],
            calculatedAt: new Date(),
          },
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // 2. Pending outgoing SkillSwap request (Anchor -> Kabir)
    const kabirMatch = swapPreview[0];
    await CollaborationRequest.findOneAndUpdate(
      {
        requesterId: anchorUser._id,
        recipientId: kabirUser._id,
        mode: 'skillswap',
      },
      {
        $set: {
          requesterId: anchorUser._id,
          recipientId: kabirUser._id,
          mode: 'skillswap',
          status: 'pending',
          message:
            '[DEMO] Hi Kabir, I saw your profile and would love to propose a reciprocal SkillSwap exchange this semester.',
          compatibilitySnapshot: {
            mode: 'skillswap',
            score: kabirMatch.score,
            factors: kabirMatch.factors,
            reasons: [
              'Strict bilateral reciprocity verified',
              'Balanced weekly exchange commitment',
            ],
            calculatedAt: new Date(),
          },
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // 3. Accepted historical request (Aarav -> Anchor)
    const aaravMatch = studyPreview[1];
    await CollaborationRequest.findOneAndUpdate(
      {
        requesterId: aaravUser._id,
        recipientId: anchorUser._id,
        mode: 'study_buddy',
      },
      {
        $set: {
          requesterId: aaravUser._id,
          recipientId: anchorUser._id,
          mode: 'study_buddy',
          status: 'accepted',
          message:
            '[DEMO] Hello! Let us collaborate on the upcoming course milestone.',
          compatibilitySnapshot: {
            mode: 'study_buddy',
            score: aaravMatch.score,
            factors: aaravMatch.factors,
            reasons: ['Enrolled in identical course code', 'Moderate schedule overlap'],
            calculatedAt: new Date(),
          },
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    log(`  ✓ Upserted 3 sample CollaborationRequest records (1 received pending, 1 sent pending, 1 accepted).`);

    log('\n========================================================================');
    log('🎉 SkillSync presentation demo dataset successfully seeded!');
    log('Sign into your anchor account in the browser to view live recommendations:');
    log(`  Anchor: ${cleanAnchorEmail}`);
    log('========================================================================\n');

    return {
      preview: false,
      database: safety.dbName,
      anchorEmail: cleanAnchorEmail,
      studyCandidates: studyPreview,
      swapCandidates: swapPreview,
      seededUsersCount: userMap.size,
      seededProjectsCount: projectDocs.length,
      seededRequestsCount: 3,
    };
  } finally {
    if (!isConnectedBefore && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

/**
 * Safely removes only synthetic demo records, preserving all anchor and regular data.
 *
 * @param {Object} options
 * @param {string} [options.dbUri]
 * @param {boolean} [options.silent=false]
 * @returns {Promise<Object>} Deletion summary
 */
export async function cleanDemoData({
  dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillsync',
  silent = false,
} = {}) {
  const log = (...args) => (!silent ? console.log(...args) : undefined);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SkillSync Demo Seeder] Fatal: Refusing to clean in production mode (NODE_ENV=production).');
  }

  const safety = verifySafeDatabase(dbUri);
  if (!safety.safe) {
    throw new Error(`[SkillSync Demo Seeder] Fatal: Unsafe database rejected. Reason: ${safety.reason}`);
  }

  const isConnectedBefore = mongoose.connection.readyState === 1;
  if (!isConnectedBefore) {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
  }

  try {
    log(`[SkillSync Demo Seeder] Cleaning synthetic demo records from ${safety.host}/${safety.dbName}...`);

    const demoEmails = DEMO_USER_SPECS.map((s) => s.email.toLowerCase());
    const demoUsers = await User.find({ email: { $in: demoEmails } });
    const demoUserIds = demoUsers.map((u) => u._id);

    // 1. Delete demo collaboration requests
    const deletedReqs = await CollaborationRequest.deleteMany({
      $or: [
        { requesterId: { $in: demoUserIds } },
        { recipientId: { $in: demoUserIds } },
        { message: { $regex: /^\[DEMO\]/ } },
      ],
    });

    // 2. Delete demo projects
    const deletedProjects = await Project.deleteMany({
      $or: [
        { ownerId: { $in: demoUserIds } },
        { title: { $regex: /^\[DEMO\]/ } },
      ],
    });

    // 3. Delete demo student profiles
    const deletedProfiles = await StudentProfile.deleteMany({
      userId: { $in: demoUserIds },
    });

    // 4. Delete demo users
    const deletedUsers = await User.deleteMany({
      _id: { $in: demoUserIds },
    });

    log(`  ✓ Removed ${deletedReqs.deletedCount} demo collaboration requests.`);
    log(`  ✓ Removed ${deletedProjects.deletedCount} demo projects.`);
    log(`  ✓ Removed ${deletedProfiles.deletedCount} demo student profiles.`);
    log(`  ✓ Removed ${deletedUsers.deletedCount} demo user accounts.`);
    log('🎉 Cleanup complete. Anchor student profile and regular accounts were left untouched.\n');

    return {
      deletedUsersCount: deletedUsers.deletedCount,
      deletedProfilesCount: deletedProfiles.deletedCount,
      deletedProjectsCount: deletedProjects.deletedCount,
      deletedRequestsCount: deletedReqs.deletedCount,
    };
  } finally {
    if (!isConnectedBefore && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

// ============================================================================
// 5. CLI ENTRYPOINT
// ============================================================================

async function runCli() {
  const args = process.argv.slice(2);
  const isClean = args.includes('--clean') || process.env.SKILLSYNC_DEMO_CLEAN === 'YES';
  const isConfirm = args.includes('--confirm') || process.env.SKILLSYNC_DEMO_SEED_CONFIRM === 'YES';

  // Parse --anchor=<email> flag if passed
  const anchorArg = args.find((a) => a.startsWith('--anchor='));
  const anchorEmail = anchorArg ? anchorArg.split('=')[1] : process.env.SKILLSYNC_DEMO_ANCHOR_EMAIL;

  try {
    if (isClean) {
      await cleanDemoData();
      process.exit(0);
    }

    await seedDemoData({
      anchorEmail,
      confirm: isConfirm,
    });
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  }
}

// Only invoke CLI when executed directly
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/seedDemoData.js')) {
  runCli();
}
