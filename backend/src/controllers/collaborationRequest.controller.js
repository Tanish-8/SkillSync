/**
 * @file Collaboration Request Controller
 * @module backend/src/controllers/collaborationRequest.controller
 *
 * Implements persistent collaboration request workflows across:
 * 1. Project collaboration requests
 * 2. Study Buddy requests
 * 3. SkillSwap requests
 *
 * Endpoints:
 * - POST   /api/collaboration-requests          (Create new collaboration request with compatibility snapshot)
 * - GET    /api/collaboration-requests/sent     (List sent requests for authenticated student)
 * - GET    /api/collaboration-requests/received (List received requests for authenticated student)
 * - GET    /api/collaboration-requests/:id      (Retrieve single request by ID - requester/recipient only)
 * - PATCH  /api/collaboration-requests/:id/respond (Accept or reject request - recipient only)
 * - PATCH  /api/collaboration-requests/:id/cancel  (Cancel pending request - requester only)
 */

import mongoose from 'mongoose';
import CollaborationRequest, {
  REQUEST_MODES,
  REQUEST_STATUSES,
} from '../models/CollaborationRequest.js';
import Project from '../models/Project.js';
import StudentProfile from '../models/StudentProfile.js';
import User from '../models/User.js';
import {
  calculateProjectCompatibility,
  calculateStudyCompatibility,
  calculateSkillSwapCompatibility,
} from '../services/matching/compatibilityEngine.js';
import { parsePaginationParams } from './project.controller.js';

/**
 * Checks if a value is a valid non-null plain object.
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * POST /api/collaboration-requests
 * Sends a new collaboration request from authenticated user with server-calculated compatibility snapshot.
 */
export async function createCollaborationRequest(req, res, next) {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const { mode, projectId, recipientId, message } = req.body;

    // 1. Validate mode
    if (!mode || typeof mode !== 'string' || !REQUEST_MODES.includes(mode.trim().toLowerCase())) {
      return res.status(400).json({ error: `mode must be one of: ${REQUEST_MODES.join(', ')}` });
    }
    const cleanMode = mode.trim().toLowerCase();

    // 2. Validate message if present
    let cleanMessage = undefined;
    if (message !== undefined && message !== null) {
      if (typeof message !== 'string') {
        return res.status(400).json({ error: 'message must be a string' });
      }
      if (message.trim().length > 500) {
        return res.status(400).json({ error: 'message cannot exceed 500 characters' });
      }
      cleanMessage = message.trim();
    }

    let targetRecipientId;
    let targetProjectId = undefined;
    let snapshot;

    // 3. Mode-specific input verification & compatibility snapshot generation
    if (cleanMode === 'project') {
      if (!projectId || !mongoose.isValidObjectId(projectId)) {
        return res.status(400).json({
          error: 'Valid projectId is required for project collaboration requests',
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (project.status !== 'open') {
        return res.status(400).json({
          error: 'Cannot request to collaborate on a closed project',
        });
      }

      targetRecipientId = project.ownerId;
      targetProjectId = project._id;

      if (targetRecipientId.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot send a collaboration request to your own project',
        });
      }

      const requesterProfile = await StudentProfile.findOne({ userId: req.user._id });
      const completeness = requesterProfile
        ? requesterProfile.getCompleteness().project
        : { isComplete: false };

      if (!requesterProfile || !completeness.isComplete) {
        return res.status(400).json({
          error:
            'Your profile is incomplete for project matching. Please complete your profile before requesting collaboration.',
        });
      }

      const matchResult = calculateProjectCompatibility(
        project.toMatchingEnginePayload(),
        requesterProfile.toProjectMatchingPayload()
      );

      if (matchResult.status === 'insufficient_data') {
        return res.status(400).json({
          error: 'Insufficient profile data to calculate project compatibility',
        });
      }

      snapshot = {
        mode: 'project',
        score: matchResult.score,
        factors: matchResult.factors,
        reasons: matchResult.reasons,
        calculatedAt: new Date(),
      };
    } else if (cleanMode === 'study_buddy') {
      if (projectId !== undefined && projectId !== null) {
        return res.status(400).json({
          error: 'projectId is only allowed for project collaboration requests',
        });
      }

      if (!recipientId || !mongoose.isValidObjectId(recipientId)) {
        return res.status(400).json({
          error: 'Valid recipientId is required for study buddy requests',
        });
      }

      if (recipientId.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot send a collaboration request to yourself',
        });
      }

      const recipientUser = await User.findById(recipientId);
      if (!recipientUser) {
        return res.status(404).json({ error: 'Recipient student user not found' });
      }

      targetRecipientId = recipientUser._id;

      const requesterProfile = await StudentProfile.findOne({ userId: req.user._id });
      const recipientProfile = await StudentProfile.findOne({ userId: recipientId });

      if (!requesterProfile || !requesterProfile.getCompleteness().study.isComplete) {
        return res.status(400).json({
          error:
            'Your profile is incomplete for study buddy matching. Please complete your profile before sending requests.',
        });
      }

      if (!recipientProfile || !recipientProfile.getCompleteness().study.isComplete) {
        return res.status(400).json({
          error: 'The recipient profile is incomplete for study buddy matching.',
        });
      }

      const matchResult = calculateStudyCompatibility(
        requesterProfile.toStudyMatchingPayload(),
        recipientProfile.toStudyMatchingPayload()
      );

      if (matchResult.status === 'insufficient_data') {
        return res.status(400).json({
          error: 'Insufficient profile data to calculate study buddy compatibility',
        });
      }

      snapshot = {
        mode: 'study_buddy',
        score: matchResult.score,
        factors: matchResult.factors,
        reasons: matchResult.reasons,
        calculatedAt: new Date(),
      };
    } else if (cleanMode === 'skillswap') {
      if (projectId !== undefined && projectId !== null) {
        return res.status(400).json({
          error: 'projectId is only allowed for project collaboration requests',
        });
      }

      if (!recipientId || !mongoose.isValidObjectId(recipientId)) {
        return res.status(400).json({
          error: 'Valid recipientId is required for skillswap requests',
        });
      }

      if (recipientId.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Cannot send a collaboration request to yourself',
        });
      }

      const recipientUser = await User.findById(recipientId);
      if (!recipientUser) {
        return res.status(404).json({ error: 'Recipient student user not found' });
      }

      targetRecipientId = recipientUser._id;

      const requesterProfile = await StudentProfile.findOne({ userId: req.user._id });
      const recipientProfile = await StudentProfile.findOne({ userId: recipientId });

      if (!requesterProfile || !requesterProfile.getCompleteness().skillswap.isComplete) {
        return res.status(400).json({
          error:
            'Your profile is incomplete for skill swap matching. Please complete your profile before sending requests.',
        });
      }

      if (!recipientProfile || !recipientProfile.getCompleteness().skillswap.isComplete) {
        return res.status(400).json({
          error: 'The recipient profile is incomplete for skill swap matching.',
        });
      }

      const matchResult = calculateSkillSwapCompatibility(
        requesterProfile.toSkillSwapMatchingPayload(),
        recipientProfile.toSkillSwapMatchingPayload()
      );

      if (matchResult.status === 'insufficient_data') {
        return res.status(400).json({
          error: 'Insufficient profile data to calculate skill swap compatibility',
        });
      }

      // Enforce strict bilateral reciprocity
      const recipFactor = matchResult.factors.find(
        (f) => f.name === 'reciprocal_teach_want' || f.name === 'reciprocal_skills'
      );
      if (!recipFactor || recipFactor.score === 0) {
        return res.status(400).json({
          error:
            'Cannot send SkillSwap request: reciprocal skill exchange is not mutually compatible.',
        });
      }

      snapshot = {
        mode: 'skillswap',
        score: matchResult.score,
        factors: matchResult.factors,
        reasons: matchResult.reasons,
        calculatedAt: new Date(),
      };
    }

    // 4. Duplicate pending check
    const duplicateQuery = {
      requesterId: req.user._id,
      recipientId: targetRecipientId,
      mode: cleanMode,
      status: 'pending',
      ...(cleanMode === 'project' ? { projectId: targetProjectId } : {}),
    };

    const existingPending = await CollaborationRequest.findOne(duplicateQuery);
    if (existingPending) {
      return res.status(409).json({
        error: 'An active pending collaboration request already exists for this candidate/project',
      });
    }

    // 5. Persist the request
    try {
      const newRequest = new CollaborationRequest({
        requesterId: req.user._id,
        recipientId: targetRecipientId,
        mode: cleanMode,
        projectId: targetProjectId,
        message: cleanMessage,
        status: 'pending',
        compatibilitySnapshot: snapshot,
      });

      await newRequest.save();

      await newRequest.populate([
        { path: 'requesterId', select: 'name' },
        { path: 'recipientId', select: 'name' },
        { path: 'projectId', select: 'title status ownerId' },
      ]);

      return res.status(201).json(newRequest.toSafeObject());
    } catch (saveError) {
      if (saveError.code === 11000) {
        return res.status(409).json({
          error: 'An active pending collaboration request already exists for this candidate/project',
        });
      }
      throw saveError;
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/collaboration-requests/sent
 * Lists sent collaboration requests created by the authenticated user.
 */
export async function getSentRequests(req, res, next) {
  try {
    const pagination = parsePaginationParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit } = pagination;
    const filter = { requesterId: req.user._id };

    if (req.query.status !== undefined) {
      const statusStr = String(req.query.status).trim().toLowerCase();
      if (!REQUEST_STATUSES.includes(statusStr)) {
        return res.status(400).json({
          error: `status filter must be one of: ${REQUEST_STATUSES.join(', ')}`,
        });
      }
      filter.status = statusStr;
    }

    const skip = (page - 1) * limit;

    const [totalRequests, requests] = await Promise.all([
      CollaborationRequest.countDocuments(filter),
      CollaborationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recipientId', 'name')
        .populate('projectId', 'title status ownerId'),
    ]);

    const totalPages = Math.ceil(totalRequests / limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      requests: requests.map((r) => r.toSafeObject()),
      pagination: {
        page,
        limit,
        totalRequests,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/collaboration-requests/received
 * Lists received collaboration requests directed to the authenticated user.
 */
export async function getReceivedRequests(req, res, next) {
  try {
    const pagination = parsePaginationParams(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit } = pagination;
    const filter = { recipientId: req.user._id };

    if (req.query.status !== undefined) {
      const statusStr = String(req.query.status).trim().toLowerCase();
      if (!REQUEST_STATUSES.includes(statusStr)) {
        return res.status(400).json({
          error: `status filter must be one of: ${REQUEST_STATUSES.join(', ')}`,
        });
      }
      filter.status = statusStr;
    }

    const skip = (page - 1) * limit;

    const [totalRequests, requests] = await Promise.all([
      CollaborationRequest.countDocuments(filter),
      CollaborationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requesterId', 'name')
        .populate('projectId', 'title status ownerId'),
    ]);

    const totalPages = Math.ceil(totalRequests / limit);
    const hasMore = page < totalPages;

    return res.status(200).json({
      requests: requests.map((r) => r.toSafeObject()),
      pagination: {
        page,
        limit,
        totalRequests,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/collaboration-requests/:id
 * Retrieves a single collaboration request by ID. Only requester or recipient can view.
 */
export async function getRequestById(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collaboration request ID format' });
    }

    const request = await CollaborationRequest.findById(id)
      .populate('requesterId', 'name')
      .populate('recipientId', 'name')
      .populate('projectId', 'title status ownerId');

    if (!request) {
      return res.status(404).json({ error: 'Collaboration request not found' });
    }

    const callerId = req.user._id.toString();
    const requesterId = request.requesterId?._id
      ? request.requesterId._id.toString()
      : request.requesterId.toString();
    const recipientId = request.recipientId?._id
      ? request.recipientId._id.toString()
      : request.recipientId.toString();

    if (callerId !== requesterId && callerId !== recipientId) {
      return res.status(403).json({
        error: 'You are not authorized to view this collaboration request',
      });
    }

    return res.status(200).json(request.toSafeObject());
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/collaboration-requests/:id/respond
 * Accepts or rejects a received collaboration request. Recipient only, pending only.
 * Re-verifies project availability if accepting a project collaboration request.
 */
export async function respondToRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collaboration request ID format' });
    }

    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const { action } = req.body;
    if (
      !action ||
      typeof action !== 'string' ||
      !['accept', 'reject'].includes(action.trim().toLowerCase())
    ) {
      return res.status(400).json({ error: 'action must be either "accept" or "reject"' });
    }

    const cleanAction = action.trim().toLowerCase();

    const request = await CollaborationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Collaboration request not found' });
    }

    if (request.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Only the recipient can respond to this collaboration request',
      });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({
        error: `Cannot respond to a collaboration request that is already ${request.status}`,
      });
    }

    // Re-verify project status if accepting a project request
    if (cleanAction === 'accept' && request.mode === 'project') {
      const project = await Project.findById(request.projectId);
      if (
        !project ||
        project.status !== 'open' ||
        project.ownerId.toString() !== req.user._id.toString()
      ) {
        return res.status(400).json({
          error:
            'Cannot accept request: the project is closed or no longer available for collaboration',
        });
      }
    }

    request.status = cleanAction === 'accept' ? 'accepted' : 'rejected';
    await request.save();

    await request.populate([
      { path: 'requesterId', select: 'name' },
      { path: 'recipientId', select: 'name' },
      { path: 'projectId', select: 'title status ownerId' },
    ]);

    return res.status(200).json(request.toSafeObject());
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/collaboration-requests/:id/cancel
 * Cancels a pending sent collaboration request. Requester only, pending only.
 */
export async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collaboration request ID format' });
    }

    const request = await CollaborationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Collaboration request not found' });
    }

    if (request.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Only the requester can cancel this collaboration request',
      });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({
        error: `Cannot cancel a collaboration request that is already ${request.status}`,
      });
    }

    request.status = 'cancelled';
    await request.save();

    await request.populate([
      { path: 'requesterId', select: 'name' },
      { path: 'recipientId', select: 'name' },
      { path: 'projectId', select: 'title status ownerId' },
    ]);

    return res.status(200).json(request.toSafeObject());
  } catch (error) {
    next(error);
  }
}
