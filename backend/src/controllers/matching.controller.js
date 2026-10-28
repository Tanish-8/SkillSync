/**
 * @file Matching API Controller
 * @module backend/src/controllers/matching.controller
 *
 * Exposes the deterministic Phase 4A / Phase 5D compatibility scoring engine through:
 * 1. Authenticated preview endpoints:
 *    - POST /api/matching/preview/project
 *    - POST /api/matching/preview/study
 *    - POST /api/matching/preview/skillswap
 * 2. Authenticated database-backed recommendation endpoints (Phase 6A):
 *    - GET /api/matching/recommendations/projects
 *    - GET /api/matching/recommendations/study-buddies
 *    - GET /api/matching/recommendations/skillswap
 */

import {
  calculateProjectCompatibility,
  calculateStudyCompatibility,
  calculateSkillSwapCompatibility,
} from '../services/matching/compatibilityEngine.js';
import StudentProfile from '../models/StudentProfile.js';
import Project from '../models/Project.js';
import { parsePaginationParams } from './project.controller.js';

/**
 * Verifies whether a value is a valid non-null plain object (not an array or primitive).
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ============================================================================
// 1. PREVIEW ENDPOINTS
// ============================================================================

/**
 * POST /api/matching/preview/project
 * Computes a compatibility preview between a project requirement set and a student profile.
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

// ============================================================================
// 2. DATABASE-BACKED RECOMMENDATION ENDPOINTS (Phase 6A)
// ============================================================================

/**
 * GET /api/matching/recommendations/projects
 * Returns ranked open project recommendations for the authenticated student.
 */
export async function getProjectRecommendations(req, res, next) {
  try {
    const pagination = parsePaginationParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit } = pagination;

    // Retrieve caller's profile
    const callerProfile = await StudentProfile.findOne({ userId: req.user._id });
    const completeness = callerProfile
      ? callerProfile.getCompleteness().project
      : { isComplete: false, missingFields: ['profile'] };

    // If caller profile lacks required inputs, return empty recommendations with completeness details
    if (!callerProfile || !completeness.isComplete) {
      return res.status(200).json({
        recommendations: [],
        completeness,
        pagination: {
          page,
          limit,
          totalRecommendations: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // Query open projects not owned by the caller
    const candidateProjects = await Project.find({
      status: 'open',
      ownerId: { $ne: req.user._id },
    }).populate('ownerId', 'name');

    const callerPayload = callerProfile.toProjectMatchingPayload();
    const recommendations = [];

    for (const project of candidateProjects) {
      const matchResult = calculateProjectCompatibility(
        project.toMatchingEnginePayload(),
        callerPayload
      );

      if (matchResult.status === 'insufficient_data') {
        continue;
      }

      recommendations.push({
        project: {
          ...project.toSafeObject(),
          owner: {
            id: project.ownerId?._id ? project.ownerId._id.toString() : project.ownerId?.toString(),
            name: project.ownerId?.name || 'Project Owner',
          },
        },
        score: matchResult.score,
        factors: matchResult.factors,
        reasons: matchResult.reasons,
      });
    }

    // Stable descending sort: score -> creation date -> id
    recommendations.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dateDiff = new Date(b.project.createdAt) - new Date(a.project.createdAt);
      if (dateDiff !== 0) return dateDiff;
      return a.project.id.localeCompare(b.project.id);
    });

    const totalRecommendations = recommendations.length;
    const totalPages = Math.ceil(totalRecommendations / limit);
    const skip = (page - 1) * limit;
    const pagedRecommendations = recommendations.slice(skip, skip + limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      recommendations: pagedRecommendations,
      completeness,
      pagination: {
        page,
        limit,
        totalRecommendations,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/matching/recommendations/study-buddies
 * Returns ranked study buddy candidate recommendations for the authenticated student.
 */
export async function getStudyBuddyRecommendations(req, res, next) {
  try {
    const pagination = parsePaginationParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit } = pagination;

    // Retrieve caller's profile
    const callerProfile = await StudentProfile.findOne({ userId: req.user._id });
    const completeness = callerProfile
      ? callerProfile.getCompleteness().study
      : { isComplete: false, missingFields: ['profile'] };

    if (!callerProfile || !completeness.isComplete) {
      return res.status(200).json({
        recommendations: [],
        completeness,
        pagination: {
          page,
          limit,
          totalRecommendations: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // Query other student profiles
    const candidateProfiles = await StudentProfile.find({
      userId: { $ne: req.user._id },
    }).populate('userId', 'name');

    const callerPayload = callerProfile.toStudyMatchingPayload();
    const recommendations = [];

    for (const candidate of candidateProfiles) {
      if (!candidate.userId) continue;

      // Candidate must also have complete study profile inputs
      const candCompleteness = candidate.getCompleteness().study;
      if (!candCompleteness.isComplete) continue;

      const matchResult = calculateStudyCompatibility(
        callerPayload,
        candidate.toStudyMatchingPayload()
      );

      if (matchResult.status === 'insufficient_data') {
        continue;
      }

      // Safe candidate profile summary without private secrets or marks
      const studentSummary = {
        id: candidate._id.toString(),
        userId: candidate.userId?._id ? candidate.userId._id.toString() : candidate.userId.toString(),
        name: candidate.userId?.name || 'Study Partner',
        bio: candidate.bio,
        courseCode: candidate.courseCode,
        topics: Array.isArray(candidate.topics) ? [...candidate.topics] : [],
        timeSlots: Array.isArray(candidate.timeSlots) ? [...candidate.timeSlots] : [],
        learningPreferences: Array.isArray(candidate.learningPreferences)
          ? [...candidate.learningPreferences]
          : [],
        learningStyle: candidate.learningStyle,
        academicBackground: candidate.academicBackground
          ? {
              degree: candidate.academicBackground.degree,
              branch: candidate.academicBackground.branch,
              yearOfStudy: candidate.academicBackground.yearOfStudy,
              semester: candidate.academicBackground.semester,
              relevantSubjects: candidate.academicBackground.relevantSubjects,
            }
          : undefined,
      };

      recommendations.push({
        student: studentSummary,
        score: matchResult.score,
        factors: matchResult.factors,
        reasons: matchResult.reasons,
      });
    }

    // Sort descending: score -> candidate ID
    recommendations.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.student.id.localeCompare(b.student.id);
    });

    const totalRecommendations = recommendations.length;
    const totalPages = Math.ceil(totalRecommendations / limit);
    const skip = (page - 1) * limit;
    const pagedRecommendations = recommendations.slice(skip, skip + limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      recommendations: pagedRecommendations,
      completeness,
      pagination: {
        page,
        limit,
        totalRecommendations,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/matching/recommendations/skillswap
 * Returns ranked SkillSwap partner recommendations enforcing strict bilateral skill reciprocity.
 */
export async function getSkillSwapRecommendations(req, res, next) {
  try {
    const pagination = parsePaginationParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit } = pagination;

    // Retrieve caller's profile
    const callerProfile = await StudentProfile.findOne({ userId: req.user._id });
    const completeness = callerProfile
      ? callerProfile.getCompleteness().skillswap
      : { isComplete: false, missingFields: ['profile'] };

    if (!callerProfile || !completeness.isComplete) {
      return res.status(200).json({
        recommendations: [],
        completeness,
        pagination: {
          page,
          limit,
          totalRecommendations: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // Query other student profiles
    const candidateProfiles = await StudentProfile.find({
      userId: { $ne: req.user._id },
    }).populate('userId', 'name');

    const callerPayload = callerProfile.toSkillSwapMatchingPayload();
    const recommendations = [];

    for (const candidate of candidateProfiles) {
      if (!candidate.userId) continue;

      // Candidate must also have complete skillswap profile inputs
      const candCompleteness = candidate.getCompleteness().skillswap;
      if (!candCompleteness.isComplete) continue;

      const matchResult = calculateSkillSwapCompatibility(
        callerPayload,
        candidate.toSkillSwapMatchingPayload()
      );

      if (matchResult.status === 'insufficient_data') {
        continue;
      }

      // STRICT BILATERAL RECIPROCITY ENFORCEMENT:
      // One-way matches earn 0 for reciprocal teach/want factor and MUST be filtered out
      const recipFactor = matchResult.factors.find(
        (f) => f.name === 'reciprocal_teach_want' || f.name === 'reciprocal_skills'
      );
      if (!recipFactor || recipFactor.score === 0) {
        continue;
      }

      // Safe candidate profile summary without private secrets or marks
      const studentSummary = {
        id: candidate._id.toString(),
        userId: candidate.userId?._id ? candidate.userId._id.toString() : candidate.userId.toString(),
        name: candidate.userId?.name || 'SkillSwap Partner',
        bio: candidate.bio,
        offeredSkills: Array.isArray(candidate.skills)
          ? candidate.skills.map((s) => ({ name: s.name, level: s.level }))
          : [],
        desiredSkills: Array.isArray(candidate.desiredSkills)
          ? candidate.desiredSkills.map((d) => ({ name: d.name, targetLevel: d.targetLevel }))
          : [],
        timeSlots: Array.isArray(candidate.timeSlots) ? [...candidate.timeSlots] : [],
        weeklyHours: candidate.weeklyHours,
        learningStyle: candidate.learningStyle,
      };

      recommendations.push({
        student: studentSummary,
        score: matchResult.score,
        factors: matchResult.factors,
        reasons: matchResult.reasons,
      });
    }

    // Sort descending: score -> candidate ID
    recommendations.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.student.id.localeCompare(b.student.id);
    });

    const totalRecommendations = recommendations.length;
    const totalPages = Math.ceil(totalRecommendations / limit);
    const skip = (page - 1) * limit;
    const pagedRecommendations = recommendations.slice(skip, skip + limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      recommendations: pagedRecommendations,
      completeness,
      pagination: {
        page,
        limit,
        totalRecommendations,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}
