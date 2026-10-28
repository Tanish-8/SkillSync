/**
 * @file Project Controller
 * @module backend/src/controllers/project.controller
 *
 * Handles persistent project management endpoints:
 * - POST   /api/projects       (Create project owned by authenticated user)
 * - GET    /api/projects       (List open projects with pagination)
 * - GET    /api/projects/mine  (List authenticated user's projects with pagination)
 * - GET    /api/projects/:id   (Retrieve single project by ID)
 * - PATCH  /api/projects/:id   (Update project - owner only)
 * - DELETE /api/projects/:id   (Delete project - owner only)
 */

import mongoose from 'mongoose';
import Project, { PROJECT_STATUSES } from '../models/Project.js';
import { WORKING_STYLES } from '../services/matching/compatibilityEngine.js';

export const ALLOWED_PROJECT_FIELDS = Object.freeze(
  new Set([
    'title',
    'description',
    'requiredSkills',
    'timeSlots',
    'goals',
    'timeline',
    'workingStyle',
    'status',
  ])
);

export const REQUIRED_PROJECT_FIELDS = Object.freeze([
  'title',
  'description',
  'requiredSkills',
  'timeSlots',
  'goals',
  'timeline',
  'workingStyle',
]);

/**
 * Checks if a value is a valid non-null plain object.
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates request payload structure and field types for project creation and updates.
 *
 * @param {Object} body - Request body object
 * @param {boolean} [isUpdate=false] - Whether validating a partial update (PATCH)
 * @returns {string|null} Validation error message or null if valid.
 */
export function validateProjectFields(body, isUpdate = false) {
  if (!isPlainObject(body)) {
    return 'Request body must be a valid JSON object';
  }

  // 1. Check for unexpected properties (disallow ownerId, _id, timestamps, etc.)
  const unexpectedKeys = Object.keys(body).filter((key) => !ALLOWED_PROJECT_FIELDS.has(key));
  if (unexpectedKeys.length > 0) {
    return `Unexpected property in request body: ${unexpectedKeys.join(', ')}`;
  }

  // 2. On update, ensure at least one valid field was provided
  if (isUpdate && Object.keys(body).length === 0) {
    return 'At least one field must be provided for update';
  }

  // 3. Reject explicit null or undefined values for any supplied field
  for (const [key, value] of Object.entries(body)) {
    if (value === null) {
      return `${key} cannot be null`;
    }
    if (value === undefined) {
      return `${key} cannot be undefined`;
    }
  }

  // 4. On creation, check required fields
  if (!isUpdate) {
    for (const field of REQUIRED_PROJECT_FIELDS) {
      if (!(field in body)) {
        return `Missing required field: ${field}`;
      }
    }
  }

  // 5. Validate title
  if ('title' in body) {
    if (typeof body.title !== 'string') {
      return 'title must be a string';
    }
    const trimmed = body.title.trim();
    if (trimmed.length < 5 || trimmed.length > 100) {
      return 'title must be between 5 and 100 characters';
    }
  }

  // 6. Validate description
  if ('description' in body) {
    if (typeof body.description !== 'string') {
      return 'description must be a string';
    }
    const trimmed = body.description.trim();
    if (trimmed.length < 20 || trimmed.length > 2000) {
      return 'description must be between 20 and 2000 characters';
    }
  }

  // 7. Validate requiredSkills
  if ('requiredSkills' in body) {
    if (!Array.isArray(body.requiredSkills)) {
      return 'requiredSkills must be an array of skill requirements';
    }
    for (const sk of body.requiredSkills) {
      if (!isPlainObject(sk)) {
        return 'Each required skill must be an object with name and minLevel';
      }
      const extraKeys = Object.keys(sk).filter((k) => k !== 'name' && k !== 'minLevel');
      if (extraKeys.length > 0) {
        return `Unexpected property in required skill: ${extraKeys.join(', ')}`;
      }
      if (
        sk.name === null ||
        typeof sk.name !== 'string' ||
        sk.name.trim().length === 0 ||
        sk.name.trim().length > 70
      ) {
        return 'Each required skill must have a non-empty name up to 70 characters';
      }
      if (
        sk.minLevel === null ||
        typeof sk.minLevel !== 'number' ||
        !Number.isInteger(sk.minLevel) ||
        sk.minLevel < 1 ||
        sk.minLevel > 5
      ) {
        return 'Each required skill must have an integer minLevel between 1 and 5';
      }
    }
  }

  // 8. Validate timeSlots
  if ('timeSlots' in body) {
    if (!Array.isArray(body.timeSlots) || !body.timeSlots.every((s) => typeof s === 'string')) {
      return 'timeSlots must be an array of string slot identifiers';
    }
  }

  // 9. Validate goals
  if ('goals' in body) {
    if (!Array.isArray(body.goals) || !body.goals.every((g) => typeof g === 'string')) {
      return 'goals must be an array of string tags';
    }
  }

  // 10. Validate timeline
  if ('timeline' in body) {
    if (
      typeof body.timeline !== 'string' ||
      body.timeline.trim().length === 0 ||
      body.timeline.trim().length > 100
    ) {
      return 'timeline must be a non-empty string up to 100 characters';
    }
  }

  // 11. Validate workingStyle
  if ('workingStyle' in body) {
    if (
      typeof body.workingStyle !== 'string' ||
      !WORKING_STYLES.includes(body.workingStyle.trim().toLowerCase())
    ) {
      return `workingStyle must be one of: ${WORKING_STYLES.join(', ')}`;
    }
  }

  // 12. Validate status
  if ('status' in body) {
    if (
      typeof body.status !== 'string' ||
      !PROJECT_STATUSES.includes(body.status.trim().toLowerCase())
    ) {
      return `status must be one of: ${PROJECT_STATUSES.join(', ')}`;
    }
  }

  return null;
}

/**
 * Validates and extracts pagination parameters from request query.
 *
 * @param {Object} query - Express request query object
 * @returns {{ page?: number, limit?: number, error?: string }}
 */
export function parsePaginationParams(query) {
  let page = 1;
  let limit = 20;

  if (query.page !== undefined) {
    const pageStr = String(query.page).trim();
    if (!/^\d+$/.test(pageStr) || parseInt(pageStr, 10) < 1) {
      return { error: 'page must be a positive integer greater than or equal to 1' };
    }
    page = parseInt(pageStr, 10);
  }

  if (query.limit !== undefined) {
    const limitStr = String(query.limit).trim();
    if (!/^\d+$/.test(limitStr)) {
      return { error: 'limit must be an integer between 1 and 50' };
    }
    const parsedLimit = parseInt(limitStr, 10);
    if (parsedLimit < 1 || parsedLimit > 50) {
      return { error: 'limit must be an integer between 1 and 50' };
    }
    limit = parsedLimit;
  }

  return { page, limit };
}

/**
 * POST /api/projects
 * Creates a new project owned by the authenticated user.
 */
export async function createProject(req, res, next) {
  try {
    const validationError = validateProjectFields(req.body, false);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const {
      title,
      description,
      requiredSkills,
      timeSlots,
      goals,
      timeline,
      workingStyle,
      status = 'open',
    } = req.body;

    const project = new Project({
      title: title.trim(),
      description: description.trim(),
      ownerId: req.user._id,
      requiredSkills: requiredSkills.map((s) => ({
        name: s.name.trim(),
        minLevel: s.minLevel,
      })),
      timeSlots: timeSlots.map((s) => (typeof s === 'string' ? s.trim() : s)),
      goals: goals.map((g) => (typeof g === 'string' ? g.trim() : g)),
      timeline: timeline.trim(),
      workingStyle: workingStyle.trim().toLowerCase(),
      status: status ? status.trim().toLowerCase() : 'open',
    });

    await project.save();

    return res.status(201).json({
      project: project.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}
/**
 * GET /api/projects
 * Lists open projects, sorted newest first, with pagination.
 */
export async function getOpenProjects(req, res, next) {
  try {
    const pagination = parsePaginationParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const filter = { status: 'open' };

    const [projects, totalProjects] = await Promise.all([
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalProjects / limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      projects: projects.map((p) => p.toSafeObject()),
      pagination: {
        page,
        limit,
        totalProjects,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}
/**
 * GET /api/projects/mine
 * Returns all projects owned by the authenticated user (both open and closed),
 * sorted newest first, with pagination.
 */
export async function getMyProjects(req, res, next) {
  try {
    const pagination = parsePaginationParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const filter = { ownerId: req.user._id };

    const [projects, totalProjects] = await Promise.all([
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalProjects / limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      projects: projects.map((p) => p.toSafeObject()),
      pagination: {
        page,
        limit,
        totalProjects,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}
/**
 * GET /api/projects/:id
 * Retrieves a single project document by its MongoDB ObjectId.
 */
export async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json({
      project: project.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}
/**
 * PATCH /api/projects/:id
 * Updates an existing project. Only the project owner is permitted.
 */
export async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Enforce ownership: only the project owner may edit
    if (project.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to modify this project',
      });
    }

    const validationError = validateProjectFields(req.body, true);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Apply whitelisted editable fields
    if ('title' in req.body) {
      project.title = req.body.title.trim();
    }
    if ('description' in req.body) {
      project.description = req.body.description.trim();
    }
    if ('requiredSkills' in req.body) {
      project.requiredSkills = req.body.requiredSkills.map((s) => ({
        name: s.name.trim(),
        minLevel: s.minLevel,
      }));
    }
    if ('timeSlots' in req.body) {
      project.timeSlots = req.body.timeSlots.map((s) => (typeof s === 'string' ? s.trim() : s));
    }
    if ('goals' in req.body) {
      project.goals = req.body.goals.map((g) => (typeof g === 'string' ? g.trim() : g));
    }
    if ('timeline' in req.body) {
      project.timeline = req.body.timeline.trim();
    }
    if ('workingStyle' in req.body) {
      project.workingStyle = req.body.workingStyle.trim().toLowerCase();
    }
    if ('status' in req.body) {
      project.status = req.body.status.trim().toLowerCase();
    }

    await project.save();

    return res.status(200).json({
      project: project.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}
/**
 * DELETE /api/projects/:id
 * Deletes an existing project. Only the project owner is permitted.
 */
export async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Enforce ownership: only the project owner may delete
    if (project.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to delete this project',
      });
    }

    await Project.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Project successfully deleted',
    });
  } catch (error) {
    next(error);
  }
}
