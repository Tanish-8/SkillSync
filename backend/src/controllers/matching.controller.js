/**
 * @file Matching API Controller
 * @module backend/src/controllers/matching.controller
 *
 * Exposes the deterministic Phase 4A compatibility scoring engine through
 * authenticated preview endpoints for Project, Study, and SkillSwap matching.
 */

import {
  calculateProjectCompatibility,
  calculateStudyCompatibility,
  calculateSkillSwapCompatibility,
} from '../services/matching/compatibilityEngine.js';

/**
 * Verifies whether a value is a valid non-null plain object (not an array or primitive).
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * POST /api/matching/preview/project
 * Computes a compatibility preview between a project requirement set and a student profile.
 *
 * Expected Request Envelope:
 * {
 *   "project": { ... },
 *   "student": { ... }
 * }
 */
export function previewProjectMatching(req, res, next) {
  try {
    const body = req.body;

    if (!isPlainObject(body) || !isPlainObject(body.project) || !isPlainObject(body.student)) {
      return res.status(400).json({
        error: 'Malformed request: body must contain both "project" and "student" objects',
      });
    }

    const result = calculateProjectCompatibility(body.project, body.student);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/matching/preview/study
 * Computes a compatibility preview between two potential study partners.
 *
 * Expected Request Envelope:
 * {
 *   "studentA": { ... },
 *   "studentB": { ... }
 * }
 */
export function previewStudyMatching(req, res, next) {
  try {
    const body = req.body;

    if (!isPlainObject(body) || !isPlainObject(body.studentA) || !isPlainObject(body.studentB)) {
      return res.status(400).json({
        error: 'Malformed request: body must contain both "studentA" and "studentB" objects',
      });
    }

    const result = calculateStudyCompatibility(body.studentA, body.studentB);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/matching/preview/skillswap
 * Computes a compatibility preview between two peers for a reciprocal skill exchange.
 *
 * Expected Request Envelope:
 * {
 *   "studentA": { ... },
 *   "studentB": { ... }
 * }
 */
export function previewSkillSwapMatching(req, res, next) {
  try {
    const body = req.body;

    if (!isPlainObject(body) || !isPlainObject(body.studentA) || !isPlainObject(body.studentB)) {
      return res.status(400).json({
        error: 'Malformed request: body must contain both "studentA" and "studentB" objects',
      });
    }

    const result = calculateSkillSwapCompatibility(body.studentA, body.studentB);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
