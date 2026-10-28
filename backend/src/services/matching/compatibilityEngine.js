/**
 * @file SkillSync Deterministic & Explainable Compatibility Scoring Engine
 * @module backend/src/services/matching/compatibilityEngine
 *
 * Implements pure-JavaScript compatibility scoring and reason generation for:
 * 1. Project Compatibility (Weights: Skills 30%, Goals 20%, Experience 15%, Academic Relevance 15%, Availability 10%, Learning Style 10%)
 * 2. Study Buddy Compatibility (Weights: Subject/Course 30%, Learning Style 25%, Schedule 20%, Academic Level 15%, Goals 10%)
 * 3. SkillSwap Compatibility (Weights: Reciprocal Teach/Want 40%, Skill Level 20%, Goals 15%, Availability 15%, Learning Style 10%)
 *
 * Strict Principles:
 * - Deterministic, pure functions (no side effects, no random values, no LLMs, no network or DB calls).
 * - All factor scores and overall scores range from 0 to 100 (clamped and rounded to integers).
 * - Complete results have factor weights totaling exactly 100%.
 * - Rounding Rule: Each factor score is rounded to an integer (0-100) first; the final overall score
 *   is calculated directly from these rounded factor scores multiplied by their weights.
 * - Explicit empty sets (e.g. `[]`) declare zero matching items and earn 0 for overlap/alignment factors.
 *   Empty requirements lists never earn an artificial 100.
 * - Missing, null, or malformed inputs return `{ status: 'insufficient_data', score: null, factors: [], reasons: [...] }`.
 * - Explainable reasons are grounded strictly in the provided inputs.
 */

// ============================================================================
// CONSTANTS & RECOGNIZED VALUES
// ============================================================================

export const WORKING_STYLES = Object.freeze(['synchronous', 'asynchronous', 'mixed']);

export const LEARNING_STYLES = Object.freeze([
  'visual',
  'reading',
  'hands_on',
  'discussion',
  'mixed',
]);

export const GRADE_SCALES = Object.freeze(['percentage', 'gpa_10', 'gpa_4']);

export const GRADE_SCALE_BOUNDS = Object.freeze({
  percentage: { min: 0, max: 100 },
  gpa_10: { min: 0, max: 10 },
  gpa_4: { min: 0, max: 4 },
});

export const PROJECT_FACTOR_WEIGHTS = Object.freeze({
  SKILLS_ALIGNMENT: 30,
  GOALS_ALIGNMENT: 20,
  PROJECT_EXPERIENCE: 15,
  ACADEMIC_RELEVANCE: 15,
  AVAILABILITY: 10,
  LEARNING_STYLE: 10,
  // Backward compatibility alias keys
  SCHEDULE_OVERLAP: 10,
  GOALS_URGENCY: 20,
  WORKING_STYLE: 10,
});

export const STUDY_FACTOR_WEIGHTS = Object.freeze({
  SUBJECT_COURSE_OVERLAP: 30,
  LEARNING_STYLE: 25,
  SHARED_SCHEDULE: 20,
  ACADEMIC_LEVEL: 15,
  GOALS_ALIGNMENT: 10,
  // Backward compatibility alias keys
  COURSE_SUBJECT_OVERLAP: 30,
  SHARED_AVAILABILITY: 20,
  LEARNING_PREFERENCES: 25,
});

export const SKILLSWAP_FACTOR_WEIGHTS = Object.freeze({
  RECIPROCAL_TEACH_WANT: 40,
  SKILL_LEVEL: 20,
  GOALS_ALIGNMENT: 15,
  AVAILABILITY: 15,
  LEARNING_STYLE: 10,
  // Backward compatibility alias keys
  RECIPROCAL_SKILLS: 40,
  SKILL_DEPTH: 20,
  AVAILABILITY_CADENCE: 15,
});

const HUMAN_TIME_SLOT_LABELS = Object.freeze({
  mon_morning: 'Monday morning',
  mon_afternoon: 'Monday afternoon',
  mon_evening: 'Monday evening',
  tue_morning: 'Tuesday morning',
  tue_afternoon: 'Tuesday afternoon',
  tue_evening: 'Tuesday evening',
  wed_morning: 'Wednesday morning',
  wed_afternoon: 'Wednesday afternoon',
  wed_evening: 'Wednesday evening',
  thu_morning: 'Thursday morning',
  thu_afternoon: 'Thursday afternoon',
  thu_evening: 'Thursday evening',
  fri_morning: 'Friday morning',
  fri_afternoon: 'Friday afternoon',
  fri_evening: 'Friday evening',
  sat_morning: 'Saturday morning',
  sat_afternoon: 'Saturday afternoon',
  sat_evening: 'Saturday evening',
  sun_morning: 'Sunday morning',
  sun_afternoon: 'Sunday afternoon',
  sun_evening: 'Sunday evening',
});

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

/**
 * Normalizes a plain string by trimming surrounding whitespace and converting to lowercase.
 * @param {*} value
 * @returns {string}
 */
export function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

/**
 * Normalizes academic course codes by trimming, upper-casing, and collapsing whitespace.
 * @param {*} code
 * @returns {string}
 */
export function normalizeCourseCode(code) {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes a time-slot identifier (e.g. " Tue_Evening " -> "tue_evening").
 * @param {*} slot
 * @returns {string}
 */
export function normalizeSlot(slot) {
  return normalizeString(slot).replace(/[\s-]+/g, '_');
}

/**
 * Formats a slot identifier into a human-friendly string for explainability.
 * @param {string} slot
 * @returns {string}
 */
export function formatSlot(slot) {
  const norm = normalizeSlot(slot);
  return HUMAN_TIME_SLOT_LABELS[norm] || (typeof slot === 'string' ? slot.trim() : '');
}

/**
 * Calculates Jaccard similarity between two string arrays: |A ∩ B| / |A ∪ B| * 100.
 * If either or both arrays are empty, returns 0 (explicit empty sets declare no matching items).
 * @param {string[]} arrayA
 * @param {string[]} arrayB
 * @returns {number} Score from 0 to 100.
 */
export function jaccardSimilarity(arrayA, arrayB) {
  const setA = new Set((Array.isArray(arrayA) ? arrayA : []).map(normalizeString).filter(Boolean));
  const setB = new Set((Array.isArray(arrayB) ? arrayB : []).map(normalizeString).filter(Boolean));

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }

  const unionSize = new Set([...setA, ...setB]).size;
  if (unionSize === 0) return 0;

  return (intersectionCount / unionSize) * 100;
}

/**
 * Clamps a numerical score to the integer range [0, 100].
 * @param {number} score
 * @returns {number}
 */
export function clampScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// ACADEMIC PERFORMANCE HELPERS
// ============================================================================

/**
 * Validates self-reported academic performance against its declared scale.
 * Academic performance is strictly optional: null or undefined returns true.
 * @param {*} perf
 * @returns {boolean}
 */
export function isValidAcademicPerformance(perf) {
  if (perf === null || perf === undefined) return true;
  if (typeof perf !== 'object' || Array.isArray(perf)) return false;
  if (!perf.scale || !GRADE_SCALES.includes(perf.scale)) return false;
  const val = perf.score ?? perf.gpa ?? perf.marks;
  if (typeof val !== 'number' || !Number.isFinite(val)) return false;
  const bounds = GRADE_SCALE_BOUNDS[perf.scale];
  return val >= bounds.min && val <= bounds.max;
}

/**
 * Compares two academic performance objects safely.
 * Never silently converts or compares incompatible scales.
 * @param {*} perfA
 * @param {*} perfB
 * @returns {{ comparable: boolean, reason?: string, diff?: number }}
 */
export function compareAcademicPerformance(perfA, perfB) {
  if (!perfA || !perfB) {
    return { comparable: false, reason: 'optional_missing' };
  }
  if (!perfA.scale || !perfB.scale) {
    return { comparable: false, reason: 'scale_missing' };
  }
  if (perfA.scale !== perfB.scale) {
    return { comparable: false, reason: 'incompatible_scales' };
  }
  const valA = perfA.score ?? perfA.gpa ?? perfA.marks;
  const valB = perfB.score ?? perfB.gpa ?? perfB.marks;
  if (typeof valA !== 'number' || typeof valB !== 'number') {
    return { comparable: false, reason: 'invalid_values' };
  }
  return {
    comparable: true,
    scale: perfA.scale,
    diff: Math.abs(valA - valB),
  };
}

// ============================================================================
// RESULT BUILDERS
// ============================================================================

/**
 * @typedef {Object} CompatibilityFactor
 * @property {string} name - Programmatic factor key
 * @property {string} label - Human-readable factor label
 * @property {number} weight - Factor weight percentage (summing to 100)
 * @property {number} score - Integer factor score (0-100)
 */

/**
 * @typedef {Object} CompatibilityResult
 * @property {'calculated'|'insufficient_data'} status
 * @property {number|null} score - Overall score (0-100) or null
 * @property {CompatibilityFactor[]} factors
 * @property {string[]} reasons - Input-grounded explainability statements
 */

/**
 * Constructs an insufficient data response.
 * @param {string[]} errorReasons
 * @returns {CompatibilityResult}
 */
function insufficientDataResult(errorReasons) {
  return {
    status: 'insufficient_data',
    score: null,
    factors: [],
    reasons: errorReasons.length > 0 ? errorReasons : ['Insufficient input data to compute compatibility score.'],
  };
}

/**
 * Constructs a calculated compatibility result.
 * Aggregation Rule:
 * Each factor score in `factors` is an integer in [0, 100].
 * The final overall score is computed directly as the integer-rounded weighted sum of these factor scores.
 * @param {CompatibilityFactor[]} factors
 * @param {string[]} reasons
 * @returns {CompatibilityResult}
 */
function calculatedResult(factors, reasons) {
  const totalScore = clampScore(
    factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0)
  );

  return {
    status: 'calculated',
    score: totalScore,
    factors,
    reasons,
  };
}

// ============================================================================
// INPUT VALIDATION UTILITIES
// ============================================================================

/**
 * Checks if a value is a valid non-null plain object.
 * @param {*} obj
 * @returns {boolean}
 */
function isPlainObject(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/**
 * Validates a skill requirement object `{ name: string, minLevel: 1..5 }`.
 * @param {*} skill
 * @returns {boolean}
 */
function isValidRequiredSkill(skill) {
  return (
    isPlainObject(skill) &&
    typeof skill.name === 'string' &&
    skill.name.trim().length > 0 &&
    Number.isInteger(skill.minLevel) &&
    skill.minLevel >= 1 &&
    skill.minLevel <= 5
  );
}

/**
 * Validates a declared student skill object `{ name: string, level: 1..5 }`.
 * @param {*} skill
 * @returns {boolean}
 */
function isValidStudentSkill(skill) {
  return (
    isPlainObject(skill) &&
    typeof skill.name === 'string' &&
    skill.name.trim().length > 0 &&
    Number.isInteger(skill.level) &&
    skill.level >= 1 &&
    skill.level <= 5
  );
}

/**
 * Validates a desired skill object `{ name: string, targetLevel: 1..5 }` (also accepts minLevel/level).
 * @param {*} skill
 * @returns {boolean}
 */
function isValidDesiredSkill(skill) {
  if (!isPlainObject(skill) || typeof skill.name !== 'string' || skill.name.trim().length === 0) {
    return false;
  }
  const target = skill.targetLevel ?? skill.minLevel ?? skill.level;
  return Number.isInteger(target) && target >= 1 && target <= 5;
}

/**
 * Checks if value is an array of non-empty strings.
 * @param {*} arr
 * @returns {boolean}
 */
function isStringArray(arr) {
  return Array.isArray(arr) && arr.every((item) => typeof item === 'string');
}

/**
 * Checks if working style is one of 'synchronous', 'asynchronous', 'mixed'.
 * @param {*} style
 * @returns {boolean}
 */
function isValidWorkingStyle(style) {
  return typeof style === 'string' && WORKING_STYLES.includes(normalizeString(style));
}

/**
 * Checks if learning style is one of the recognized LEARNING_STYLES.
 * @param {*} style
 * @returns {boolean}
 */
function isValidLearningStyle(style) {
  return typeof style === 'string' && LEARNING_STYLES.includes(normalizeString(style));
}

// ============================================================================
// 1. PROJECT COMPATIBILITY ENGINE (6 Factors, 100%)
// ============================================================================

/**
 * Validates input structures for Project Compatibility.
 * @param {*} project
 * @param {*} student
 * @returns {string[]} List of validation error messages.
 */
function validateProjectInput(project, student) {
  const errors = [];

  if (!isPlainObject(project)) {
    errors.push('Project must be a valid non-null object.');
    return errors;
  }
  if (!isPlainObject(student)) {
    errors.push('Student must be a valid non-null object.');
    return errors;
  }

  // Project required skills
  if (!Array.isArray(project.requiredSkills)) {
    errors.push('project.requiredSkills must be an array.');
  } else if (!project.requiredSkills.every(isValidRequiredSkill)) {
    errors.push('Each skill in project.requiredSkills must have a non-empty name and integer minLevel (1-5).');
  }

  // Project schedule slots
  if (!isStringArray(project.timeSlots)) {
    errors.push('project.timeSlots must be an array of string slot identifiers.');
  }

  // Project goals
  if (!isStringArray(project.goals)) {
    errors.push('project.goals must be an array of string tags.');
  }

  // Project timeline
  if (typeof project.timeline !== 'string' || project.timeline.trim().length === 0) {
    errors.push('project.timeline must be a non-empty string.');
  }

  // Student skills
  if (!Array.isArray(student.skills)) {
    errors.push('student.skills must be an array.');
  } else if (!student.skills.every(isValidStudentSkill)) {
    errors.push('Each skill in student.skills must have a non-empty name and integer level (1-5).');
  }

  // Student schedule slots
  if (!isStringArray(student.timeSlots)) {
    errors.push('student.timeSlots must be an array of string slot identifiers.');
  }

  // Student goals
  if (!isStringArray(student.goals)) {
    errors.push('student.goals must be an array of string tags.');
  }

  // Student timeline
  if (typeof student.timeline !== 'string' || student.timeline.trim().length === 0) {
    errors.push('student.timeline must be a non-empty string.');
  }

  // Student learning style (optional in legacy payloads, but validated if present)
  if (student.learningStyle !== undefined && student.learningStyle !== null && !isValidLearningStyle(student.learningStyle)) {
    errors.push(`student.learningStyle must be one of: ${LEARNING_STYLES.join(', ')}.`);
  }

  // Academic performance validation if provided
  if (student.academicPerformance && !isValidAcademicPerformance(student.academicPerformance)) {
    errors.push('student.academicPerformance is invalid for its declared scale.');
  }

  return errors;
}

/**
 * Calculates Project Compatibility between a project requirement set and a student candidate profile.
 *
 * Factors & Exact Weights (Sum: 100%):
 * 1. Skills alignment: 30%
 * 2. Goals alignment: 20%
 * 3. Relevant project experience: 15%
 * 4. Academic relevance: 15%
 * 5. Availability compatibility: 10%
 * 6. Learning-style compatibility: 10%
 *
 * Empty Sets Rule:
 * - Empty requiredSkills (`[]`) earns 0 (not 100).
 * - Empty project timeSlots (`[]`) earns 0 (not 100).
 * - Empty goals (`[]`) earns 0 similarity.
 * - Empty previousProjects (`[]`) earns 0 experience.
 *
 * Academic Relevance Rule:
 * - When project declares no academic restrictions, does not penalize candidate.
 * - Missing academic performance/marks is never scored as zero.
 *
 * @param {Object} project
 * @param {Object} student
 * @returns {CompatibilityResult}
 */
export function calculateProjectCompatibility(project, student) {
  const errors = validateProjectInput(project, student);
  if (errors.length > 0) {
    return insufficientDataResult(errors);
  }

  // --------------------------------------------------------------------------
  // 1. Skills Alignment (30%)
  // --------------------------------------------------------------------------
  const studentSkillMap = new Map();
  for (const sk of student.skills) {
    studentSkillMap.set(normalizeString(sk.name), sk.level);
  }

  const reqSkills = project.requiredSkills;
  let skillsScore = 0;
  const matchedSkills = [];
  const missingSkills = [];
  const partialSkills = [];

  if (reqSkills.length > 0 && student.skills.length > 0) {
    const scores = reqSkills.map((req) => {
      const normName = normalizeString(req.name);
      const studentLevel = studentSkillMap.get(normName);

      if (studentLevel === undefined) {
        missingSkills.push(req.name);
        return 0;
      }

      matchedSkills.push(req.name);
      if (studentLevel >= req.minLevel) {
        return 100;
      }

      partialSkills.push(`${req.name} (level ${studentLevel}/${req.minLevel})`);
      return Math.min(100, (studentLevel / req.minLevel) * 100);
    });

    const sum = scores.reduce((acc, val) => acc + val, 0);
    skillsScore = clampScore(sum / scores.length);
  } else if (reqSkills.length > 0 && student.skills.length === 0) {
    missingSkills.push(...reqSkills.map((r) => r.name));
    skillsScore = 0;
  } else {
    skillsScore = 0;
  }

  // --------------------------------------------------------------------------
  // 2. Goals Alignment (20%)
  // --------------------------------------------------------------------------
  const goalSimilarity = jaccardSimilarity(project.goals, student.goals);

  const pTimeline = normalizeString(project.timeline);
  const sTimeline = normalizeString(student.timeline);

  let timelineScore = 35;
  if (pTimeline === sTimeline) {
    timelineScore = 100;
  } else if (pTimeline === 'flexible' || sTimeline === 'flexible') {
    timelineScore = 75;
  }

  const goalsScore = clampScore(0.6 * goalSimilarity + 0.4 * timelineScore);

  // --------------------------------------------------------------------------
  // 3. Relevant Project Experience (15%)
  // --------------------------------------------------------------------------
  let experienceScore = 0;
  const previousProjects = Array.isArray(student.previousProjects) ? student.previousProjects : [];
  const matchedExpSkills = [];

  if (previousProjects.length > 0) {
    const prevSkillsSet = new Set(
      previousProjects
        .flatMap((p) => (Array.isArray(p.skills) ? p.skills : []))
        .map(normalizeString)
        .filter(Boolean)
    );
    const prevDomainsSet = new Set(
      previousProjects
        .flatMap((p) => {
          if (Array.isArray(p.domain)) return p.domain;
          if (typeof p.domain === 'string') return [p.domain];
          return [];
        })
        .map(normalizeString)
        .filter(Boolean)
    );

    for (const req of reqSkills) {
      if (prevSkillsSet.has(normalizeString(req.name))) {
        matchedExpSkills.push(req.name);
      }
    }

    const domainMatches = (project.goals || []).filter((g) =>
      prevDomainsSet.has(normalizeString(g))
    );

    if (reqSkills.length > 0) {
      const skillExpRatio = (matchedExpSkills.length / reqSkills.length) * 100;
      if (matchedExpSkills.length === reqSkills.length) {
        experienceScore = 100;
      } else if (matchedExpSkills.length > 0) {
        experienceScore = clampScore(0.7 * skillExpRatio + (domainMatches.length > 0 ? 30 : 20));
      } else if (domainMatches.length > 0) {
        experienceScore = 50;
      } else {
        experienceScore = 35;
      }
    } else {
      experienceScore = 50;
    }
  } else {
    // Explicit empty or undeclared past projects
    experienceScore = 0;
  }

  // --------------------------------------------------------------------------
  // 4. Academic Relevance (15%)
  // --------------------------------------------------------------------------
  let academicScore = 0;
  let academicExplanation = '';
  const acadBg = student.academicBackground;
  const projectSubjects = Array.isArray(project.relevantSubjects) ? project.relevantSubjects : [];

  if (projectSubjects.length > 0) {
    const studentSubjects = Array.isArray(acadBg?.relevantSubjects) ? acadBg.relevantSubjects : [];
    const subjSim = jaccardSimilarity(projectSubjects, studentSubjects);
    academicScore = clampScore(subjSim);
    academicExplanation =
      subjSim > 0
        ? `Academic coursework aligns with project focus (${Math.round(subjSim)}% subject match).`
        : 'Candidate subjects do not match project required subjects.';
  } else {
    // Project has no specific subject restrictions: evaluate declared academic background without penalizing
    if (acadBg && (acadBg.degree || acadBg.branch || (acadBg.relevantSubjects && acadBg.relevantSubjects.length > 0))) {
      const studentSubjects = (acadBg.relevantSubjects || []).map(normalizeString);
      const directMatch = reqSkills.some((req) => studentSubjects.includes(normalizeString(req.name)));
      if (directMatch) {
        academicScore = 100;
        academicExplanation = `Candidate coursework (${acadBg.relevantSubjects.join(', ')}) directly backs project technical requirements.`;
      } else {
        academicScore = 80;
        academicExplanation = `Project declares no restrictive academic prerequisites; candidate's background (${[acadBg.degree, acadBg.branch].filter(Boolean).join(' - ') || 'declared'}) is compatible.`;
      }
    } else {
      // Neither project nor candidate declared specific academic filters: neutral baseline
      academicScore = 70;
      academicExplanation = 'Project has no restrictive academic prerequisites (neutral fit).';
    }
  }

  // --------------------------------------------------------------------------
  // 5. Availability Compatibility (10%)
  // --------------------------------------------------------------------------
  const studentSlots = new Set(student.timeSlots.map(normalizeSlot));
  const projectSlots = project.timeSlots.map(normalizeSlot);

  let availabilityScore = 0;
  const coveredSlots = [];

  if (projectSlots.length > 0 && studentSlots.size > 0) {
    for (const slot of projectSlots) {
      if (studentSlots.has(slot)) {
        coveredSlots.push(slot);
      }
    }
    availabilityScore = clampScore((coveredSlots.length / projectSlots.length) * 100);
  }

  // --------------------------------------------------------------------------
  // 6. Learning-Style Compatibility (10%)
  // --------------------------------------------------------------------------
  // Must use candidate's learning-style data, not project's working-style
  const sLearning = normalizeString(student.learningStyle);
  const pLearning = normalizeString(project.learningStyle || project.preferredLearningStyle);

  let learningScore = 75;
  let learningExplanation = '';

  if (pLearning && sLearning) {
    if (pLearning === sLearning) {
      learningScore = 100;
      learningExplanation = `Both project team and candidate align on a ${sLearning.replace(/_/g, ' ')} collaboration approach.`;
    } else if (pLearning === 'mixed' || sLearning === 'mixed') {
      learningScore = 75;
      learningExplanation = `Flexible learning-style match between project (${pLearning.replace(/_/g, ' ')}) and candidate (${sLearning.replace(/_/g, ' ')}).`;
    } else {
      learningScore = 40;
      learningExplanation = `Learning-style divergence: project prefers ${pLearning.replace(/_/g, ' ')} while candidate prefers ${sLearning.replace(/_/g, ' ')}.`;
    }
  } else if (sLearning) {
    learningScore = 100;
    learningExplanation = `Project accommodates candidate's declared ${sLearning.replace(/_/g, ' ')} learning and collaboration style.`;
  } else {
    // Neither declared specific learning style: neutral
    learningScore = 70;
    learningExplanation = 'Standard collaboration style fit (no restrictive learning preference specified).';
  }

  // --------------------------------------------------------------------------
  // Factors Assembly (Weights sum to exactly 100%)
  // --------------------------------------------------------------------------
  const factors = [
    {
      name: 'skills_alignment',
      label: 'Skills Alignment',
      weight: PROJECT_FACTOR_WEIGHTS.SKILLS_ALIGNMENT,
      score: skillsScore,
    },
    {
      name: 'goals_alignment',
      label: 'Goals Alignment',
      weight: PROJECT_FACTOR_WEIGHTS.GOALS_ALIGNMENT,
      score: goalsScore,
    },
    {
      name: 'project_experience',
      label: 'Relevant Project Experience',
      weight: PROJECT_FACTOR_WEIGHTS.PROJECT_EXPERIENCE,
      score: experienceScore,
    },
    {
      name: 'academic_relevance',
      label: 'Academic Relevance',
      weight: PROJECT_FACTOR_WEIGHTS.ACADEMIC_RELEVANCE,
      score: academicScore,
    },
    {
      name: 'availability_compatibility',
      label: 'Availability Compatibility',
      weight: PROJECT_FACTOR_WEIGHTS.AVAILABILITY,
      score: availabilityScore,
    },
    {
      name: 'learning_style_compatibility',
      label: 'Learning-Style Compatibility',
      weight: PROJECT_FACTOR_WEIGHTS.LEARNING_STYLE,
      score: learningScore,
    },
  ];

  // --------------------------------------------------------------------------
  // Explainability Reasons
  // --------------------------------------------------------------------------
  const reasons = [];

  // 1. Skill Reason
  if (reqSkills.length === 0) {
    reasons.push('The project has no declared skill requirements (0% skill alignment).');
  } else if (student.skills.length === 0) {
    reasons.push(`You have no declared skills to match the project's ${reqSkills.length} required skills (${missingSkills.join(', ')}).`);
  } else if (matchedSkills.length === reqSkills.length) {
    if (partialSkills.length === 0) {
      reasons.push(`You cover all ${reqSkills.length} required skills at or above target proficiency (${matchedSkills.join(', ')}).`);
    } else {
      reasons.push(`You cover all ${reqSkills.length} required skills, with partial proficiency in ${partialSkills.join(', ')}.`);
    }
  } else if (matchedSkills.length > 0) {
    reasons.push(`You cover ${matchedSkills.length} of ${reqSkills.length} required skills (${matchedSkills.join(', ')}), missing ${missingSkills.join(', ')}.`);
  } else {
    reasons.push(`You do not currently match any of the project's ${reqSkills.length} required skills (${missingSkills.join(', ')}).`);
  }

  // 2. Goals & Timeline Reason
  const sharedGoals = project.goals.filter((g) =>
    student.goals.some((sg) => normalizeString(sg) === normalizeString(g))
  );

  let timelineText = '';
  if (pTimeline === sTimeline) {
    timelineText = `Both sides align on a ${project.timeline.trim()} timeline.`;
  } else if (pTimeline === 'flexible' || sTimeline === 'flexible') {
    timelineText = `Flexible timeline allows coordination between ${project.timeline.trim()} and ${student.timeline.trim()}.`;
  } else {
    timelineText = `Timeline divergence: project expects ${project.timeline.trim()} while student prefers ${student.timeline.trim()}.`;
  }

  if (sharedGoals.length > 0) {
    reasons.push(`${timelineText} Shared goal focus: ${sharedGoals.join(', ')}.`);
  } else if (project.goals.length === 0 && student.goals.length === 0) {
    reasons.push(`${timelineText} Neither side declared specific project goals.`);
  } else {
    reasons.push(timelineText);
  }

  // 3. Project Experience Reason
  if (previousProjects.length === 0) {
    reasons.push('No previous project experience declared (0% relevant experience).');
  } else if (matchedExpSkills.length > 0) {
    reasons.push(`Previous project experience demonstrates practical application of ${matchedExpSkills.join(', ')}.`);
  } else {
    reasons.push(`Candidate has ${previousProjects.length} previous project(s), but without direct overlap with required skills.`);
  }

  // 4. Academic Relevance Reason
  if (academicExplanation) {
    reasons.push(academicExplanation);
  }

  // 5. Schedule Reason
  if (projectSlots.length === 0) {
    reasons.push('The project has no declared time slots (0% schedule overlap).');
  } else if (student.timeSlots.length === 0) {
    reasons.push('You have not declared any available time slots (0% schedule overlap).');
  } else if (coveredSlots.length > 0) {
    const slotNames = coveredSlots.map(formatSlot).join(', ');
    reasons.push(`You cover ${coveredSlots.length} of ${projectSlots.length} required time slots (${slotNames}).`);
  } else {
    reasons.push("You have no overlapping time slots with the project's required schedule.");
  }

  // 6. Learning-Style Reason
  if (learningExplanation) {
    reasons.push(learningExplanation);
  }

  return calculatedResult(factors, reasons);
}

// ============================================================================
// 2. STUDY BUDDY COMPATIBILITY ENGINE (5 Factors, 100%)
// ============================================================================

/**
 * Validates input structures for Study Buddy Compatibility.
 * @param {*} studentA
 * @param {*} studentB
 * @returns {string[]} List of validation errors.
 */
function validateStudyInput(studentA, studentB) {
  const errors = [];

  if (!isPlainObject(studentA)) {
    errors.push('studentA must be a valid non-null object.');
    return errors;
  }
  if (!isPlainObject(studentB)) {
    errors.push('studentB must be a valid non-null object.');
    return errors;
  }

  // Course codes
  if (typeof studentA.courseCode !== 'string' || studentA.courseCode.trim().length === 0) {
    errors.push('studentA.courseCode must be a non-empty string.');
  }
  if (typeof studentB.courseCode !== 'string' || studentB.courseCode.trim().length === 0) {
    errors.push('studentB.courseCode must be a non-empty string.');
  }

  // Topics
  if (!isStringArray(studentA.topics)) {
    errors.push('studentA.topics must be an array of string topic tags.');
  }
  if (!isStringArray(studentB.topics)) {
    errors.push('studentB.topics must be an array of string topic tags.');
  }

  // Time slots
  if (!isStringArray(studentA.timeSlots)) {
    errors.push('studentA.timeSlots must be an array of string slot identifiers.');
  }
  if (!isStringArray(studentB.timeSlots)) {
    errors.push('studentB.timeSlots must be an array of string slot identifiers.');
  }

  // Learning style validation if provided
  if (studentA.learningStyle !== undefined && studentA.learningStyle !== null && !isValidLearningStyle(studentA.learningStyle)) {
    errors.push(`studentA.learningStyle must be one of: ${LEARNING_STYLES.join(', ')}.`);
  }
  if (studentB.learningStyle !== undefined && studentB.learningStyle !== null && !isValidLearningStyle(studentB.learningStyle)) {
    errors.push(`studentB.learningStyle must be one of: ${LEARNING_STYLES.join(', ')}.`);
  }

  return errors;
}

/**
 * Calculates Study Buddy Compatibility between two study partners.
 *
 * Factors & Exact Weights (Sum: 100%):
 * 1. Subject/course overlap: 30%
 * 2. Learning-style compatibility: 25%
 * 3. Shared schedule: 20%
 * 4. Academic-level compatibility: 15%
 * 5. Goals alignment: 10%
 *
 * Empty Sets Rule:
 * - Empty topics (`[]`) earns 0 topic similarity.
 * - Empty timeSlots (`[]`) earns 0 schedule score.
 * - Empty goals (`[]`) earns 0 goals score.
 *
 * Academic Marks Rule:
 * - Marks are optional. Missing marks are never penalized.
 * - Mismatched grade scales are never silently converted or compared.
 *
 * @param {Object} studentA
 * @param {Object} studentB
 * @returns {CompatibilityResult}
 */
export function calculateStudyCompatibility(studentA, studentB) {
  const errors = validateStudyInput(studentA, studentB);
  if (errors.length > 0) {
    return insufficientDataResult(errors);
  }

  // --------------------------------------------------------------------------
  // 1. Subject/Course Overlap (30%)
  // --------------------------------------------------------------------------
  const normCodeA = normalizeCourseCode(studentA.courseCode);
  const normCodeB = normalizeCourseCode(studentB.courseCode);
  const isExactCourseMatch = normCodeA === normCodeB;
  const courseCodeScore = isExactCourseMatch ? 100 : 0;

  const topicSimilarity = jaccardSimilarity(studentA.topics, studentB.topics);
  const subjectCourseScore = clampScore(0.7 * courseCodeScore + 0.3 * topicSimilarity);

  // --------------------------------------------------------------------------
  // 2. Learning-Style Compatibility (25%)
  // --------------------------------------------------------------------------
  const styleA = normalizeString(studentA.learningStyle);
  const styleB = normalizeString(studentB.learningStyle);
  let styleScore = 50;

  if (styleA && styleB) {
    if (styleA === styleB) {
      styleScore = 100;
    } else if (styleA === 'mixed' || styleB === 'mixed') {
      styleScore = 75;
    } else {
      styleScore = 40;
    }
  } else if (styleA || styleB) {
    styleScore = 70;
  }

  // Factor in learningPreferences if available
  const prefsA = Array.isArray(studentA.learningPreferences) ? studentA.learningPreferences : [];
  const prefsB = Array.isArray(studentB.learningPreferences) ? studentB.learningPreferences : [];
  if (prefsA.length > 0 || prefsB.length > 0) {
    const prefSim = jaccardSimilarity(prefsA, prefsB);
    styleScore = clampScore(0.7 * styleScore + 0.3 * prefSim);
  } else {
    styleScore = clampScore(styleScore);
  }

  // --------------------------------------------------------------------------
  // 3. Shared Schedule (20%)
  // --------------------------------------------------------------------------
  const scheduleScore = clampScore(jaccardSimilarity(studentA.timeSlots, studentB.timeSlots));

  // --------------------------------------------------------------------------
  // 4. Academic-Level Compatibility (15%)
  // --------------------------------------------------------------------------
  const acadA = studentA.academicBackground || {};
  const acadB = studentB.academicBackground || {};
  const yearA = Number(acadA.yearOfStudy ?? studentA.yearOfStudy);
  const yearB = Number(acadB.yearOfStudy ?? studentB.yearOfStudy);

  let levelScore = 70;
  let academicLevelExplanation = '';

  if (Number.isInteger(yearA) && Number.isInteger(yearB) && yearA >= 1 && yearB >= 1) {
    const diff = Math.abs(yearA - yearB);
    if (diff === 0) {
      levelScore = 100;
      academicLevelExplanation = `Identical academic cohort (Year ${yearA} students).`;
    } else if (diff === 1) {
      levelScore = 80;
      academicLevelExplanation = `Adjacent academic cohorts (Year ${yearA} and Year ${yearB}) with strong peer tutoring affinity.`;
    } else if (diff === 2) {
      levelScore = 50;
      academicLevelExplanation = `Cross-year pairing (Year ${yearA} and Year ${yearB}).`;
    } else {
      levelScore = 25;
      academicLevelExplanation = `Different academic stages (Year ${yearA} vs Year ${yearB}).`;
    }
  } else {
    levelScore = 70;
    academicLevelExplanation = 'Academic level compatibility evaluated from shared curriculum.';
  }

  // Safe academic performance check (informational, never penalizes missing marks or mismatched scales)
  const perfA = studentA.academicPerformance;
  const perfB = studentB.academicPerformance;
  if (perfA && perfB && perfA.scale === perfB.scale) {
    // Both declared same scale: no penalty regardless
  }

  // --------------------------------------------------------------------------
  // 5. Goals Alignment (10%)
  // --------------------------------------------------------------------------
  const goalsA = Array.isArray(studentA.goals) ? studentA.goals : [];
  const goalsB = Array.isArray(studentB.goals) ? studentB.goals : [];
  const goalsScore = clampScore(jaccardSimilarity(goalsA, goalsB));

  // --------------------------------------------------------------------------
  // Factors Assembly (Weights sum to exactly 100%)
  // --------------------------------------------------------------------------
  const factors = [
    {
      name: 'subject_course_overlap',
      label: 'Subject/Course Overlap',
      weight: STUDY_FACTOR_WEIGHTS.SUBJECT_COURSE_OVERLAP,
      score: subjectCourseScore,
    },
    {
      name: 'learning_style_compatibility',
      label: 'Learning-Style Compatibility',
      weight: STUDY_FACTOR_WEIGHTS.LEARNING_STYLE,
      score: styleScore,
    },
    {
      name: 'shared_schedule',
      label: 'Shared Schedule',
      weight: STUDY_FACTOR_WEIGHTS.SHARED_SCHEDULE,
      score: scheduleScore,
    },
    {
      name: 'academic_level_compatibility',
      label: 'Academic-Level Compatibility',
      weight: STUDY_FACTOR_WEIGHTS.ACADEMIC_LEVEL,
      score: levelScore,
    },
    {
      name: 'goals_alignment',
      label: 'Goals Alignment',
      weight: STUDY_FACTOR_WEIGHTS.GOALS_ALIGNMENT,
      score: goalsScore,
    },
  ];

  // --------------------------------------------------------------------------
  // Explainability Reasons
  // --------------------------------------------------------------------------
  const reasons = [];

  // 1. Course & Topics
  const sharedTopics = studentA.topics.filter((t) =>
    studentB.topics.some((bt) => normalizeString(bt) === normalizeString(t))
  );

  if (isExactCourseMatch) {
    if (sharedTopics.length > 0) {
      reasons.push(`You are both studying course ${studentA.courseCode.trim()} with shared topic focus on ${sharedTopics.join(', ')}.`);
    } else if (studentA.topics.length === 0 && studentB.topics.length === 0) {
      reasons.push(`You are both enrolled in course ${studentA.courseCode.trim()} (no specific study topics declared).`);
    } else {
      reasons.push(`You are both enrolled in course ${studentA.courseCode.trim()}.`);
    }
  } else {
    if (sharedTopics.length > 0) {
      reasons.push(`Different courses (${studentA.courseCode.trim()} vs ${studentB.courseCode.trim()}), but with overlapping study topics: ${sharedTopics.join(', ')}.`);
    } else {
      reasons.push(`Different enrolled courses (${studentA.courseCode.trim()} vs ${studentB.courseCode.trim()}) and no overlapping topics.`);
    }
  }

  // 2. Learning Style
  if (styleA && styleB) {
    if (styleA === styleB) {
      reasons.push(`Complementary study style: both peers prefer ${styleA.replace(/_/g, ' ')} learning.`);
    } else if (styleA === 'mixed' || styleB === 'mixed') {
      reasons.push(`Adaptable study style match (${styleA.replace(/_/g, ' ')} and ${styleB.replace(/_/g, ' ')}).`);
    } else {
      reasons.push(`Different learning styles (${styleA.replace(/_/g, ' ')} vs ${styleB.replace(/_/g, ' ')}).`);
    }
  }

  // 3. Schedule
  const sharedSlots = studentA.timeSlots.filter((slot) =>
    studentB.timeSlots.some((bs) => normalizeSlot(bs) === normalizeSlot(slot))
  );

  if (sharedSlots.length > 0) {
    const slotNames = sharedSlots.map(formatSlot).join(', ');
    reasons.push(`You share ${sharedSlots.length} available study slot(s) (${slotNames}).`);
  } else if (studentA.timeSlots.length === 0 && studentB.timeSlots.length === 0) {
    reasons.push('Neither student declared available study time slots (0% availability overlap).');
  } else {
    reasons.push('You have no shared available study slots.');
  }

  // 4. Academic level
  if (academicLevelExplanation) {
    reasons.push(academicLevelExplanation);
  }

  // 5. Goals
  const sharedGoals = goalsA.filter((g) =>
    goalsB.some((bg) => normalizeString(bg) === normalizeString(g))
  );
  if (sharedGoals.length > 0) {
    reasons.push(`Shared study goals: ${sharedGoals.join(', ')}.`);
  }

  return calculatedResult(factors, reasons);
}

// ============================================================================
// 3. SKILLSWAP COMPATIBILITY ENGINE (5 Factors, 100%)
// ============================================================================

/**
 * Validates input structures for SkillSwap Compatibility.
 * @param {*} studentA
 * @param {*} studentB
 * @returns {string[]} List of validation errors.
 */
function validateSkillSwapInput(studentA, studentB) {
  const errors = [];

  if (!isPlainObject(studentA)) {
    errors.push('studentA must be a valid non-null object.');
    return errors;
  }
  if (!isPlainObject(studentB)) {
    errors.push('studentB must be a valid non-null object.');
    return errors;
  }

  // Offered skills
  if (!Array.isArray(studentA.offeredSkills)) {
    errors.push('studentA.offeredSkills must be an array.');
  } else if (!studentA.offeredSkills.every(isValidStudentSkill)) {
    errors.push('Each skill in studentA.offeredSkills must have a non-empty name and integer level (1-5).');
  }

  if (!Array.isArray(studentB.offeredSkills)) {
    errors.push('studentB.offeredSkills must be an array.');
  } else if (!studentB.offeredSkills.every(isValidStudentSkill)) {
    errors.push('Each skill in studentB.offeredSkills must have a non-empty name and integer level (1-5).');
  }

  // Desired skills
  if (!Array.isArray(studentA.desiredSkills)) {
    errors.push('studentA.desiredSkills must be an array.');
  } else if (!studentA.desiredSkills.every(isValidDesiredSkill)) {
    errors.push('Each skill in studentA.desiredSkills must have a non-empty name and integer targetLevel (1-5).');
  }

  if (!Array.isArray(studentB.desiredSkills)) {
    errors.push('studentB.desiredSkills must be an array.');
  } else if (!studentB.desiredSkills.every(isValidDesiredSkill)) {
    errors.push('Each skill in studentB.desiredSkills must have a non-empty name and integer targetLevel (1-5).');
  }

  // Time slots
  if (!isStringArray(studentA.timeSlots)) {
    errors.push('studentA.timeSlots must be an array of string slot identifiers.');
  }
  if (!isStringArray(studentB.timeSlots)) {
    errors.push('studentB.timeSlots must be an array of string slot identifiers.');
  }

  // Weekly hours
  if (typeof studentA.weeklyHours !== 'number' || !Number.isFinite(studentA.weeklyHours) || studentA.weeklyHours <= 0) {
    errors.push('studentA.weeklyHours must be a positive number (> 0).');
  }
  if (typeof studentB.weeklyHours !== 'number' || !Number.isFinite(studentB.weeklyHours) || studentB.weeklyHours <= 0) {
    errors.push('studentB.weeklyHours must be a positive number (> 0).');
  }

  // Learning style validation if provided
  if (studentA.learningStyle !== undefined && studentA.learningStyle !== null && !isValidLearningStyle(studentA.learningStyle)) {
    errors.push(`studentA.learningStyle must be one of: ${LEARNING_STYLES.join(', ')}.`);
  }
  if (studentB.learningStyle !== undefined && studentB.learningStyle !== null && !isValidLearningStyle(studentB.learningStyle)) {
    errors.push(`studentB.learningStyle must be one of: ${LEARNING_STYLES.join(', ')}.`);
  }

  return errors;
}

/**
 * Calculates SkillSwap Compatibility between two students in a peer skill exchange.
 *
 * Factors & Exact Weights (Sum: 100%):
 * 1. Reciprocal teach/want relationship: 40% (strict bilateral reciprocity; one-way matches get 0)
 * 2. Skill-level compatibility: 20%
 * 3. Goals alignment: 15%
 * 4. Availability compatibility: 15%
 * 5. Learning-style compatibility: 10%
 *
 * Strict Reciprocity Rule:
 * - Both directions must offer matching skills: A offers what B desires AND B offers what A desires.
 * - One-way matches earn 0 for reciprocal teach/want factor and are never presented as reciprocal exchanges.
 *
 * @param {Object} studentA
 * @param {Object} studentB
 * @returns {CompatibilityResult}
 */
export function calculateSkillSwapCompatibility(studentA, studentB) {
  const errors = validateSkillSwapInput(studentA, studentB);
  if (errors.length > 0) {
    return insufficientDataResult(errors);
  }

  // --------------------------------------------------------------------------
  // 1. Reciprocal Teach/Want Relationship (40%)
  // --------------------------------------------------------------------------
  // Direction A -> B: A offers what B desires
  const matchedSkillsAtoB = [];
  const pairScoresAtoB = [];

  for (const desired of studentB.desiredSkills) {
    const target = desired.targetLevel ?? desired.minLevel ?? desired.level;
    const norm = normalizeString(desired.name);
    const offered = studentA.offeredSkills.find((o) => normalizeString(o.name) === norm);
    if (offered) {
      matchedSkillsAtoB.push({ name: desired.name, teacherLevel: offered.level, targetLevel: target });
      const pairScore = offered.level >= target ? 100 : (offered.level / target) * 100;
      pairScoresAtoB.push(pairScore);
    }
  }

  const coverageAtoB =
    studentB.desiredSkills.length === 0 ? 0 : matchedSkillsAtoB.length / studentB.desiredSkills.length;

  // Direction B -> A: B offers what A desires
  const matchedSkillsBtoA = [];
  const pairScoresBtoA = [];

  for (const desired of studentA.desiredSkills) {
    const target = desired.targetLevel ?? desired.minLevel ?? desired.level;
    const norm = normalizeString(desired.name);
    const offered = studentB.offeredSkills.find((o) => normalizeString(o.name) === norm);
    if (offered) {
      matchedSkillsBtoA.push({ name: desired.name, teacherLevel: offered.level, targetLevel: target });
      const pairScore = offered.level >= target ? 100 : (offered.level / target) * 100;
      pairScoresBtoA.push(pairScore);
    }
  }

  const coverageBtoA =
    studentA.desiredSkills.length === 0 ? 0 : matchedSkillsBtoA.length / studentA.desiredSkills.length;

  // Strict bilateral reciprocity: one-way matches get 0!
  let reciprocalScore = 0;
  const isBilateral = matchedSkillsAtoB.length > 0 && matchedSkillsBtoA.length > 0;

  if (isBilateral) {
    reciprocalScore = clampScore(Math.min(coverageAtoB, coverageBtoA) * 100);
  } else {
    reciprocalScore = 0;
  }

  // --------------------------------------------------------------------------
  // 2. Skill-Level Compatibility (20%)
  // --------------------------------------------------------------------------
  let skillLevelScore = 0;
  if (isBilateral) {
    const allPairs = [...pairScoresAtoB, ...pairScoresBtoA];
    const avg = allPairs.reduce((sum, val) => sum + val, 0) / allPairs.length;
    skillLevelScore = clampScore(avg);
  } else {
    skillLevelScore = 0;
  }

  // --------------------------------------------------------------------------
  // 3. Goals Alignment (15%)
  // --------------------------------------------------------------------------
  const goalsA = Array.isArray(studentA.goals) ? studentA.goals : [];
  const goalsB = Array.isArray(studentB.goals) ? studentB.goals : [];
  const goalsScore = clampScore(jaccardSimilarity(goalsA, goalsB));

  // --------------------------------------------------------------------------
  // 4. Availability Compatibility (15%)
  // --------------------------------------------------------------------------
  const slotOverlap = jaccardSimilarity(studentA.timeSlots, studentB.timeSlots);
  const hoursA = Number(studentA.weeklyHours);
  const hoursB = Number(studentB.weeklyHours);
  const cadenceRatio = (Math.min(hoursA, hoursB) / Math.max(hoursA, hoursB)) * 100;

  const availabilityScore = clampScore(0.7 * slotOverlap + 0.3 * cadenceRatio);

  // --------------------------------------------------------------------------
  // 5. Learning-Style Compatibility (10%)
  // --------------------------------------------------------------------------
  const styleA = normalizeString(studentA.learningStyle);
  const styleB = normalizeString(studentB.learningStyle);
  let learningScore = 70;

  if (styleA && styleB) {
    if (styleA === styleB) {
      learningScore = 100;
    } else if (styleA === 'mixed' || styleB === 'mixed') {
      learningScore = 75;
    } else {
      learningScore = 40;
    }
  }

  // --------------------------------------------------------------------------
  // Factors Assembly (Weights sum to exactly 100%)
  // --------------------------------------------------------------------------
  const factors = [
    {
      name: 'reciprocal_teach_want',
      label: 'Reciprocal Teach/Want Relationship',
      weight: SKILLSWAP_FACTOR_WEIGHTS.RECIPROCAL_TEACH_WANT,
      score: reciprocalScore,
    },
    {
      name: 'skill_level_compatibility',
      label: 'Skill-Level Compatibility',
      weight: SKILLSWAP_FACTOR_WEIGHTS.SKILL_LEVEL,
      score: skillLevelScore,
    },
    {
      name: 'goals_alignment',
      label: 'Goals Alignment',
      weight: SKILLSWAP_FACTOR_WEIGHTS.GOALS_ALIGNMENT,
      score: goalsScore,
    },
    {
      name: 'availability_compatibility',
      label: 'Availability Compatibility',
      weight: SKILLSWAP_FACTOR_WEIGHTS.AVAILABILITY,
      score: availabilityScore,
    },
    {
      name: 'learning_style_compatibility',
      label: 'Learning-Style Compatibility',
      weight: SKILLSWAP_FACTOR_WEIGHTS.LEARNING_STYLE,
      score: learningScore,
    },
  ];

  // --------------------------------------------------------------------------
  // Explainability Reasons
  // --------------------------------------------------------------------------
  const reasons = [];

  const namesAtoB = matchedSkillsAtoB.map((s) => s.name);
  const namesBtoA = matchedSkillsBtoA.map((s) => s.name);

  if (studentA.desiredSkills.length === 0 && studentB.desiredSkills.length === 0) {
    reasons.push('Neither student declared skills they desire to learn (0% reciprocal complementarity).');
  } else if (isBilateral) {
    reasons.push(`Mutual skill exchange: you offer ${namesAtoB.join(', ')} while your peer offers ${namesBtoA.join(', ')}.`);
  } else if (namesAtoB.length > 0 && namesBtoA.length === 0) {
    reasons.push(`One-way match: you offer ${namesAtoB.join(', ')} desired by your peer, but your peer does not offer any of your desired skills (0% reciprocal exchange).`);
  } else if (namesBtoA.length > 0 && namesAtoB.length === 0) {
    reasons.push(`One-way match: your peer offers ${namesBtoA.join(', ')} that you desire, but you do not offer any of their desired skills (0% reciprocal exchange).`);
  } else {
    reasons.push('No reciprocal skill matches found between offered and desired skill sets.');
  }

  // 2. Skill Depth explanation
  if (isBilateral) {
    const allMet = [...matchedSkillsAtoB, ...matchedSkillsBtoA].every((p) => p.teacherLevel >= p.targetLevel);
    if (allMet) {
      reasons.push('Teaching proficiency levels meet or exceed requested target levels for all reciprocal skills.');
    } else {
      reasons.push('Teaching proficiency levels partially meet requested target levels across reciprocal skills.');
    }
  } else {
    reasons.push('No reciprocal skill pairs available to evaluate teaching proficiency depth.');
  }

  // 3. Goals explanation
  const sharedGoals = goalsA.filter((g) =>
    goalsB.some((bg) => normalizeString(bg) === normalizeString(g))
  );
  if (sharedGoals.length > 0) {
    reasons.push(`Shared learning and exchange goals: ${sharedGoals.join(', ')}.`);
  }

  // 4. Availability explanation
  const sharedSlots = studentA.timeSlots.filter((slot) =>
    studentB.timeSlots.some((bs) => normalizeSlot(bs) === normalizeSlot(slot))
  );

  if (sharedSlots.length > 0) {
    const slotNames = sharedSlots.map(formatSlot).join(', ');
    reasons.push(`You share ${sharedSlots.length} available exchange session slot(s) (${slotNames}).`);
  } else if (studentA.timeSlots.length === 0 && studentB.timeSlots.length === 0) {
    reasons.push('Neither student declared available exchange session time slots (0% availability overlap).');
  } else {
    reasons.push('No shared available time slots for live exchange sessions.');
  }

  // 5. Cadence explanation
  reasons.push(
    `Weekly commitment alignment: ${hoursA}h/week vs ${hoursB}h/week (${Math.round(cadenceRatio)}% cadence match).`
  );

  return calculatedResult(factors, reasons);
}
