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
  PROJECT_FACTOR_WEIGHTS,
  STUDY_FACTOR_WEIGHTS,
  SKILLSWAP_FACTOR_WEIGHTS,
  WORKING_STYLES,
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
      // Identical
      assert.equal(jaccardSimilarity(['a', 'b'], ['b', 'a']), 100);
      // Disjoint
      assert.equal(jaccardSimilarity(['a', 'b'], ['c', 'd']), 0);
      // Partial: 1 shared, union 3 -> 1/3 * 100 = 33.333...
      const sim = jaccardSimilarity(['a', 'b'], ['b', 'c']);
      assert.ok(Math.abs(sim - 33.333) < 0.01);
      // Both empty
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
  // Scenario 1: A perfect project match
  // ==========================================================================
  describe('1. Perfect project match', () => {
    it('returns score 100 with all factors at 100 for an ideal project match', () => {
      const project = {
        requiredSkills: [
          { name: 'React', minLevel: 3 },
          { name: 'Node.js', minLevel: 4 },
        ],
        timeSlots: ['mon_morning', 'wed_afternoon'],
        goals: ['portfolio', 'hackathon'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const student = {
        skills: [
          { name: 'react', level: 3 },
          { name: 'NODE.JS', level: 5 },
          { name: 'TypeScript', level: 2 },
        ],
        timeSlots: ['wed_afternoon', 'mon_morning', 'fri_evening'],
        goals: ['hackathon', 'portfolio'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      assert.equal(result.score, 100);
      assert.equal(result.factors.length, 4);

      for (const factor of result.factors) {
        assert.equal(factor.score, 100);
      }

      assert.ok(result.reasons.length >= 3);
      assert.ok(result.reasons[0].includes('cover all 2 required skills'));
      assert.ok(result.reasons[1].includes('cover 2 of 2 required time slots'));
      assert.ok(result.reasons[2].includes('short_term'));
    });
  });

  // ==========================================================================
  // Scenario 2: A project with zero skill overlap
  // ==========================================================================
  describe('2. Project with zero skill overlap', () => {
    it('scores 0 for skills alignment factor and details missing skills', () => {
      const project = {
        requiredSkills: [{ name: 'Rust', minLevel: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['systems'],
        timeline: 'flexible',
        workingStyle: 'asynchronous',
      };

      const student = {
        skills: [{ name: 'Python', level: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['systems'],
        timeline: 'flexible',
        workingStyle: 'asynchronous',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const skillFactor = result.factors.find((f) => f.name === 'skills_alignment');
      assert.equal(skillFactor.score, 0);
      assert.ok(result.reasons[0].includes('do not currently match any of the project\'s 1 required skills'));
      assert.ok(result.reasons[0].includes('Rust'));
    });
  });

  // ==========================================================================
  // Scenario 3: Partial proficiency below a required level
  // ==========================================================================
  describe('3. Partial proficiency below a required level', () => {
    it('pro-rates skill factor when student is below requested minimum level', () => {
      const project = {
        requiredSkills: [{ name: 'React', minLevel: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['web'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const student = {
        skills: [{ name: 'React', level: 2 }],
        timeSlots: ['mon_morning'],
        goals: ['web'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const skillFactor = result.factors.find((f) => f.name === 'skills_alignment');
      // 2 / 4 * 100 = 50
      assert.equal(skillFactor.score, 50);
      assert.ok(result.reasons[0].includes('partial proficiency'));
      assert.ok(result.reasons[0].includes('level 2/4'));
    });
  });

  // ==========================================================================
  // Scenario 4: Partial schedule overlap
  // ==========================================================================
  describe('4. Partial schedule overlap', () => {
    it('calculates proportional schedule coverage based on project requirements', () => {
      const project = {
        requiredSkills: [{ name: 'TypeScript', minLevel: 2 }],
        timeSlots: ['mon_morning', 'tue_evening', 'wed_afternoon', 'thu_morning'],
        goals: ['app'],
        timeline: 'flexible',
        workingStyle: 'mixed',
      };

      const student = {
        skills: [{ name: 'TypeScript', level: 2 }],
        timeSlots: ['mon_morning', 'wed_afternoon', 'sat_evening'],
        goals: ['app'],
        timeline: 'flexible',
        workingStyle: 'mixed',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');
      const schedFactor = result.factors.find((f) => f.name === 'schedule_overlap');
      // 2 of 4 covered -> 50%
      assert.equal(schedFactor.score, 50);
      assert.ok(result.reasons[1].includes('cover 2 of 4 required time slots'));
    });
  });

  // ==========================================================================
  // Scenario 5: Equal, flexible, and incompatible project timelines
  // ==========================================================================
  describe('5. Equal, flexible, and incompatible project timelines', () => {
    const baseProject = {
      requiredSkills: [{ name: 'Git', minLevel: 2 }],
      timeSlots: ['mon_morning'],
      goals: ['build'],
      workingStyle: 'synchronous',
    };
    const baseStudent = {
      skills: [{ name: 'Git', level: 2 }],
      timeSlots: ['mon_morning'],
      goals: ['build'],
      workingStyle: 'synchronous',
    };

    it('scores 100 for equal timelines', () => {
      const res = calculateProjectCompatibility(
        { ...baseProject, timeline: 'medium_term' },
        { ...baseStudent, timeline: 'medium_term' }
      );
      // Goals Jaccard = 100 (60%), timeline = 100 (40%) -> 100
      const factor = res.factors.find((f) => f.name === 'goals_urgency');
      assert.equal(factor.score, 100);
      assert.ok(res.reasons[2].includes('medium_term'));
    });

    it('scores 75 for flexible timeline compatibility', () => {
      const res = calculateProjectCompatibility(
        { ...baseProject, timeline: 'flexible' },
        { ...baseStudent, timeline: 'urgent' }
      );
      // Goals Jaccard = 100 (60%), timeline = 75 (40%) -> 60 + 30 = 90
      const factor = res.factors.find((f) => f.name === 'goals_urgency');
      assert.equal(factor.score, 90);
      assert.ok(res.reasons[2].includes('Flexible timeline'));
    });

    it('scores 35 for incompatible timelines', () => {
      const res = calculateProjectCompatibility(
        { ...baseProject, timeline: 'urgent' },
        { ...baseStudent, timeline: 'long_term' }
      );
      // Goals Jaccard = 100 (60%), timeline = 35 (40%) -> 60 + 14 = 74
      const factor = res.factors.find((f) => f.name === 'goals_urgency');
      assert.equal(factor.score, 74);
      assert.ok(res.reasons[2].includes('Timeline divergence'));
    });
  });

  // ==========================================================================
  // Scenario 6: Identical and incompatible working styles
  // ==========================================================================
  describe('6. Identical and incompatible working styles', () => {
    const base = {
      requiredSkills: [{ name: 'Git', minLevel: 2 }],
      skills: [{ name: 'Git', level: 2 }],
      timeSlots: ['mon_morning'],
      goals: ['build'],
      timeline: 'flexible',
    };

    it('scores 100 for identical working styles', () => {
      const res = calculateProjectCompatibility(
        { ...base, workingStyle: 'asynchronous' },
        { ...base, workingStyle: 'asynchronous' }
      );
      const factor = res.factors.find((f) => f.name === 'working_style');
      assert.equal(factor.score, 100);
      assert.ok(res.reasons[3].includes('Both parties prefer asynchronous'));
    });

    it('scores 75 when either side explicitly chooses mixed', () => {
      const res = calculateProjectCompatibility(
        { ...base, workingStyle: 'mixed' },
        { ...base, workingStyle: 'synchronous' }
      );
      const factor = res.factors.find((f) => f.name === 'working_style');
      assert.equal(factor.score, 75);
      assert.ok(res.reasons[3].includes('flexible mixed collaboration'));
    });

    it('scores 35 for synchronous versus asynchronous mismatch', () => {
      const res = calculateProjectCompatibility(
        { ...base, workingStyle: 'synchronous' },
        { ...base, workingStyle: 'asynchronous' }
      );
      const factor = res.factors.find((f) => f.name === 'working_style');
      assert.equal(factor.score, 35);
      assert.ok(res.reasons[3].includes('Working-style contrast'));
    });
  });

  // ==========================================================================
  // Scenario 7: Exact course match (Study)
  // ==========================================================================
  describe('7. Exact course match (Study)', () => {
    it('scores 100 for course code match and accounts for 70% of factor', () => {
      const studentA = {
        courseCode: 'CS101',
        topics: ['intro'],
        timeSlots: ['mon_morning'],
        learningPreferences: ['hands_on'],
      };
      const studentB = {
        courseCode: '  cs101  ',
        topics: ['intro'],
        timeSlots: ['mon_morning'],
        learningPreferences: ['hands_on'],
      };

      const result = calculateStudyCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');
      const courseFactor = result.factors.find((f) => f.name === 'course_subject_overlap');
      // Course code = 100 (70%), Topics Jaccard = 100 (30%) -> 100
      assert.equal(courseFactor.score, 100);
      assert.ok(result.reasons[0].includes('both studying course CS101'));
    });
  });

  // ==========================================================================
  // Scenario 8: Partial topic overlap (Study)
  // ==========================================================================
  describe('8. Partial topic overlap (Study)', () => {
    it('calculates Jaccard similarity across shared study topics', () => {
      const studentA = {
        courseCode: 'CS101',
        topics: ['algorithms', 'data_structures'],
        timeSlots: ['mon_morning'],
        learningPreferences: [],
      };
      const studentB = {
        courseCode: 'CS101',
        topics: ['algorithms', 'web_dev'],
        timeSlots: ['mon_morning'],
        learningPreferences: [],
      };

      const result = calculateStudyCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');
      const courseFactor = result.factors.find((f) => f.name === 'course_subject_overlap');
      // Course code = 100 (70%), Topic Jaccard: 1/3 * 100 = 33.333% (30% -> 10) -> 80
      assert.equal(courseFactor.score, 80);
      assert.ok(result.reasons[0].includes('algorithms'));
    });
  });

  // ==========================================================================
  // Scenario 9: Study partners with no shared availability
  // ==========================================================================
  describe('9. Study partners with no shared availability', () => {
    it('scores 0 for shared availability without failing or mistaking for missing input', () => {
      const studentA = {
        courseCode: 'MATH201',
        topics: ['calculus'],
        timeSlots: ['mon_morning'],
        learningPreferences: ['problem_solving'],
      };
      const studentB = {
        courseCode: 'MATH201',
        topics: ['calculus'],
        timeSlots: ['fri_evening'],
        learningPreferences: ['problem_solving'],
      };

      const result = calculateStudyCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');
      const availFactor = result.factors.find((f) => f.name === 'shared_availability');
      assert.equal(availFactor.score, 0);
      assert.ok(result.reasons[1].includes('no shared available study slots'));
    });
  });

  // ==========================================================================
  // Scenario 10: Complete reciprocal SkillSwap compatibility
  // ==========================================================================
  describe('10. Complete reciprocal SkillSwap compatibility', () => {
    it('scores 100 across reciprocal skills, depth, and cadence', () => {
      const studentA = {
        offeredSkills: [{ name: 'Python', level: 4 }],
        desiredSkills: [{ name: 'Figma', targetLevel: 3 }],
        timeSlots: ['mon_morning', 'wed_evening'],
        weeklyHours: 5,
      };
      const studentB = {
        offeredSkills: [{ name: 'Figma', level: 4 }],
        desiredSkills: [{ name: 'Python', targetLevel: 4 }],
        timeSlots: ['mon_morning', 'wed_evening'],
        weeklyHours: 5,
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');
      assert.equal(result.score, 100);

      const reciprocal = result.factors.find((f) => f.name === 'reciprocal_skills');
      const depth = result.factors.find((f) => f.name === 'skill_depth');
      const cadence = result.factors.find((f) => f.name === 'availability_cadence');

      assert.equal(reciprocal.score, 100);
      assert.equal(depth.score, 100);
      assert.equal(cadence.score, 100);

      assert.ok(result.reasons[0].includes('Mutual skill exchange'));
      assert.ok(result.reasons[0].includes('Python'));
      assert.ok(result.reasons[0].includes('Figma'));
      assert.ok(result.reasons[1].includes('meet or exceed requested target levels'));
    });
  });

  // ==========================================================================
  // Scenario 11: One-way-only SkillSwap compatibility
  // ==========================================================================
  describe('11. One-way-only SkillSwap compatibility', () => {
    it('scores 0 for reciprocal factor and depth when only one direction matches', () => {
      const studentA = {
        offeredSkills: [{ name: 'Python', level: 5 }],
        desiredSkills: [{ name: 'Rust', targetLevel: 3 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 4,
      };
      const studentB = {
        // B wants Python (satisfied), but B offers Watercolor (A does not desire it)
        offeredSkills: [{ name: 'Watercolor', level: 4 }],
        desiredSkills: [{ name: 'Python', targetLevel: 4 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 4,
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');

      const reciprocal = result.factors.find((f) => f.name === 'reciprocal_skills');
      const depth = result.factors.find((f) => f.name === 'skill_depth');

      // A->B coverage is 100%, B->A coverage is 0% -> min(1, 0) = 0
      assert.equal(reciprocal.score, 0);
      assert.equal(depth.score, 0);

      assert.ok(result.reasons[0].includes('One-way match'));
      assert.ok(result.reasons[1].includes('No reciprocal skill pairs available'));
    });
  });

  // ==========================================================================
  // Scenario 12: No reciprocal skill pairs
  // ==========================================================================
  describe('12. No reciprocal skill pairs', () => {
    it('scores 0 for reciprocal and depth factors when no skills align', () => {
      const studentA = {
        offeredSkills: [{ name: 'Cooking', level: 4 }],
        desiredSkills: [{ name: 'Piano', targetLevel: 3 }],
        timeSlots: ['tue_evening'],
        weeklyHours: 3,
      };
      const studentB = {
        offeredSkills: [{ name: 'Guitar', level: 4 }],
        desiredSkills: [{ name: 'Baking', targetLevel: 3 }],
        timeSlots: ['tue_evening'],
        weeklyHours: 3,
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');

      const reciprocal = result.factors.find((f) => f.name === 'reciprocal_skills');
      const depth = result.factors.find((f) => f.name === 'skill_depth');

      assert.equal(reciprocal.score, 0);
      assert.equal(depth.score, 0);
      assert.ok(result.reasons[0].includes('No reciprocal skill matches found'));
    });
  });

  // ==========================================================================
  // Scenario 13: Different proficiency and target levels
  // ==========================================================================
  describe('13. Different proficiency and target levels', () => {
    it('calculates aggregated skill depth across directional pairs', () => {
      const studentA = {
        // Teacher A offers React at level 2, B wanted targetLevel 4 -> 2/4 * 100 = 50
        offeredSkills: [{ name: 'React', level: 2 }],
        desiredSkills: [{ name: 'Node.js', targetLevel: 3 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
      };
      const studentB = {
        // Teacher B offers Node.js at level 5, A wanted targetLevel 3 -> 100
        offeredSkills: [{ name: 'Node.js', level: 5 }],
        desiredSkills: [{ name: 'React', targetLevel: 4 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');

      const depth = result.factors.find((f) => f.name === 'skill_depth');
      // Mean of pairs: (50 + 100) / 2 = 75
      assert.equal(depth.score, 75);
      assert.ok(result.reasons[1].includes('partially meet requested target levels'));
    });
  });

  // ==========================================================================
  // Scenario 14: Availability/cadence compatibility
  // ==========================================================================
  describe('14. Availability/cadence compatibility', () => {
    it('factors 70% slot overlap and 30% weekly hours ratio into availability score', () => {
      const studentA = {
        offeredSkills: [{ name: 'HTML', level: 3 }],
        desiredSkills: [{ name: 'CSS', targetLevel: 3 }],
        timeSlots: ['mon_morning', 'wed_evening'],
        weeklyHours: 4,
      };
      const studentB = {
        offeredSkills: [{ name: 'CSS', level: 3 }],
        desiredSkills: [{ name: 'HTML', targetLevel: 3 }],
        timeSlots: ['mon_morning', 'fri_afternoon'],
        weeklyHours: 8,
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');

      const cadence = result.factors.find((f) => f.name === 'availability_cadence');
      // Slot Jaccard: 1 / 3 * 100 = 33.333% (70% weight -> 23.333)
      // Hours ratio: 4 / 8 * 100 = 50% (30% weight -> 15)
      // Total: 23.333 + 15 = 38.333 -> 38
      assert.equal(cadence.score, 38);
      assert.ok(result.reasons[3].includes('4h/week vs 8h/week'));
      assert.ok(result.reasons[3].includes('50% cadence match'));
    });
  });

  // ==========================================================================
  // Scenario 15: Missing required fields returning insufficient_data
  // ==========================================================================
  describe('15. Missing required fields returning insufficient_data', () => {
    it('returns insufficient_data when project timeline is missing', () => {
      const project = {
        requiredSkills: [],
        timeSlots: [],
        goals: [],
        // missing timeline
        workingStyle: 'synchronous',
      };
      const student = {
        skills: [],
        timeSlots: [],
        goals: [],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'insufficient_data');
      assert.equal(result.score, null);
      assert.deepEqual(result.factors, []);
      assert.ok(result.reasons.some((r) => r.includes('project.timeline')));
    });

    it('returns insufficient_data when student workingStyle is missing', () => {
      const project = {
        requiredSkills: [],
        timeSlots: [],
        goals: [],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };
      const student = {
        skills: [],
        timeSlots: [],
        goals: [],
        timeline: 'short_term',
        // missing workingStyle
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'insufficient_data');
      assert.equal(result.score, null);
      assert.deepEqual(result.factors, []);
      assert.ok(result.reasons.some((r) => r.includes('student.workingStyle')));
    });

    it('returns insufficient_data when study partner courseCode is missing', () => {
      const studentA = {
        courseCode: '',
        topics: [],
        timeSlots: [],
        learningPreferences: [],
      };
      const studentB = {
        courseCode: 'CS101',
        topics: [],
        timeSlots: [],
        learningPreferences: [],
      };

      const result = calculateStudyCompatibility(studentA, studentB);
      assert.equal(result.status, 'insufficient_data');
      assert.equal(result.score, null);
      assert.deepEqual(result.factors, []);
      assert.ok(result.reasons.some((r) => r.includes('courseCode')));
    });

    it('returns insufficient_data when weeklyHours is missing in SkillSwap', () => {
      const studentA = {
        offeredSkills: [],
        desiredSkills: [],
        timeSlots: [],
        // missing weeklyHours
      };
      const studentB = {
        offeredSkills: [],
        desiredSkills: [],
        timeSlots: [],
        weeklyHours: 5,
      };

      const result = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(result.status, 'insufficient_data');
      assert.equal(result.score, null);
      assert.deepEqual(result.factors, []);
      assert.ok(result.reasons.some((r) => r.includes('weeklyHours')));
    });
  });

  // ==========================================================================
  // Scenario 16: Invalid proficiency levels and malformed input objects
  // ==========================================================================
  describe('16. Invalid proficiency levels and malformed input objects', () => {
    it('rejects skill levels outside 1-5 integer range', () => {
      const project = {
        requiredSkills: [{ name: 'React', minLevel: 6 }], // invalid 6
        timeSlots: [],
        goals: [],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };
      const student = {
        skills: [{ name: 'React', level: 0 }], // invalid 0
        timeSlots: [],
        goals: [],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const res = calculateProjectCompatibility(project, student);
      assert.equal(res.status, 'insufficient_data');
      assert.ok(res.reasons.some((r) => r.includes('minLevel (1-5)')));
    });

    it('rejects non-integer and string skill levels', () => {
      const studentA = {
        offeredSkills: [{ name: 'Node.js', level: 3.5 }],
        desiredSkills: [{ name: 'Python', targetLevel: 'expert' }],
        timeSlots: [],
        weeklyHours: 4,
      };
      const studentB = {
        offeredSkills: [{ name: 'Python', level: 4 }],
        desiredSkills: [{ name: 'Node.js', targetLevel: 3 }],
        timeSlots: [],
        weeklyHours: 4,
      };

      const res = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(res.status, 'insufficient_data');
      assert.equal(res.score, null);
    });

    it('rejects null, undefined, or non-object inputs safely', () => {
      assert.equal(calculateProjectCompatibility(null, {}).status, 'insufficient_data');
      assert.equal(calculateProjectCompatibility({}, undefined).status, 'insufficient_data');
      assert.equal(calculateStudyCompatibility('CS101', {}).status, 'insufficient_data');
      assert.equal(calculateSkillSwapCompatibility(null, null).status, 'insufficient_data');
    });

    it('rejects invalid working styles not in allowed set', () => {
      const project = {
        requiredSkills: [],
        timeSlots: [],
        goals: [],
        timeline: 'short_term',
        workingStyle: 'telepathic', // invalid
      };
      const student = {
        skills: [],
        timeSlots: [],
        goals: [],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const res = calculateProjectCompatibility(project, student);
      assert.equal(res.status, 'insufficient_data');
      assert.ok(res.reasons.some((r) => r.includes('workingStyle must be one of')));
    });

    it('rejects negative or zero weekly hours in SkillSwap', () => {
      const studentA = {
        offeredSkills: [],
        desiredSkills: [],
        timeSlots: [],
        weeklyHours: -2,
      };
      const studentB = {
        offeredSkills: [],
        desiredSkills: [],
        timeSlots: [],
        weeklyHours: 0,
      };

      const res = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(res.status, 'insufficient_data');
      assert.ok(res.reasons.some((r) => r.includes('weeklyHours must be a positive number')));
    });
  });

  // ==========================================================================
  // Scenario 17: Score boundaries of 0 and 100
  // ==========================================================================
  describe('17. Score boundaries of 0 and 100', () => {
    it('keeps project scores strictly within [0, 100]', () => {
      const projectZero = {
        requiredSkills: [{ name: 'Haskell', minLevel: 5 }],
        timeSlots: ['mon_morning'],
        goals: ['quantum'],
        timeline: 'urgent',
        workingStyle: 'synchronous',
      };
      const studentZero = {
        skills: [],
        timeSlots: ['fri_evening'],
        goals: ['web'],
        timeline: 'long_term',
        workingStyle: 'asynchronous',
      };

      const res = calculateProjectCompatibility(projectZero, studentZero);
      assert.equal(res.status, 'calculated');
      assert.ok(res.score >= 0 && res.score <= 100);
      for (const factor of res.factors) {
        assert.ok(factor.score >= 0 && factor.score <= 100);
      }
    });

    it('keeps study scores strictly within [0, 100]', () => {
      const studentZeroA = {
        courseCode: 'CS101',
        topics: ['a'],
        timeSlots: ['mon_morning'],
        learningPreferences: ['visual'],
      };
      const studentZeroB = {
        courseCode: 'HIST300',
        topics: ['b'],
        timeSlots: ['tue_evening'],
        learningPreferences: ['auditory'],
      };

      const res = calculateStudyCompatibility(studentZeroA, studentZeroB);
      assert.equal(res.status, 'calculated');
      assert.equal(res.score, 0);
      for (const factor of res.factors) {
        assert.equal(factor.score, 0);
      }
    });

    it('keeps SkillSwap scores strictly within [0, 100]', () => {
      const studentA = {
        offeredSkills: [],
        desiredSkills: [{ name: 'AI', targetLevel: 5 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 1,
      };
      const studentB = {
        offeredSkills: [],
        desiredSkills: [{ name: 'Blockchain', targetLevel: 5 }],
        timeSlots: ['tue_evening'],
        weeklyHours: 100,
      };

      const res = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(res.status, 'calculated');
      assert.ok(res.score >= 0 && res.score <= 100);
    });
  });

  // ==========================================================================
  // Scenario 18: Weight totals and score calculations
  // ==========================================================================
  describe('18. Weight totals and score calculations', () => {
    it('verifies factor weights sum to exactly 100 across all 3 modes', () => {
      const sumProject = Object.values(PROJECT_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
      assert.equal(sumProject, 100);

      const sumStudy = Object.values(STUDY_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
      assert.equal(sumStudy, 100);

      const sumSkillSwap = Object.values(SKILLSWAP_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
      assert.equal(sumSkillSwap, 100);
    });

    it('verifies calculated score is exact sum of factor scores multiplied by their weights', () => {
      const project = {
        requiredSkills: [{ name: 'React', minLevel: 4 }],
        timeSlots: ['mon_morning', 'tue_evening'],
        goals: ['app'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };
      const student = {
        skills: [{ name: 'React', level: 2 }], // 50
        timeSlots: ['mon_morning'], // 50
        goals: ['app'], // 100 Jaccard (60%) + 100 timeline (40%) = 100
        timeline: 'short_term',
        workingStyle: 'asynchronous', // 35
      };

      const res = calculateProjectCompatibility(project, student);
      assert.equal(res.status, 'calculated');

      const expectedSum =
        50 * 0.40 + // 20
        50 * 0.25 + // 12.5
        100 * 0.20 + // 20
        35 * 0.15; // 5.25
      // 20 + 12.5 + 20 + 5.25 = 57.75 -> 58

      assert.equal(res.score, Math.round(expectedSum));
      const factorWeightSum = res.factors.reduce((sum, f) => sum + f.weight, 0);
      assert.equal(factorWeightSum, 100);
    });
  });

  // ==========================================================================
  // Scenario 19: Repeatability: identical inputs always return identical outputs
  // ==========================================================================
  describe('19. Repeatability: identical inputs always return identical outputs', () => {
    it('produces strictly identical results on repeated execution without side effects', () => {
      const studentA = {
        courseCode: 'CS50',
        topics: ['c', 'python', 'sql'],
        timeSlots: ['mon_morning', 'thu_afternoon'],
        learningPreferences: ['hands_on', 'peer_review'],
      };
      const studentB = {
        courseCode: 'CS50',
        topics: ['python', 'web', 'sql'],
        timeSlots: ['mon_morning', 'fri_evening'],
        learningPreferences: ['hands_on', 'discussion'],
      };

      const firstRun = calculateStudyCompatibility(studentA, studentB);
      for (let i = 0; i < 5; i++) {
        const nextRun = calculateStudyCompatibility(studentA, studentB);
        assert.deepEqual(nextRun, firstRun);
      }
    });

    it('is order-independent for symmetrical peer matches', () => {
      const studentA = {
        courseCode: 'BIO101',
        topics: ['genetics', 'ecology'],
        timeSlots: ['mon_morning'],
        learningPreferences: ['visual'],
      };
      const studentB = {
        courseCode: 'BIO101',
        topics: ['genetics', 'cellular'],
        timeSlots: ['mon_morning'],
        learningPreferences: ['visual'],
      };

      const runAB = calculateStudyCompatibility(studentA, studentB);
      const runBA = calculateStudyCompatibility(studentB, studentA);
      assert.equal(runAB.score, runBA.score);
      assert.deepEqual(runAB.factors, runBA.factors);
    });
  });

  // ==========================================================================
  // Scenario 20: Reasons contain only claims supported by the input
  // ==========================================================================
  describe('20. Reasons contain only claims supported by the input', () => {
    it('only derives explainability statements from actual provided data fields', () => {
      const project = {
        requiredSkills: [{ name: 'Go', minLevel: 3 }],
        timeSlots: ['tue_evening'],
        goals: ['microservices'],
        timeline: 'flexible',
        workingStyle: 'mixed',
      };
      const student = {
        skills: [{ name: 'Go', level: 3 }],
        timeSlots: ['tue_evening'],
        goals: ['microservices'],
        timeline: 'flexible',
        workingStyle: 'mixed',
      };

      const res = calculateProjectCompatibility(project, student);
      for (const reason of res.reasons) {
        assert.ok(typeof reason === 'string' && reason.length > 5);
        // Ensure no generic hallucinated platitudes
        assert.ok(!reason.toLowerCase().includes('you are highly compatible'));
        assert.ok(!reason.toLowerCase().includes('perfect match made in heaven'));
      }

      // Check input-grounded terms
      assert.ok(res.reasons.some((r) => r.includes('Go')));
      assert.ok(res.reasons.some((r) => r.includes('Tuesday evening')));
      assert.ok(res.reasons.some((r) => r.includes('flexible')));
    });

    it('faithfully describes deficits and gaps when score is low', () => {
      const studentA = {
        offeredSkills: [{ name: 'Swift', level: 3 }],
        desiredSkills: [{ name: 'Rust', targetLevel: 4 }],
        timeSlots: ['sat_morning'],
        weeklyHours: 2,
      };
      const studentB = {
        offeredSkills: [{ name: 'Java', level: 3 }],
        desiredSkills: [{ name: 'Kotlin', targetLevel: 4 }],
        timeSlots: ['sun_evening'],
        weeklyHours: 10,
      };

      const res = calculateSkillSwapCompatibility(studentA, studentB);
      assert.ok(res.score < 20);
      assert.ok(res.reasons.some((r) => r.includes('No reciprocal skill matches found')));
      assert.ok(res.reasons.some((r) => r.includes('No shared available time slots')));
      assert.ok(res.reasons.some((r) => r.includes('2h/week vs 10h/week')));
    });
  });

  // ==========================================================================
  // Report Examples: Exact Documented Calculations
  // ==========================================================================
  describe('Documented Report Examples - Exact Computations', () => {
    it('executes documented Project Compatibility example and yields exactly 72', () => {
      const project = {
        requiredSkills: [{ name: 'React', minLevel: 4 }, { name: 'Node.js', minLevel: 3 }],
        timeSlots: ['mon_morning', 'tue_evening'],
        goals: ['portfolio', 'hackathon'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const student = {
        skills: [{ name: 'React', level: 2 }, { name: 'Node.js', level: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['portfolio'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const result = calculateProjectCompatibility(project, student);
      assert.equal(result.status, 'calculated');

      const skills = result.factors.find((f) => f.name === 'skills_alignment');
      const schedule = result.factors.find((f) => f.name === 'schedule_overlap');
      const goals = result.factors.find((f) => f.name === 'goals_urgency');
      const style = result.factors.find((f) => f.name === 'working_style');

      assert.equal(skills.score, 75);
      assert.equal(schedule.score, 50);
      assert.equal(goals.score, 70);
      assert.equal(style.score, 100);

      // (75 * 0.40) + (50 * 0.25) + (70 * 0.20) + (100 * 0.15) = 30 + 12.5 + 14 + 15 = 71.5 -> 72
      assert.equal(result.score, 72);
    });

    it('executes documented Study Compatibility example and yields exactly 56', () => {
      const studentA = {
        courseCode: 'CS101',
        topics: ['data_structures', 'algorithms'],
        timeSlots: ['mon_morning', 'thu_afternoon'],
        learningPreferences: ['problem_solving', 'discussion'],
      };

      const studentB = {
        courseCode: 'cs101',
        topics: ['algorithms', 'web_dev'],
        timeSlots: ['mon_morning', 'fri_evening'],
        learningPreferences: ['problem_solving'],
      };

      const result = calculateStudyCompatibility(studentA, studentB);
      assert.equal(result.status, 'calculated');

      const courseSubject = result.factors.find((f) => f.name === 'course_subject_overlap');
      const availability = result.factors.find((f) => f.name === 'shared_availability');
      const preferences = result.factors.find((f) => f.name === 'learning_preferences');

      assert.equal(courseSubject.score, 80);
      assert.equal(availability.score, 33);
      assert.equal(preferences.score, 50);

      // (80 * 0.40) + (33 * 0.35) + (50 * 0.25) = 32 + 11.55 + 12.5 = 56.05 -> 56
      assert.equal(result.score, 56);
    });

    it('executes documented SkillSwap Compatibility example and yields exactly 89', () => {
      const swapA = {
        offeredSkills: [{ name: 'Python', level: 4 }],
        desiredSkills: [{ name: 'Figma', targetLevel: 3 }],
        timeSlots: ['mon_morning', 'wed_evening'],
        weeklyHours: 4,
      };

      const swapB = {
        offeredSkills: [{ name: 'Figma', level: 4 }],
        desiredSkills: [{ name: 'Python', targetLevel: 4 }],
        timeSlots: ['mon_morning', 'fri_afternoon'],
        weeklyHours: 6,
      };

      const result = calculateSkillSwapCompatibility(swapA, swapB);
      assert.equal(result.status, 'calculated');

      const reciprocal = result.factors.find((f) => f.name === 'reciprocal_skills');
      const depth = result.factors.find((f) => f.name === 'skill_depth');
      const cadence = result.factors.find((f) => f.name === 'availability_cadence');

      assert.equal(reciprocal.score, 100);
      assert.equal(depth.score, 100);
      assert.equal(cadence.score, 43);

      // (100 * 0.60) + (100 * 0.20) + (43 * 0.20) = 60 + 20 + 8.6 = 88.6 -> 89
      assert.equal(result.score, 89);
    });
  });

  // ==========================================================================
  // Edge Cases: Empty-List & Undefined-Denominator Scoring
  // ==========================================================================
  describe('Empty-List & Undefined-Denominator Scoring Integrity', () => {
    it('scores 0 for project skills alignment when project.requiredSkills is empty array', () => {
      const project = {
        requiredSkills: [], // Empty declared requirements
        timeSlots: ['mon_morning'],
        goals: ['app'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };
      const student = {
        skills: [{ name: 'React', level: 4 }],
        timeSlots: ['mon_morning'],
        goals: ['app'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const res = calculateProjectCompatibility(project, student);
      assert.equal(res.status, 'calculated');
      const factor = res.factors.find((f) => f.name === 'skills_alignment');
      assert.equal(factor.score, 0); // Must NOT earn an artificial 100
      assert.ok(res.reasons.some((r) => r.includes('no declared skill requirements')));
    });

    it('scores 0 for project schedule overlap when project.timeSlots is empty array', () => {
      const project = {
        requiredSkills: [{ name: 'Python', minLevel: 3 }],
        timeSlots: [], // Empty declared schedule
        goals: ['app'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };
      const student = {
        skills: [{ name: 'Python', level: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['app'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const res = calculateProjectCompatibility(project, student);
      assert.equal(res.status, 'calculated');
      const factor = res.factors.find((f) => f.name === 'schedule_overlap');
      assert.equal(factor.score, 0); // Must NOT earn an artificial 100
      assert.ok(res.reasons.some((r) => r.includes('no declared time slots')));
    });

    it('scores 0 for project skills alignment when student.skills is empty array', () => {
      const project = {
        requiredSkills: [{ name: 'Python', minLevel: 3 }],
        timeSlots: ['mon_morning'],
        goals: ['app'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };
      const student = {
        skills: [], // Student has no skills declared
        timeSlots: ['mon_morning'],
        goals: ['app'],
        timeline: 'short_term',
        workingStyle: 'synchronous',
      };

      const res = calculateProjectCompatibility(project, student);
      assert.equal(res.status, 'calculated');
      const factor = res.factors.find((f) => f.name === 'skills_alignment');
      assert.equal(factor.score, 0);
      assert.ok(res.reasons.some((r) => r.includes('no declared skills to match')));
    });

    it('scores 0 for study availability and preferences when lists are empty arrays', () => {
      const studentA = {
        courseCode: 'CS101',
        topics: [],
        timeSlots: [],
        learningPreferences: [],
      };
      const studentB = {
        courseCode: 'CS101',
        topics: [],
        timeSlots: [],
        learningPreferences: [],
      };

      const res = calculateStudyCompatibility(studentA, studentB);
      assert.equal(res.status, 'calculated');

      const courseFactor = res.factors.find((f) => f.name === 'course_subject_overlap');
      const availFactor = res.factors.find((f) => f.name === 'shared_availability');
      const prefsFactor = res.factors.find((f) => f.name === 'learning_preferences');

      // Course code matched (100 * 0.7 = 70), topics empty (0 * 0.3 = 0) -> 70
      assert.equal(courseFactor.score, 70);
      assert.equal(availFactor.score, 0);
      assert.equal(prefsFactor.score, 0);

      // (70 * 0.40) + (0 * 0.35) + (0 * 0.25) = 28
      assert.equal(res.score, 28);
    });

    it('scores 0 for SkillSwap reciprocal and depth when desiredSkills are empty in both directions', () => {
      const studentA = {
        offeredSkills: [{ name: 'Python', level: 4 }],
        desiredSkills: [], // No requested skills
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
      };
      const studentB = {
        offeredSkills: [{ name: 'React', level: 4 }],
        desiredSkills: [], // No requested skills
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
      };

      const res = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(res.status, 'calculated');

      const reciprocal = res.factors.find((f) => f.name === 'reciprocal_skills');
      const depth = res.factors.find((f) => f.name === 'skill_depth');
      const cadence = res.factors.find((f) => f.name === 'availability_cadence');

      assert.equal(reciprocal.score, 0);
      assert.equal(depth.score, 0);
      assert.equal(cadence.score, 100);

      // (0 * 0.60) + (0 * 0.20) + (100 * 0.20) = 20
      assert.equal(res.score, 20);
      assert.ok(res.reasons.some((r) => r.includes('Neither student declared skills they desire to learn')));
    });

    it('scores 0 for SkillSwap when offeredSkills are empty in both directions', () => {
      const studentA = {
        offeredSkills: [],
        desiredSkills: [{ name: 'React', targetLevel: 3 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
      };
      const studentB = {
        offeredSkills: [],
        desiredSkills: [{ name: 'Python', targetLevel: 3 }],
        timeSlots: ['mon_morning'],
        weeklyHours: 5,
      };

      const res = calculateSkillSwapCompatibility(studentA, studentB);
      assert.equal(res.status, 'calculated');
      const reciprocal = res.factors.find((f) => f.name === 'reciprocal_skills');
      const depth = res.factors.find((f) => f.name === 'skill_depth');
      assert.equal(reciprocal.score, 0);
      assert.equal(depth.score, 0);
    });

    it('strictly distinguishes explicit empty arrays (calculated 0) from missing fields (insufficient_data)', () => {
      // Explicit empty arrays: valid calculated score
      const validEmptyProject = {
        requiredSkills: [],
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
        workingStyle: 'synchronous',
      };
      const validEmptyStudent = {
        skills: [],
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
        workingStyle: 'synchronous',
      };
      const validRes = calculateProjectCompatibility(validEmptyProject, validEmptyStudent);
      assert.equal(validRes.status, 'calculated');
      assert.equal(typeof validRes.score, 'number');

      // Missing field (undefined): insufficient_data
      const invalidProject = {
        // requiredSkills missing
        timeSlots: [],
        goals: [],
        timeline: 'flexible',
        workingStyle: 'synchronous',
      };
      const invalidRes = calculateProjectCompatibility(invalidProject, validEmptyStudent);
      assert.equal(invalidRes.status, 'insufficient_data');
      assert.equal(invalidRes.score, null);
      assert.deepEqual(invalidRes.factors, []);
    });
  });
});
