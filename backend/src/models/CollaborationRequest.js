/**
 * @file CollaborationRequest Mongoose Model
 * @module backend/src/models/CollaborationRequest
 *
 * Implements persistent student collaboration invitations across:
 * 1. Project collaboration requests
 * 2. Study Buddy requests
 * 3. SkillSwap requests
 */

import mongoose from 'mongoose';

export const REQUEST_MODES = Object.freeze(['project', 'study_buddy', 'skillswap']);
export const REQUEST_STATUSES = Object.freeze(['pending', 'accepted', 'rejected', 'cancelled']);

/**
 * Subschema for individual factor breakdown entries in the compatibility snapshot.
 */
const factorSnapshotSubschema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    weight: { type: Number, required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Subschema for server-computed compatibility snapshot at request creation time.
 */
const compatibilitySnapshotSubschema = new mongoose.Schema(
  {
    mode: {
      type: String,
      required: true,
      enum: REQUEST_MODES,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    factors: {
      type: [factorSnapshotSubschema],
      default: [],
    },
    reasons: {
      type: [String],
      default: [],
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

const collaborationRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'requesterId is required'],
      immutable: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'recipientId is required'],
      immutable: true,
    },
    mode: {
      type: String,
      required: [true, 'mode is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: REQUEST_MODES,
        message: `mode must be one of: ${REQUEST_MODES.join(', ')}`,
      },
      immutable: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [
        function () {
          return this.mode === 'project';
        },
        'projectId is required for project collaboration requests',
      ],
      default: undefined,
      immutable: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: undefined,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: {
        values: REQUEST_STATUSES,
        message: `status must be one of: ${REQUEST_STATUSES.join(', ')}`,
      },
      default: 'pending',
    },
    compatibilitySnapshot: {
      type: compatibilitySnapshotSubschema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast sent and received queries
collaborationRequestSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
collaborationRequestSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

// Partial unique indexes preventing duplicate pending requests
collaborationRequestSchema.index(
  { requesterId: 1, recipientId: 1, mode: 1, projectId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending', projectId: { $exists: true } },
  }
);

collaborationRequestSchema.index(
  { requesterId: 1, recipientId: 1, mode: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending', projectId: { $exists: false } },
  }
);

/**
 * Returns a sanitized representation of the collaboration request.
 * Exposes no internal secrets or unwanted metadata.
 *
 * @returns {Object} Safe request object
 */
collaborationRequestSchema.methods.toSafeObject = function () {
  const isPopulatedUser = (u) => Boolean(u && typeof u === 'object' && u._id && u.name);
  const isPopulatedProject = (p) => Boolean(p && typeof p === 'object' && p._id && p.title);

  return {
    id: this._id.toString(),
    requesterId: isPopulatedUser(this.requesterId)
      ? this.requesterId._id.toString()
      : this.requesterId.toString(),
    requester: isPopulatedUser(this.requesterId)
      ? { id: this.requesterId._id.toString(), name: this.requesterId.name }
      : undefined,
    recipientId: isPopulatedUser(this.recipientId)
      ? this.recipientId._id.toString()
      : this.recipientId.toString(),
    recipient: isPopulatedUser(this.recipientId)
      ? { id: this.recipientId._id.toString(), name: this.recipientId.name }
      : undefined,
    mode: this.mode,
    projectId: this.projectId
      ? isPopulatedProject(this.projectId)
        ? this.projectId._id.toString()
        : this.projectId.toString()
      : undefined,
    project: isPopulatedProject(this.projectId)
      ? {
          id: this.projectId._id.toString(),
          title: this.projectId.title,
          status: this.projectId.status,
          ownerId: this.projectId.ownerId ? this.projectId.ownerId.toString() : undefined,
        }
      : undefined,
    message: this.message,
    status: this.status,
    compatibilitySnapshot: this.compatibilitySnapshot
      ? {
          mode: this.compatibilitySnapshot.mode,
          score: this.compatibilitySnapshot.score,
          factors: Array.isArray(this.compatibilitySnapshot.factors)
            ? this.compatibilitySnapshot.factors.map((f) => ({
                name: f.name,
                label: f.label,
                weight: f.weight,
                score: f.score,
              }))
            : [],
          reasons: Array.isArray(this.compatibilitySnapshot.reasons)
            ? [...this.compatibilitySnapshot.reasons]
            : [],
          calculatedAt: this.compatibilitySnapshot.calculatedAt,
        }
      : undefined,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const CollaborationRequest = mongoose.model(
  'CollaborationRequest',
  collaborationRequestSchema
);
export default CollaborationRequest;
