/**
 * @file Project Mongoose Model
 * @module backend/src/models/Project
 *
 * Implements persistent student projects for SkillSync.
 * Stores project specifications, required technical competencies, schedules,
 * and working styles to support future compatibility scoring and team formation.
 */

import mongoose from 'mongoose';
import { WORKING_STYLES } from '../services/matching/compatibilityEngine.js';

export const PROJECT_STATUSES = Object.freeze(['open', 'closed']);

/**
 * Subschema for required project skills.
 * Restricts minLevel to integers from 1 to 5.
 */
const requiredSkillSubschema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Required skill name is required'],
      trim: true,
      minlength: [1, 'Required skill name cannot be empty'],
      maxlength: [70, 'Required skill name cannot exceed 70 characters'],
    },
    minLevel: {
      type: Number,
      required: [true, 'Minimum proficiency level is required'],
      min: [1, 'Minimum level must be between 1 and 5'],
      max: [5, 'Minimum level must be between 1 and 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Minimum level must be an integer between 1 and 5',
      },
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [5, 'Project title must be between 5 and 100 characters'],
      maxlength: [100, 'Project title must be between 5 and 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      minlength: [20, 'Project description must be between 20 and 2000 characters'],
      maxlength: [2000, 'Project description must be between 20 and 2000 characters'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ownerId is required'],
      immutable: true,
    },
    requiredSkills: {
      type: [requiredSkillSubschema],
      required: [true, 'requiredSkills array is required'],
    },
    timeSlots: {
      type: [String],
      required: [true, 'timeSlots array is required'],
    },
    goals: {
      type: [String],
      required: [true, 'goals array is required'],
    },
    timeline: {
      type: String,
      required: [true, 'timeline is required'],
      trim: true,
      minlength: [1, 'timeline cannot be empty'],
      maxlength: [100, 'timeline cannot exceed 100 characters'],
    },
    workingStyle: {
      type: String,
      required: [true, 'workingStyle is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: WORKING_STYLES,
        message: `workingStyle must be one of: ${WORKING_STYLES.join(', ')}`,
      },
    },
    status: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: {
        values: PROJECT_STATUSES,
        message: `status must be one of: ${PROJECT_STATUSES.join(', ')}`,
      },
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance owner lookups and open-project browsing
projectSchema.index({ ownerId: 1, createdAt: -1 });
projectSchema.index({ status: 1, createdAt: -1 });

/**
 * Returns a sanitized representation of the project document.
 * Exposes no internal secrets or unwanted metadata.
 *
 * @returns {Object} Safe project object
 */
projectSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    ownerId: this.ownerId.toString(),
    requiredSkills: Array.isArray(this.requiredSkills)
      ? this.requiredSkills.map((s) => ({ name: s.name, minLevel: s.minLevel }))
      : [],
    timeSlots: Array.isArray(this.timeSlots) ? [...this.timeSlots] : [],
    goals: Array.isArray(this.goals) ? [...this.goals] : [],
    timeline: this.timeline,
    workingStyle: this.workingStyle,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Adapts project document fields to the matching engine's Project input contract.
 *
 * @returns {Object} Matching engine Project payload
 */
projectSchema.methods.toMatchingEnginePayload = function () {
  return {
    requiredSkills: this.requiredSkills.map((s) => ({ name: s.name, minLevel: s.minLevel })),
    timeSlots: [...this.timeSlots],
    goals: [...this.goals],
    timeline: this.timeline,
    workingStyle: this.workingStyle,
  };
};

export const Project = mongoose.model('Project', projectSchema);
export default Project;
