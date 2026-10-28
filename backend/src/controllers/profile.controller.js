/**
 * @file Student Profile Controller
 * @module backend/src/controllers/profile.controller
 *
 * Handles authenticated profile retrieval (GET /api/profile/me) and
 * profile creation/updates (PUT /api/profile/me).
 */

import StudentProfile from '../models/StudentProfile.js';
import { WORKING_STYLES } from '../services/matching/compatibilityEngine.js';

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
      if (
        !isPlainObject(sk) ||
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
      const target = d?.targetLevel ?? d?.minLevel ?? d?.level;
      if (
        !isPlainObject(d) ||
        typeof d.name !== 'string' ||
        d.name.trim().length === 0 ||
        !Number.isInteger(target) ||
        target < 1 ||
        target > 5
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
      body.weeklyHours <= 0 ||
      body.weeklyHours > 168
    ) {
      return 'weeklyHours must be a positive number between 0.5 and 168';
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
 * Rejects unexpected properties and derives ownership strictly from req.user._id.
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

    // Apply allowed fields from req.body
    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (field in req.body) {
        profile[field] = req.body[field];
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
