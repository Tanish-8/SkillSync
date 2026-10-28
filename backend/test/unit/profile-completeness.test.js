import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  StudentProfile,
  calculateProfileCompleteness,
} from '../../src/models/StudentProfile.js';
import {
  calculateProjectCompatibility,
  calculateStudyCompatibility,
  calculateSkillSwapCompatibility,
} from '../../src/services/matching/compatibilityEngine.js';

describe('StudentProfile Model & Completeness - Unit Tests', () => {
  // ==========================================================================
  // 1. Initial Incomplete Profiles
  // ==========================================================================
  describe('1. Incomplete profiles during onboarding', () => {
    it('flags all modes incomplete on an empty onboarding profile and reports missing fields', () => {
      const completeness = calculateProfileCompleteness({});

      assert.equal(completeness.project.isComplete, false);
      assert.deepEqual(completeness.project.missingFields.sort(), [
        'goals',
        'skills',
        'timeSlots',
        'timeline',
        'workingStyle',
      ].sort());

      assert.equal(completeness.study.isComplete, false);
      assert.deepEqual(completeness.study.missingFields.sort(), [
        'courseCode',
        'learningPreferences',
        'timeSlots',
        'topics',
      ].sort());

      assert.equal(completeness.skillswap.isComplete, false);
      assert.deepEqual(completeness.skillswap.missingFields.sort(), [
        'desiredSkills',
        'skills',
        'timeSlots',
        'weeklyHours',
      ].sort());
    });

    it('identifies partial completeness per mode independently without global score', () => {
      const partialProfile = {
        // Study fields completed
        courseCode: 'CS101',
        topics: ['algorithms'],
        timeSlots: ['mon_morning'],
        learningPreferences: ['hands_on'],
        // Project fields missing
        skills: undefined,
        goals: undefined,
        timeline: undefined,
        workingStyle: undefined,
      };

      const completeness = calculateProfileCompleteness(partialProfile);
      assert.equal(completeness.study.isComplete, true);
      assert.deepEqual(completeness.study.missingFields, []);

      assert.equal(completeness.project.isComplete, false);
      assert.ok(completeness.project.missingFields.includes('skills'));
      assert.ok(completeness.project.missingFields.includes('goals'));

      assert.equal(completeness.skillswap.isComplete, false);
      assert.ok(completeness.skillswap.missingFields.includes('desiredSkills'));
      assert.ok(completeness.skillswap.missingFields.includes('weeklyHours'));
    });
  });

  // ==========================================================================
  // 2. Explicit Empty Arrays vs Omitted Fields
  // ==========================================================================
  describe('2. Explicit empty arrays vs omitted fields', () => {
    it('treats explicitly supplied empty arrays as declared sets rather than missing', () => {
      const declaredEmptyProfile = {
        skills: [], // declared 0 skills
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
        workingStyle: 'synchronous',
      };

      const completeness = calculateProfileCompleteness(declaredEmptyProfile);
      assert.equal(completeness.project.isComplete, true);
      assert.deepEqual(completeness.project.missingFields, []);
    });

    it('flags undefined/omitted arrays as missing fields', () => {
      const omittedProfile = {
        // skills omitted
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
        workingStyle: 'synchronous',
      };

      const completeness = calculateProfileCompleteness(omittedProfile);
      assert.equal(completeness.project.isComplete, false);
      assert.deepEqual(completeness.project.missingFields, ['skills']);
    });
  });

  // ==========================================================================
  // 3. Complete Mode Evaluations
  // ==========================================================================
  describe('3. Fully complete profiles per mode', () => {
    it('evaluates Project mode as complete when all required fields are present', () => {
      const profile = {
        skills: [{ name: 'React', level: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['portfolio'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const completeness = calculateProfileCompleteness(profile);
      assert.equal(completeness.project.isComplete, true);
      assert.deepEqual(completeness.project.missingFields, []);
    });

    it('evaluates Study mode as complete when all required fields are present', () => {
      const profile = {
        courseCode: 'CS101',
        topics: ['algorithms', 'data_structures'],
        timeSlots: ['mon_morning', 'thu_afternoon'],
        learningPreferences: ['problem_solving'],
      };

      const completeness = calculateProfileCompleteness(profile);
      assert.equal(completeness.study.isComplete, true);
      assert.deepEqual(completeness.study.missingFields, []);
    });

    it('evaluates SkillSwap mode as complete when all required fields are present', () => {
      const profile = {
        skills: [{ name: 'Python', level: 4 }], // reused as offeredSkills
        desiredSkills: [{ name: 'Figma', targetLevel: 3 }],
        timeSlots: ['mon_morning', 'wed_evening'],
        weeklyHours: 4,
      };

      const completeness = calculateProfileCompleteness(profile);
      assert.equal(completeness.skillswap.isComplete, true);
      assert.deepEqual(completeness.skillswap.missingFields, []);
    });
  });

  // ==========================================================================
  // 4. Payload Adapters & Matching Engine Integration
  // ==========================================================================
  describe('4. Matching Engine Payload Adapters', () => {
    it('adapts general skills into offeredSkills for SkillSwap and runs through matching engine', () => {
      const profileDoc = new StudentProfile({
        userId: new mongoose.Types.ObjectId(),
        skills: [{ name: 'Python', level: 4 }],
        desiredSkills: [{ name: 'Figma', targetLevel: 3 }],
        timeSlots: ['mon_morning', 'wed_evening'],
        weeklyHours: 4,
      });

      const swapPayloadA = profileDoc.toSkillSwapMatchingPayload();
      assert.deepEqual(swapPayloadA.offeredSkills, [{ name: 'Python', level: 4 }]);
      assert.deepEqual(swapPayloadA.desiredSkills, [{ name: 'Figma', targetLevel: 3 }]);
      assert.equal(swapPayloadA.weeklyHours, 4);

      // Verify direct compatibility with engine
      const peer = {
        offeredSkills: [{ name: 'Figma', level: 4 }],
        desiredSkills: [{ name: 'Python', targetLevel: 4 }],
        timeSlots: ['mon_morning', 'fri_afternoon'],
        weeklyHours: 6,
      };

      const result = calculateSkillSwapCompatibility(swapPayloadA, peer);
      assert.equal(result.status, 'calculated');
      assert.equal(result.score, 89);
    });

    it('adapts profile to Project matching payload and computes compatibility', () => {
      const profileDoc = new StudentProfile({
        userId: new mongoose.Types.ObjectId(),
        skills: [{ name: 'React', level: 2 }, { name: 'Node.js', level: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['portfolio'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      });

      const projectPayload = profileDoc.toProjectMatchingPayload();
      const project = {
        requiredSkills: [{ name: 'React', minLevel: 4 }, { name: 'Node.js', minLevel: 3 }],
        timeSlots: ['mon_morning', 'tue_evening'],
        goals: ['portfolio', 'hackathon'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const result = calculateProjectCompatibility(project, projectPayload);
      assert.equal(result.status, 'calculated');
      assert.equal(result.score, 72);
    });

    it('adapts profile to Study matching payload and computes compatibility', () => {
      const profileDoc = new StudentProfile({
        userId: new mongoose.Types.ObjectId(),
        courseCode: 'CS101',
        topics: ['data_structures', 'algorithms'],
        timeSlots: ['mon_morning', 'thu_afternoon'],
        learningPreferences: ['problem_solving', 'discussion'],
      });

      const studyPayloadA = profileDoc.toStudyMatchingPayload();
      const peer = {
        courseCode: 'cs101',
        topics: ['algorithms', 'web_dev'],
        timeSlots: ['mon_morning', 'fri_evening'],
        learningPreferences: ['problem_solving'],
      };

      const result = calculateStudyCompatibility(studyPayloadA, peer);
      assert.equal(result.status, 'calculated');
      assert.equal(result.score, 56);
    });
  });
});
