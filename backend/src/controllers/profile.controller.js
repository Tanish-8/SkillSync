/**
 * @file Student Profile Controller
 * @module backend/src/controllers/profile.controller
 *
 * Handles authenticated profile retrieval (GET /api/profile/me) and
 * profile creation/updates (PUT /api/profile/me).
 */

import StudentProfile from '../models/StudentProfile.js';
import {
  WORKING_STYLES,
  LEARNING_STYLES,
  GRADE_SCALES,
  GRADE_SCALE_BOUNDS,
} from '../services/matching/compatibilityEngine.js';

export const ALLOWED_PROFILE_FIELDS = Object.freeze(
  new Set([
    'bio',
    'skills',
    'timeSlots',
    'goals',
    'timeline',
    'workingStyle',
    'courseCode',
    'topics',
    'learningPreferences',
    'desiredSkills',
    'weeklyHours',
    // Phase 5D extended fields
    'academicBackground',
    'academicPerformance',
    'learningStyle',
    'projectIdeas',
    'previousProjects',
    'achievements',
    'collaborationPreferences',
  ])
);

/**
 * Checks if a value is a valid non-null plain object.
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates request payload structure and field types for profile updates.
 * @param {Object} body
 * @returns {string|null} Validation error message or null if valid.
 */
function validateProfilePayload(body) {
  if (!isPlainObject(body)) {
    return 'Request body must be a valid JSON object';
  }

  // 1. Check for unexpected properties
  const unexpectedKeys = Object.keys(body).filter((key) => !ALLOWED_PROFILE_FIELDS.has(key));
  if (unexpectedKeys.length > 0) {
    return `Unexpected property in request body: ${unexpectedKeys.join(', ')}`;
  }

  // 2. Validate bio
  if ('bio' in body && body.bio !== null && body.bio !== undefined) {
    if (typeof body.bio !== 'string') {
      return 'bio must be a string';
    }
    if (body.bio.length > 500) {
      return 'bio cannot exceed 500 characters';
    }
  }

  // 3. Validate skills
  if ('skills' in body && body.skills !== null && body.skills !== undefined) {
    if (!Array.isArray(body.skills)) {
      return 'skills must be an array of skill objects';
    }
    for (const sk of body.skills) {
      if (!isPlainObject(sk)) {
        return 'skills must be an array of skill objects';
      }
      const extraKeys = Object.keys(sk).filter((k) => k !== 'name' && k !== 'level');
      if (extraKeys.length > 0) {
        return `Unexpected property in skill object: ${extraKeys.join(', ')}`;
      }
      if (
        typeof sk.name !== 'string' ||
        sk.name.trim().length === 0 ||
        !Number.isInteger(sk.level) ||
        sk.level < 1 ||
        sk.level > 5
      ) {
        return 'Each skill must have a non-empty name and an integer level between 1 and 5';
      }
    }
  }

  // 4. Validate timeSlots
  if ('timeSlots' in body && body.timeSlots !== null && body.timeSlots !== undefined) {
    if (!Array.isArray(body.timeSlots) || !body.timeSlots.every((s) => typeof s === 'string')) {
      return 'timeSlots must be an array of string slot identifiers';
    }
  }

  // 5. Validate goals
  if ('goals' in body && body.goals !== null && body.goals !== undefined) {
    if (!Array.isArray(body.goals) || !body.goals.every((g) => typeof g === 'string')) {
      return 'goals must be an array of string tags';
    }
  }

  // 6. Validate timeline
  if ('timeline' in body && body.timeline !== null && body.timeline !== undefined) {
    if (typeof body.timeline !== 'string') {
      return 'timeline must be a string';
    }
  }

  // 7. Validate workingStyle
  if ('workingStyle' in body && body.workingStyle !== null && body.workingStyle !== undefined) {
    if (
      typeof body.workingStyle !== 'string' ||
      !WORKING_STYLES.includes(body.workingStyle.trim().toLowerCase())
    ) {
      return `workingStyle must be one of: ${WORKING_STYLES.join(', ')}`;
    }
  }

  // 8. Validate courseCode
  if ('courseCode' in body && body.courseCode !== null && body.courseCode !== undefined) {
    if (typeof body.courseCode !== 'string') {
      return 'courseCode must be a string';
    }
  }

  // 9. Validate topics
  if ('topics' in body && body.topics !== null && body.topics !== undefined) {
    if (!Array.isArray(body.topics) || !body.topics.every((t) => typeof t === 'string')) {
      return 'topics must be an array of string tags';
    }
  }

  // 10. Validate learningPreferences
  if (
    'learningPreferences' in body &&
    body.learningPreferences !== null &&
    body.learningPreferences !== undefined
  ) {
    if (
      !Array.isArray(body.learningPreferences) ||
      !body.learningPreferences.every((p) => typeof p === 'string')
    ) {
      return 'learningPreferences must be an array of string preference tags';
    }
  }

  // 11. Validate desiredSkills
  if ('desiredSkills' in body && body.desiredSkills !== null && body.desiredSkills !== undefined) {
    if (!Array.isArray(body.desiredSkills)) {
      return 'desiredSkills must be an array of desired skill objects';
    }
    for (const d of body.desiredSkills) {
      if (!isPlainObject(d)) {
        return 'desiredSkills must be an array of desired skill objects';
      }
      const extraKeys = Object.keys(d).filter((k) => k !== 'name' && k !== 'targetLevel');
      if (extraKeys.length > 0) {
        return `Unexpected property in desired skill object: ${extraKeys.join(', ')}`;
      }
      if (
        typeof d.name !== 'string' ||
        d.name.trim().length === 0 ||
        !Number.isInteger(d.targetLevel) ||
        d.targetLevel < 1 ||
        d.targetLevel > 5
      ) {
        return 'Each desired skill must have a non-empty name and an integer targetLevel between 1 and 5';
      }
    }
  }

  // 12. Validate weeklyHours
  if ('weeklyHours' in body && body.weeklyHours !== null && body.weeklyHours !== undefined) {
    if (
      typeof body.weeklyHours !== 'number' ||
      !Number.isFinite(body.weeklyHours) ||
      body.weeklyHours < 0.5 ||
      body.weeklyHours > 168
    ) {
      return 'weeklyHours must be a number between 0.5 and 168';
    }
  }

  // 13. Validate academicBackground
  if ('academicBackground' in body && body.academicBackground !== null && body.academicBackground !== undefined) {
    if (!isPlainObject(body.academicBackground)) {
      return 'academicBackground must be a valid object';
    }
    const allowedSubkeys = new Set(['degree', 'branch', 'yearOfStudy', 'semester', 'relevantSubjects']);
    const extraKeys = Object.keys(body.academicBackground).filter((k) => !allowedSubkeys.has(k));
    if (extraKeys.length > 0) {
      return `Unexpected property in academicBackground: ${extraKeys.join(', ')}`;
    }
    const { degree, branch, yearOfStudy, semester, relevantSubjects } = body.academicBackground;
    if (degree !== undefined && degree !== null && (typeof degree !== 'string' || degree.length > 100)) {
      return 'degree must be a string up to 100 characters';
    }
    if (branch !== undefined && branch !== null && (typeof branch !== 'string' || branch.length > 100)) {
      return 'branch must be a string up to 100 characters';
    }
    if (yearOfStudy !== undefined && yearOfStudy !== null) {
      if (!Number.isInteger(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 8) {
        return 'yearOfStudy must be an integer between 1 and 8';
      }
    }
    if (semester !== undefined && semester !== null) {
      if (!Number.isInteger(semester) || semester < 1 || semester > 16) {
        return 'semester must be an integer between 1 and 16';
      }
    }
    if (relevantSubjects !== undefined && relevantSubjects !== null) {
      if (!Array.isArray(relevantSubjects) || !relevantSubjects.every((s) => typeof s === 'string')) {
        return 'relevantSubjects must be an array of strings';
      }
    }
  }

  // 14. Validate academicPerformance (Optional, with strict scale bounds)
  if ('academicPerformance' in body && body.academicPerformance !== null && body.academicPerformance !== undefined) {
    if (!isPlainObject(body.academicPerformance)) {
      return 'academicPerformance must be a valid object';
    }
    const allowedSubkeys = new Set(['scale', 'score', 'gpa', 'marks']);
    const extraKeys = Object.keys(body.academicPerformance).filter((k) => !allowedSubkeys.has(k));
    if (extraKeys.length > 0) {
      return `Unexpected property in academicPerformance: ${extraKeys.join(', ')}`;
    }
    const { scale } = body.academicPerformance;
    if (typeof scale !== 'string' || !GRADE_SCALES.includes(scale)) {
      return `academicPerformance.scale must be one of: ${GRADE_SCALES.join(', ')}`;
    }
    const scoreVal = body.academicPerformance.score ?? body.academicPerformance.gpa ?? body.academicPerformance.marks;
    if (typeof scoreVal !== 'number' || !Number.isFinite(scoreVal)) {
      return 'academicPerformance score must be a finite number';
    }
    const bounds = GRADE_SCALE_BOUNDS[scale];
    if (scoreVal < bounds.min || scoreVal > bounds.max) {
      return `Academic performance score (${scoreVal}) is out of bounds for declared scale "${scale}" (${bounds.min} - ${bounds.max})`;
    }
  }

  // 15. Validate learningStyle
  if ('learningStyle' in body && body.learningStyle !== null && body.learningStyle !== undefined) {
    if (
      typeof body.learningStyle !== 'string' ||
      !LEARNING_STYLES.includes(body.learningStyle.trim().toLowerCase())
    ) {
      return `learningStyle must be one of: ${LEARNING_STYLES.join(', ')}`;
    }
  }

  // 16. Validate projectIdeas
  if ('projectIdeas' in body && body.projectIdeas !== null && body.projectIdeas !== undefined) {
    if (!Array.isArray(body.projectIdeas)) {
      return 'projectIdeas must be an array of project idea objects';
    }
    for (const idea of body.projectIdeas) {
      if (!isPlainObject(idea)) {
        return 'Each project idea must be a valid object';
      }
      const allowedKeys = new Set(['title', 'description', 'tags']);
      const extraKeys = Object.keys(idea).filter((k) => !allowedKeys.has(k));
      if (extraKeys.length > 0) {
        return `Unexpected property in project idea: ${extraKeys.join(', ')}`;
      }
      if (typeof idea.title !== 'string' || idea.title.trim().length === 0 || idea.title.length > 100) {
        return 'Project idea title must be a non-empty string up to 100 characters';
      }
      if (idea.description !== undefined && idea.description !== null && typeof idea.description !== 'string') {
        return 'Project idea description must be a string';
      }
      if (idea.tags !== undefined && idea.tags !== null) {
        if (!Array.isArray(idea.tags) || !idea.tags.every((t) => typeof t === 'string')) {
          return 'Project idea tags must be an array of strings';
        }
      }
    }
  }

  // 17. Validate previousProjects
  if ('previousProjects' in body && body.previousProjects !== null && body.previousProjects !== undefined) {
    if (!Array.isArray(body.previousProjects)) {
      return 'previousProjects must be an array of project objects';
    }
    for (const proj of body.previousProjects) {
      if (!isPlainObject(proj)) {
        return 'Each previous project must be a valid object';
      }
      const allowedKeys = new Set(['title', 'skills', 'domain', 'role', 'achievements']);
      const extraKeys = Object.keys(proj).filter((k) => !allowedKeys.has(k));
      if (extraKeys.length > 0) {
        return `Unexpected property in previous project: ${extraKeys.join(', ')}`;
      }
      if (typeof proj.title !== 'string' || proj.title.trim().length === 0 || proj.title.length > 100) {
        return 'Previous project title must be a non-empty string up to 100 characters';
      }
      if (proj.skills !== undefined && proj.skills !== null) {
        if (!Array.isArray(proj.skills) || !proj.skills.every((s) => typeof s === 'string')) {
          return 'Previous project skills must be an array of strings';
        }
      }
      if (proj.domain !== undefined && proj.domain !== null) {
        if (!Array.isArray(proj.domain) && typeof proj.domain !== 'string') {
          return 'Previous project domain must be a string or array of strings';
        }
      }
      if (proj.role !== undefined && proj.role !== null && typeof proj.role !== 'string') {
        return 'Previous project role must be a string';
      }
      if (proj.achievements !== undefined && proj.achievements !== null && typeof proj.achievements !== 'string') {
        return 'Previous project achievements must be a string';
      }
    }
  }

  // 18. Validate achievements
  if ('achievements' in body && body.achievements !== null && body.achievements !== undefined) {
    if (!Array.isArray(body.achievements) || !body.achievements.every((a) => typeof a === 'string')) {
      return 'achievements must be an array of strings';
    }
  }

  // 19. Validate collaborationPreferences
  if (
    'collaborationPreferences' in body &&
    body.collaborationPreferences !== null &&
    body.collaborationPreferences !== undefined
  ) {
    if (
      !Array.isArray(body.collaborationPreferences) ||
      !body.collaborationPreferences.every((c) => typeof c === 'string')
    ) {
      return 'collaborationPreferences must be an array of strings';
    }
  }

  return null;
}

/**
 * GET /api/profile/me
 * Retrieves the authenticated user's own profile and mode completeness breakdown.
 */
export async function getProfile(req, res, next) {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
      });
    }

    return res.status(200).json({
      profile: profile.toSafeObject(),
      completeness: profile.getCompleteness(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile/me
 * Creates or updates the authenticated user's own profile.
 * Preserves omitted fields on partial update, rejects unexpected properties,
 * and derives ownership strictly from req.user._id.
 */
export async function updateProfile(req, res, next) {
  try {
    const validationError = validateProfilePayload(req.body);
    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    let profile = await StudentProfile.findOne({ userId: req.user._id });
    const isNew = !profile;

    if (isNew) {
      profile = new StudentProfile({ userId: req.user._id });
    }

    // Apply allowed fields from req.body (preserving omitted fields)
    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (field in req.body) {
        if (field === 'academicPerformance') {
          if (req.body.academicPerformance === null) {
            profile.academicPerformance = undefined;
          } else if (req.body.academicPerformance) {
            const raw = req.body.academicPerformance;
            const scoreVal = raw.score ?? raw.gpa ?? raw.marks;
            profile.academicPerformance = {
              scale: raw.scale,
              score: Number(scoreVal),
            };
          }
        } else if (field === 'academicBackground') {
          if (req.body.academicBackground === null) {
            profile.academicBackground = undefined;
          } else {
            profile.academicBackground = req.body.academicBackground;
          }
        } else {
          profile[field] = req.body[field];
        }
      }
    }

    await profile.save();

    return res.status(isNew ? 201 : 200).json({
      profile: profile.toSafeObject(),
      completeness: profile.getCompleteness(),
    });
  } catch (error) {
    next(error);
  }
}
