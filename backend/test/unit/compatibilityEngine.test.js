import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProjectCompatibility,
  calculateStudyCompatibility,
  calculateSkillSwapCompatibility,
  normalizeString,
  normalizeCourseCode,
  normalizeSlot,
  formatSlot,
  jaccardSimilarity,
  clampScore,
  isValidAcademicPerformance,
  compareAcademicPerformance,
  PROJECT_FACTOR_WEIGHTS,
  STUDY_FACTOR_WEIGHTS,
  SKILLSWAP_FACTOR_WEIGHTS,
  WORKING_STYLES,
  LEARNING_STYLES,
  GRADE_SCALES,
} from '../../src/services/matching/compatibilityEngine.js';

describe('SkillSync Compatibility Engine - Unit Tests', () => {
  // ==========================================================================
  // Helper Utilities Tests
  // ==========================================================================
  describe('Helper Utilities', () => {
    it('normalizes strings by trimming and lowercasing', () => {
      assert.equal(normalizeString('  React.JS  '), 'react.js');
      assert.equal(normalizeString(null), '');
      assert.equal(normalizeString(123), '');
    });

    it('normalizes course codes by trimming, upper-casing, and collapsing spaces', () => {
      assert.equal(normalizeCourseCode('  cs  101  '), 'CS 101');
      assert.equal(normalizeCourseCode('mat-240'), 'MAT-240');
      assert.equal(normalizeCourseCode(null), '');
    });

    it('normalizes time slots into consistent snake_case format', () => {
      assert.equal(normalizeSlot('Mon Morning'), 'mon_morning');
      assert.equal(normalizeSlot('  Tue-Evening  '), 'tue_evening');
      assert.equal(normalizeSlot('wed_afternoon'), 'wed_afternoon');
    });

    it('formats time slots into human-friendly strings', () => {
      assert.equal(formatSlot('tue_evening'), 'Tuesday evening');
      assert.equal(formatSlot('mon_morning'), 'Monday morning');
      assert.equal(formatSlot('custom_slot'), 'custom_slot');
    });

    it('calculates Jaccard similarity between two arrays accurately', () => {
      assert.equal(jaccardSimilarity(['a', 'b'], ['b', 'a']), 100);
      assert.equal(jaccardSimilarity(['a', 'b'], ['c', 'd']), 0);
      const sim = jaccardSimilarity(['a', 'b'], ['b', 'c']);
      assert.ok(Math.abs(sim - 33.333) < 0.01);
      assert.equal(jaccardSimilarity([], []), 0);
    });

    it('clamps scores strictly between 0 and 100', () => {
      assert.equal(clampScore(-10), 0);
      assert.equal(clampScore(115), 100);
      assert.equal(clampScore(84.4), 84);
      assert.equal(clampScore(84.6), 85);
      assert.equal(clampScore(NaN), 0);
    });
  });

  // ==========================================================================
  // Factor Weights and Constants Integrity
  // ==========================================================================
  describe('Factor Weights and Constants Integrity', () => {
    it('Project factor weights sum to exactly 100%', () => {
      assert.equal(PROJECT_FACTOR_WEIGHTS.SKILLS_ALIGNMENT, 30);
      assert.equal(PROJECT_FACTOR_WEIGHTS.GOALS_ALIGNMENT, 20);
      assert.equal(PROJECT_FACTOR_WEIGHTS.PROJECT_EXPERIENCE, 15);
      assert.equal(PROJECT_FACTOR_WEIGHTS.ACADEMIC_RELEVANCE, 15);
      assert.equal(PROJECT_FACTOR_WEIGHTS.AVAILABILITY, 10);
      assert.equal(PROJECT_FACTOR_WEIGHTS.LEARNING_STYLE, 10);

      const sum =
        PROJECT_FACTOR_WEIGHTS.SKILLS_ALIGNMENT +
        PROJECT_FACTOR_WEIGHTS.GOALS_ALIGNMENT +
        PROJECT_FACTOR_WEIGHTS.PROJECT_EXPERIENCE +
        PROJECT_FACTOR_WEIGHTS.ACADEMIC_RELEVANCE +
        PROJECT_FACTOR_WEIGHTS.AVAILABILITY +
        PROJECT_FACTOR_WEIGHTS.LEARNING_STYLE;

      assert.equal(sum, 100);
    });

    it('Study Buddy factor weights sum to exactly 100%', () => {
      assert.equal(STUDY_FACTOR_WEIGHTS.SUBJECT_COURSE_OVERLAP, 30);
      assert.equal(STUDY_FACTOR_WEIGHTS.LEARNING_STYLE, 25);
      assert.equal(STUDY_FACTOR_WEIGHTS.SHARED_SCHEDULE, 20);
      assert.equal(STUDY_FACTOR_WEIGHTS.ACADEMIC_LEVEL, 15);
      assert.equal(STUDY_FACTOR_WEIGHTS.GOALS_ALIGNMENT, 10);

      const sum =
        STUDY_FACTOR_WEIGHTS.SUBJECT_COURSE_OVERLAP +
        STUDY_FACTOR_WEIGHTS.LEARNING_STYLE +
        STUDY_FACTOR_WEIGHTS.SHARED_SCHEDULE +
        STUDY_FACTOR_WEIGHTS.ACADEMIC_LEVEL +
        STUDY_FACTOR_WEIGHTS.GOALS_ALIGNMENT;

      assert.equal(sum, 100);
    });

    it('SkillSwap factor weights sum to exactly 100%', () => {
      assert.equal(SKILLSWAP_FACTOR_WEIGHTS.RECIPROCAL_TEACH_WANT, 40);
      assert.equal(SKILLSWAP_FACTOR_WEIGHTS.SKILL_LEVEL, 20);
      assert.equal(SKILLSWAP_FACTOR_WEIGHTS.GOALS_ALIGNMENT, 15);
      assert.equal(SKILLSWAP_FACTOR_WEIGHTS.AVAILABILITY, 15);
      assert.equal(SKILLSWAP_FACTOR_WEIGHTS.LEARNING_STYLE, 10);

      const sum =
        SKILLSWAP_FACTOR_WEIGHTS.RECIPROCAL_TEACH_WANT +
        SKILLSWAP_FACTOR_WEIGHTS.SKILL_LEVEL +
        SKILLSWAP_FACTOR_WEIGHTS.GOALS_ALIGNMENT +
        SKILLSWAP_FACTOR_WEIGHTS.AVAILABILITY +
        SKILLSWAP_FACTOR_WEIGHTS.LEARNING_STYLE;

      assert.equal(sum, 100);
    });
  });

  // ==========================================================================
  // Academic Performance & Grade Scales Tests
  // ==========================================================================
  describe('Academic Performance & Grade Scales Validation', () => {
    it('validates percentage scores between 0 and 100', () => {
      assert.equal(isValidAcademicPerformance({ scale: 'percentage', score: 85 }), true);
      assert.equal(isValidAcademicPerformance({ scale: 'percentage', score: 0 }), true);
      assert.equal(isValidAcademicPerformance({ scale: 'percentage', score: 100 }), true);
      assert.equal(isValidAcademicPerformance({ scale: 'percentage', score: -1 }), false);
      assert.equal(isValidAcademicPerformance({ scale: 'percentage', score: 101 }), false);
    });

    it('validates gpa_10 scores between 0 and 10', () => {
      assert.equal(isValidAcademicPerformance({ scale: 'gpa_10', score: 8.5 }), true);
      assert.equal(isValidAcademicPerformance({ scale: 'gpa_10', score: 10 }), true);
      assert.equal(isValidAcademicPerformance({ scale: 'gpa_10', score: 10.5 }), false);
    });

    it('validates gpa_4 scores between 0 and 4', () => {
      assert.equal(isValidAcademicPerformance({ scale: 'gpa_4', score: 3.8 }), true);
      assert.equal(isValidAcademicPerformance({ scale: 'gpa_4', score: 4 }), true);
      assert.equal(isValidAcademicPerformance({ scale: 'gpa_4', score: 4.1 }), false);
    });

    it('treats missing academic performance as optional (valid)', () => {
      assert.equal(isValidAcademicPerformance(null), true);
      assert.equal(isValidAcademicPerformance(undefined), true);
    });

    it('never compares incompatible grade scales', () => {
      const perfPct = { scale: 'percentage', score: 85 };
      const perf10 = { scale: 'gpa_10', score: 8.5 };
      const comparison = compareAcademicPerformance(perfPct, perf10);

      assert.equal(comparison.comparable, false);
      assert.equal(comparison.reason, 'incompatible_scales');
    });

    it('compares identical grade scales accurately', () => {
      const perfA = { scale: 'gpa_10', score: 8.5 };
      const perfB = { scale: 'gpa_10', score: 9.0 };
      const comparison = compareAcademicPerformance(perfA, perfB);

      assert.equal(comparison.comparable, true);
      assert.equal(comparison.scale, 'gpa_10');
      assert.ok(Math.abs(comparison.diff - 0.5) < 0.001);
    });
  });

  // ==========================================================================
  // Project Compatibility Scenarios
  // ==========================================================================
  describe('Project Compatibility Scenarios', () => {
    it('returns score 100 with all 6 factors at 100 for an ideal project match', () => {
      const project = {
        requiredSkills: [
          { name: 'React', minLevel: 3 },
          { name: 'Node.js', minLevel: 4 },
        ],
        timeSlots: ['mon_morning', 'wed_afternoon'],
        goals: ['portfolio', 'hackathon'],
        timeline: 'short_term',
        learningStyle: 'hands_on',
      };

      const student = {
        skills: [
          { name: 'react', level: 3 },
          { name: 'NODE.JS', level: 5 },
        ],
        timeSlots: ['wed_afternoon', 'mon_morning'],
        goals: ['hackathon', 'portfolio'],
        timeline: 'short_term',
        learningStyle: 'hands_on',
        academicBackground: {
          degree: 'B.Tech',
          branch: 'Computer Science',
          relevantSubjects: ['React', 'Node.js'],
        },
        previousProjects: [
          {
            title: 'Campus App',
            skills: ['React', 'Node.js'],
          },
        ],
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      assert.equal(result.score, 100);
      assert.equal(result.factors.length, 6);

      for (const factor of result.factors) {
        assert.equal(factor.score, 100);
      }

      assert.ok(result.reasons.length >= 4);
      assert.ok(result.reasons[0].includes('cover all 2 required skills'));
    });

    it('scores 0 for skills alignment factor when student has zero skill overlap', () => {
      const project = {
        requiredSkills: [{ name: 'Rust', minLevel: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['systems'],
        timeline: 'flexible',
      };

      const student = {
        skills: [{ name: 'Python', level: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['systems'],
        timeline: 'flexible',
        learningStyle: 'hands_on',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const skillFactor = result.factors.find((f) => f.name === 'skills_alignment');
      assert.equal(skillFactor.score, 0);
      assert.ok(result.reasons[0].includes('do not currently match any of the project\'s 1 required skills'));
      assert.ok(result.reasons[0].includes('Rust'));
    });

    it('pro-rates skill factor when student is below requested minimum level', () => {
      const project = {
        requiredSkills: [{ name: 'React', minLevel: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['web'],
        timeline: 'short_term',
      };

      const student = {
        skills: [{ name: 'React', level: 2 }],
        timeSlots: ['mon_morning'],
        goals: ['web'],
        timeline: 'short_term',
        learningStyle: 'hands_on',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const skillFactor = result.factors.find((f) => f.name === 'skills_alignment');
      assert.equal(skillFactor.score, 50);
      assert.ok(result.reasons[0].includes('partial proficiency'));
      assert.ok(result.reasons[0].includes('level 2/4'));
    });

    it('scores 0 for previous project experience when student has explicit empty list []', () => {
      const project = {
        requiredSkills: [{ name: 'Python', minLevel: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['ml'],
        timeline: 'flexible',
      };

      const student = {
        skills: [{ name: 'Python', level: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['ml'],
        timeline: 'flexible',
        learningStyle: 'hands_on',
        previousProjects: [], // explicitly empty
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const expFactor = result.factors.find((f) => f.name === 'project_experience');
      assert.equal(expFactor.score, 0);
      assert.ok(result.reasons.some((r) => r.includes('No previous project experience declared')));
    });

    it('does not penalize student when project does not declare academic requirements', () => {
      const project = {
        requiredSkills: [{ name: 'JavaScript', minLevel: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['web'],
        timeline: 'flexible',
        // no academic requirements declared
      };

      const student = {
        skills: [{ name: 'JavaScript', level: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['web'],
        timeline: 'flexible',
        learningStyle: 'visual',
        academicBackground: {
          degree: 'B.Tech',
          branch: 'Information Technology',
          relevantSubjects: ['Web Technologies'],
        },
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const acadFactor = result.factors.find((f) => f.name === 'academic_relevance');
      assert.ok(acadFactor.score >= 80);
      assert.ok(result.reasons.some((r) => r.includes('academic') || r.includes('Candidate coursework')));
    });

    it('evaluates project learning style using student learningStyle, not project workingStyle', () => {
      const project = {
        requiredSkills: [{ name: 'Go', minLevel: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['api'],
        timeline: 'flexible',
        learningStyle: 'hands_on',
      };

      const student = {
        skills: [{ name: 'Go', level: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['api'],
        timeline: 'flexible',
        learningStyle: 'hands_on', // matches project learningStyle
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const learnFactor = result.factors.find((f) => f.name === 'learning_style_compatibility');
      assert.equal(learnFactor.score, 100);
      assert.ok(result.reasons.some((r) => r.includes('hands on')));
    });
  });

  // ==========================================================================
  // Study Buddy Compatibility Scenarios
  // ==========================================================================
  describe('Study Buddy Compatibility Scenarios', () => {
    it('computes 5 factors for study buddy compatibility summing to 100%', () => {
      const studentA = {
        courseCode: 'CS101',
        topics: ['algorithms', 'data_structures'],
        timeSlots: ['mon_morning', 'wed_afternoon'],
        learningPreferences: ['problem_solving'],
        learningStyle: 'visual',
        academicBackground: { yearOfStudy: 2 },
        goals: ['exam_prep'],
      };

      const studentB = {
        courseCode: 'CS101',
        topics: ['algorithms', 'data_structures'],
        timeSlots: ['mon_morning', 'wed_afternoon'],
        learningPreferences: ['problem_solving'],
        learningStyle: 'visual',
        academicBackground: { yearOfStudy: 2 },
        goals: ['exam_prep'],
      };

      const result = calculateStudyCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');
      assert.equal(result.score, 100);
      assert.equal(result.factors.length, 5);

      const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
      assert.equal(totalWeight, 100);
    });

    it('pro-rates academic level based on year difference', () => {
      const studentA = {
        courseCode: 'CS101',
        topics: ['algorithms'],
        timeSlots: ['mon_morning'],
        learningStyle: 'visual',
        academicBackground: { yearOfStudy: 1 },
      };

      const studentB = {
        courseCode: 'CS101',
        topics: ['algorithms'],
        timeSlots: ['mon_morning'],
        learningStyle: 'visual',
        academicBackground: { yearOfStudy: 2 }, // 1 year diff -> 80
      };

      const result = calculateStudyCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');
      const levelFactor = result.factors.find((f) => f.name === 'academic_level_compatibility');
      assert.equal(levelFactor.score, 80);
    });
  });

  // ==========================================================================
  // SkillSwap Compatibility Scenarios & Strict Reciprocity
  // ==========================================================================
  describe('SkillSwap Compatibility Scenarios & Strict Reciprocity', () => {
    it('scores 0 for reciprocal teach/want factor and skill depth on one-way matches', () => {
      // Student A offers React, desires Python
      // Student B offers React, desires Go (does not desire what A offers!)
      const studentA = {
        offeredSkills: [{ name: 'React', level: 4 }],
        desiredSkills: [{ name: 'Python', targetLevel: 3 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
        learningStyle: 'hands_on',
      };
      const studentB = {
        offeredSkills: [{ name: 'Python', level: 4 }],
        desiredSkills: [{ name: 'Go', targetLevel: 3 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
        learningStyle: 'hands_on',
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');

      const reciprocal = result.factors.find((f) => f.name === 'reciprocal_teach_want');
      const depth = result.factors.find((f) => f.name === 'skill_level_compatibility');

      assert.equal(reciprocal.score, 0);
      assert.equal(depth.score, 0);
      assert.ok(result.reasons.some((r) => r.includes('One-way match')));
    });

    it('scores full reciprocity when both students offer what the other desires', () => {
      const studentA = {
        offeredSkills: [{ name: 'React', level: 4 }],
        desiredSkills: [{ name: 'Python', targetLevel: 3 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
        learningStyle: 'hands_on',
        goals: ['career'],
      };
      const studentB = {
        offeredSkills: [{ name: 'Python', level: 4 }],
        desiredSkills: [{ name: 'React', targetLevel: 4 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
        learningStyle: 'hands_on',
        goals: ['career'],
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');

      const reciprocal = result.factors.find((f) => f.name === 'reciprocal_teach_want');
      const depth = result.factors.find((f) => f.name === 'skill_level_compatibility');

      assert.equal(reciprocal.score, 100);
      assert.equal(depth.score, 100);
      assert.ok(result.reasons.some((r) => r.includes('Mutual skill exchange')));
    });
  });

  // ==========================================================================
  // Missing Data and Insufficient Data Contracts
  // ==========================================================================
  describe('Missing Data & Insufficient Data Contracts', () => {
    it('returns insufficient_data with null score when required fields are missing', () => {
      const project = {
        // missing requiredSkills
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
      };
      const student = {
        skills: [],
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'insufficient_data');
      assert.equal(result.score, null);
      assert.deepEqual(result.factors, []);
    });

    it('strictly distinguishes explicit empty arrays (calculated 0) from missing fields', () => {
      const validEmptyProject = {
        requiredSkills: [],
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
      };
      const validEmptyStudent = {
        skills: [],
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
      };

      const validRes = calculateProjectCompatibility(validEmptyProject, validEmptyStudent);
      assert.equal(validRes.status, 'calculated');
      assert.equal(typeof validRes.score, 'number');
    });
  });
});
