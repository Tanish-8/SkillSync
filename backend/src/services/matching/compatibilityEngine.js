/**
 * @file SkillSync Deterministic & Explainable Compatibility Scoring Engine
 * @module backend/src/services/matching/compatibilityEngine
 *
 * Implements pure-JavaScript compatibility scoring and reason generation for:
 * 1. Project Compatibility (Weights: Skills 40%, Schedule 25%, Goals/Urgency 20%, Working Style 15%)
 * 2. Study Compatibility (Weights: Course/Subject 40%, Shared Availability 35%, Learning Preferences 25%)
 * 3. SkillSwap Compatibility (Weights: Reciprocal Skills 60%, Skill Depth 20%, Availability/Cadence 20%)
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

export const PROJECT_FACTOR_WEIGHTS = Object.freeze({
  SKILLS_ALIGNMENT: 40,
  SCHEDULE_OVERLAP: 25,
  GOALS_URGENCY: 20,
  WORKING_STYLE: 15,
});

export const STUDY_FACTOR_WEIGHTS = Object.freeze({
  COURSE_SUBJECT_OVERLAP: 40,
  SHARED_AVAILABILITY: 35,
  LEARNING_PREFERENCES: 25,
});

export const SKILLSWAP_FACTOR_WEIGHTS = Object.freeze({
  RECIPROCAL_SKILLS: 60,
  SKILL_DEPTH: 20,
  AVAILABILITY_CADENCE: 20,
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

// ============================================================================
// 1. PROJECT COMPATIBILITY ENGINE
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

  // Project working style
  if (!isValidWorkingStyle(project.workingStyle)) {
    errors.push(`project.workingStyle must be one of: ${WORKING_STYLES.join(', ')}.`);
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

  // Student working style
  if (!isValidWorkingStyle(student.workingStyle)) {
    errors.push(`student.workingStyle must be one of: ${WORKING_STYLES.join(', ')}.`);
  }

  return errors;
}

/**
 * Calculates Project Compatibility between a project requirement set and a student profile.
 *
 * Factors & Weights:
 * - Skills Alignment: 40%
 * - Schedule Overlap: 25%
 * - Goal & Urgency Alignment: 20%
 * - Working-Style Compatibility: 15%
 *
 * Empty Sets Rule:
 * - Empty requiredSkills (`[]`) earns 0 (not 100).
 * - Empty project timeSlots (`[]`) earns 0 (not 100).
 * - Empty goals (`[]`) earns 0 similarity.
 *
 * @param {Object} project
 * @param {Array<{ name: string, minLevel: number }>} project.requiredSkills
 * @param {string[]} project.timeSlots
 * @param {string[]} project.goals
 * @param {string} project.timeline
 * @param {string} project.workingStyle
 * @param {Object} student
 * @param {Array<{ name: string, level: number }>} student.skills
 * @param {string[]} student.timeSlots
 * @param {string[]} student.goals
 * @param {string} student.timeline
 * @param {string} student.workingStyle
 * @returns {CompatibilityResult}
 */
export function calculateProjectCompatibility(project, student) {
  const errors = validateProjectInput(project, student);
  if (errors.length > 0) {
    return insufficientDataResult(errors);
  }

  // --------------------------------------------------------------------------
  // 1. Skills Alignment (40%)
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
    // reqSkills.length === 0: no requirements declared
    skillsScore = 0;
  }

  // --------------------------------------------------------------------------
  // 2. Schedule Overlap (25%)
  // --------------------------------------------------------------------------
  const studentSlots = new Set(student.timeSlots.map(normalizeSlot));
  const projectSlots = project.timeSlots.map(normalizeSlot);

  let scheduleScore = 0;
  const coveredSlots = [];

  if (projectSlots.length > 0 && studentSlots.size > 0) {
    for (const slot of projectSlots) {
      if (studentSlots.has(slot)) {
        coveredSlots.push(slot);
      }
    }
    scheduleScore = clampScore((coveredSlots.length / projectSlots.length) * 100);
  }

  // --------------------------------------------------------------------------
  // 3. Goal & Urgency Alignment (20%)
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

  const goalsUrgencyScore = clampScore(0.6 * goalSimilarity + 0.4 * timelineScore);

  // --------------------------------------------------------------------------
  // 4. Working-Style Compatibility (15%)
  // --------------------------------------------------------------------------
  const pStyle = normalizeString(project.workingStyle);
  const sStyle = normalizeString(student.workingStyle);

  let styleScore = 35;
  if (pStyle === sStyle) {
    styleScore = 100;
  } else if (pStyle === 'mixed' || sStyle === 'mixed') {
    styleScore = 75;
  }

  const workingStyleScore = clampScore(styleScore);

  // --------------------------------------------------------------------------
  // Factors Assembly (Weights sum to 100%)
  // --------------------------------------------------------------------------
  const factors = [
    {
      name: 'skills_alignment',
      label: 'Skills Alignment',
      weight: PROJECT_FACTOR_WEIGHTS.SKILLS_ALIGNMENT,
      score: skillsScore,
    },
    {
      name: 'schedule_overlap',
      label: 'Schedule Overlap',
      weight: PROJECT_FACTOR_WEIGHTS.SCHEDULE_OVERLAP,
      score: scheduleScore,
    },
    {
      name: 'goals_urgency',
      label: 'Goal & Urgency Alignment',
      weight: PROJECT_FACTOR_WEIGHTS.GOALS_URGENCY,
      score: goalsUrgencyScore,
    },
    {
      name: 'working_style',
      label: 'Working-Style Compatibility',
      weight: PROJECT_FACTOR_WEIGHTS.WORKING_STYLE,
      score: workingStyleScore,
    },
  ];

  // --------------------------------------------------------------------------
  // Explainability Reasons (3-4 input-grounded explanations)
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

  // 2. Schedule Reason
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

  // 3. Goals & Timeline Reason
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

  // 4. Working-Style Reason
  if (pStyle === sStyle) {
    reasons.push(`Both parties prefer ${project.workingStyle.trim()} collaboration.`);
  } else if (pStyle === 'mixed' || sStyle === 'mixed') {
    reasons.push(`Working styles are compatible via flexible mixed collaboration (${project.workingStyle.trim()} and ${student.workingStyle.trim()}).`);
  } else {
    reasons.push(`Working-style contrast: project is ${project.workingStyle.trim()} while student is ${student.workingStyle.trim()}.`);
  }

  return calculatedResult(factors, reasons);
}

// ============================================================================
// 2. STUDY COMPATIBILITY ENGINE
// ============================================================================

/**
 * Validates input structures for Study Compatibility.
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

  // Learning preferences
  if (!isStringArray(studentA.learningPreferences)) {
    errors.push('studentA.learningPreferences must be an array of string preference tags.');
  }
  if (!isStringArray(studentB.learningPreferences)) {
    errors.push('studentB.learningPreferences must be an array of string preference tags.');
  }

  return errors;
}

/**
 * Calculates Study Compatibility between two study partners.
 *
 * Factors & Weights:
 * - Course & Subject Overlap: 40% (Course code match 70%, Topic tags Jaccard 30%)
 * - Shared Availability: 35% (Time slots Jaccard similarity)
 * - Learning-Preference Alignment: 25% (Learning preference tags Jaccard similarity)
 *
 * Empty Sets Rule:
 * - Empty topics (`[]`) earns 0 topic similarity.
 * - Empty timeSlots (`[]`) earns 0 availability score.
 * - Empty learningPreferences (`[]`) earns 0 preference score.
 *
 * @param {Object} studentA
 * @param {string} studentA.courseCode
 * @param {string[]} studentA.topics
 * @param {string[]} studentA.timeSlots
 * @param {string[]} studentA.learningPreferences
 * @param {Object} studentB
 * @param {string} studentB.courseCode
 * @param {string[]} studentB.topics
 * @param {string[]} studentB.timeSlots
 * @param {string[]} studentB.learningPreferences
 * @returns {CompatibilityResult}
 */
export function calculateStudyCompatibility(studentA, studentB) {
  const errors = validateStudyInput(studentA, studentB);
  if (errors.length > 0) {
    return insufficientDataResult(errors);
  }

  // --------------------------------------------------------------------------
  // 1. Course & Subject Overlap (40%)
  // --------------------------------------------------------------------------
  const normCodeA = normalizeCourseCode(studentA.courseCode);
  const normCodeB = normalizeCourseCode(studentB.courseCode);
  const isExactCourseMatch = normCodeA === normCodeB;
  const courseCodeScore = isExactCourseMatch ? 100 : 0;

  const topicSimilarity = jaccardSimilarity(studentA.topics, studentB.topics);
  const courseSubjectScore = clampScore(0.7 * courseCodeScore + 0.3 * topicSimilarity);

  // --------------------------------------------------------------------------
  // 2. Shared Availability (35%)
  // --------------------------------------------------------------------------
  const availabilityScore = clampScore(jaccardSimilarity(studentA.timeSlots, studentB.timeSlots));

  // --------------------------------------------------------------------------
  // 3. Learning Preferences Alignment (25%)
  // --------------------------------------------------------------------------
  const preferencesScore = clampScore(
    jaccardSimilarity(studentA.learningPreferences, studentB.learningPreferences)
  );

  // --------------------------------------------------------------------------
  // Factors Assembly
  // --------------------------------------------------------------------------
  const factors = [
    {
      name: 'course_subject_overlap',
      label: 'Course & Subject Overlap',
      weight: STUDY_FACTOR_WEIGHTS.COURSE_SUBJECT_OVERLAP,
      score: courseSubjectScore,
    },
    {
      name: 'shared_availability',
      label: 'Shared Availability',
      weight: STUDY_FACTOR_WEIGHTS.SHARED_AVAILABILITY,
      score: availabilityScore,
    },
    {
      name: 'learning_preferences',
      label: 'Learning Preferences',
      weight: STUDY_FACTOR_WEIGHTS.LEARNING_PREFERENCES,
      score: preferencesScore,
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

  // 2. Availability
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

  // 3. Learning Preferences
  const sharedPrefs = studentA.learningPreferences.filter((p) =>
    studentB.learningPreferences.some((bp) => normalizeString(bp) === normalizeString(p))
  );

  if (sharedPrefs.length > 0) {
    reasons.push(`Shared learning preferences: ${sharedPrefs.join(', ')}.`);
  } else if (studentA.learningPreferences.length === 0 && studentB.learningPreferences.length === 0) {
    reasons.push('Neither student declared learning preferences (0% preference alignment).');
  } else if (studentA.learningPreferences.length > 0 || studentB.learningPreferences.length > 0) {
    reasons.push('Different learning preferences between study partners.');
  } else {
    reasons.push('No specific learning preferences declared.');
  }

  return calculatedResult(factors, reasons);
}

// ============================================================================
// 3. SKILLSWAP COMPATIBILITY ENGINE
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

  return errors;
}

/**
 * Calculates SkillSwap Compatibility between two students engaging in a peer skill exchange.
 *
 * Factors & Weights:
 * - Reciprocal Skill Complementarity: 60% (min(A->B coverage, B->A coverage))
 * - Skill Depth & Target Level: 20% (Proficiency level vs requested target level across reciprocal pairs)
 * - Availability & Cadence Alignment: 20% (70% time slot overlap Jaccard, 30% weekly hours ratio)
 *
 * Empty Sets Rule:
 * - When desiredSkills or offeredSkills are empty, coverage is 0 and reciprocal score is 0.
 * - When no reciprocal pairs exist, skill depth score is 0.
 * - When timeSlots are empty, slot overlap is 0.
 *
 * @param {Object} studentA
 * @param {Array<{ name: string, level: number }>} studentA.offeredSkills
 * @param {Array<{ name: string, targetLevel: number }>} studentA.desiredSkills
 * @param {string[]} studentA.timeSlots
 * @param {number} studentA.weeklyHours
 * @param {Object} studentB
 * @param {Array<{ name: string, level: number }>} studentB.offeredSkills
 * @param {Array<{ name: string, targetLevel: number }>} studentB.desiredSkills
 * @param {string[]} studentB.timeSlots
 * @param {number} studentB.weeklyHours
 * @returns {CompatibilityResult}
 */
export function calculateSkillSwapCompatibility(studentA, studentB) {
  const errors = validateSkillSwapInput(studentA, studentB);
  if (errors.length > 0) {
    return insufficientDataResult(errors);
  }

  // --------------------------------------------------------------------------
  // 1. Reciprocal Skill Complementarity (60%)
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

  const coverageAtoB = studentB.desiredSkills.length === 0
    ? 0
    : matchedSkillsAtoB.length / studentB.desiredSkills.length;

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

  const coverageBtoA = studentA.desiredSkills.length === 0
    ? 0
    : matchedSkillsBtoA.length / studentA.desiredSkills.length;

  // Reciprocal complementarity uses the lower of the two directional coverage scores
  const reciprocalScore = clampScore(Math.min(coverageAtoB, coverageBtoA) * 100);

  // --------------------------------------------------------------------------
  // 2. Skill Depth & Target Level (20%)
  // --------------------------------------------------------------------------
  let skillDepthScore = 0;
  const hasReciprocalPairs = matchedSkillsAtoB.length > 0 && matchedSkillsBtoA.length > 0;

  if (hasReciprocalPairs) {
    const allPairs = [...pairScoresAtoB, ...pairScoresBtoA];
    const avg = allPairs.reduce((sum, val) => sum + val, 0) / allPairs.length;
    skillDepthScore = clampScore(avg);
  }

  // --------------------------------------------------------------------------
  // 3. Availability & Cadence Alignment (20%)
  // --------------------------------------------------------------------------
  const slotOverlap = jaccardSimilarity(studentA.timeSlots, studentB.timeSlots);
  const hoursA = Number(studentA.weeklyHours);
  const hoursB = Number(studentB.weeklyHours);
  const cadenceRatio = (Math.min(hoursA, hoursB) / Math.max(hoursA, hoursB)) * 100;

  const availabilityCadenceScore = clampScore(0.7 * slotOverlap + 0.3 * cadenceRatio);

  // --------------------------------------------------------------------------
  // Factors Assembly
  // --------------------------------------------------------------------------
  const factors = [
    {
      name: 'reciprocal_skills',
      label: 'Reciprocal Skill Complementarity',
      weight: SKILLSWAP_FACTOR_WEIGHTS.RECIPROCAL_SKILLS,
      score: reciprocalScore,
    },
    {
      name: 'skill_depth',
      label: 'Skill Depth & Target Level',
      weight: SKILLSWAP_FACTOR_WEIGHTS.SKILL_DEPTH,
      score: skillDepthScore,
    },
    {
      name: 'availability_cadence',
      label: 'Availability & Cadence Alignment',
      weight: SKILLSWAP_FACTOR_WEIGHTS.AVAILABILITY_CADENCE,
      score: availabilityCadenceScore,
    },
  ];

  // --------------------------------------------------------------------------
  // Explainability Reasons
  // --------------------------------------------------------------------------
  const reasons = [];

  // 1. Reciprocal complementarity explanation
  const namesAtoB = matchedSkillsAtoB.map((s) => s.name);
  const namesBtoA = matchedSkillsBtoA.map((s) => s.name);

  if (studentA.desiredSkills.length === 0 && studentB.desiredSkills.length === 0) {
    reasons.push('Neither student declared skills they desire to learn (0% reciprocal complementarity).');
  } else if (hasReciprocalPairs) {
    reasons.push(`Mutual skill exchange: you offer ${namesAtoB.join(', ')} while your peer offers ${namesBtoA.join(', ')}.`);
  } else if (namesAtoB.length > 0 && namesBtoA.length === 0) {
    reasons.push(`One-way match: you offer ${namesAtoB.join(', ')} desired by your peer, but your peer does not offer any of your desired skills.`);
  } else if (namesBtoA.length > 0 && namesAtoB.length === 0) {
    reasons.push(`One-way match: your peer offers ${namesBtoA.join(', ')} that you desire, but you do not offer any of their desired skills.`);
  } else {
    reasons.push('No reciprocal skill matches found between offered and desired skill sets.');
  }

  // 2. Skill Depth explanation
  if (hasReciprocalPairs) {
    const allMet = [...matchedSkillsAtoB, ...matchedSkillsBtoA].every((p) => p.teacherLevel >= p.targetLevel);
    if (allMet) {
      reasons.push('Teaching proficiency levels meet or exceed requested target levels for all reciprocal skills.');
    } else {
      reasons.push('Teaching proficiency levels partially meet requested target levels across reciprocal skills.');
    }
  } else {
    reasons.push('No reciprocal skill pairs available to evaluate teaching proficiency depth.');
  }

  // 3. Availability explanation
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

  // 4. Cadence explanation
  reasons.push(
    `Weekly commitment alignment: ${hoursA}h/week vs ${hoursB}h/week (${Math.round(cadenceRatio)}% cadence match).`
  );

  return calculatedResult(factors, reasons);
}
