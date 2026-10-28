/**
 * @file StudentProfile Mongoose Model
 * @module backend/src/models/StudentProfile
 *
 * Implements persistent student profiles for SkillSync.
 * Stores general skills, schedule availability, goals, study preferences,
 * and SkillSwap configurations for compatibility scoring and peer discovery.
 */

import mongoose from 'mongoose';
import { WORKING_STYLES } from '../services/matching/compatibilityEngine.js';

/**
 * Subschema for declared student skills.
 * Restricts levels to integers from 1 to 5.
 */
const skillSubschema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      minlength: [1, 'Skill name cannot be empty'],
      maxlength: [70, 'Skill name cannot exceed 70 characters'],
    },
    level: {
      type: Number,
      required: [true, 'Skill proficiency level is required'],
      min: [1, 'Skill level must be between 1 and 5'],
      max: [5, 'Skill level must be between 1 and 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Skill level must be an integer between 1 and 5',
      },
    },
  },
  { _id: false }
);

/**
 * Subschema for requested / desired skills in SkillSwap.
 * Restricts target levels to integers from 1 to 5.
 */
const desiredSkillSubschema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Desired skill name is required'],
      trim: true,
      minlength: [1, 'Desired skill name cannot be empty'],
      maxlength: [70, 'Desired skill name cannot exceed 70 characters'],
    },
    targetLevel: {
      type: Number,
      required: [true, 'Target proficiency level is required'],
      min: [1, 'Target level must be between 1 and 5'],
      max: [5, 'Target level must be between 1 and 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Target level must be an integer between 1 and 5',
      },
    },
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId reference is required'],
      unique: true,
    },
    // General profile
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: undefined,
    },
    skills: {
      type: [skillSubschema],
      default: undefined,
    },
    timeSlots: {
      type: [String],
      default: undefined,
    },
    goals: {
      type: [String],
      default: undefined,
    },
    timeline: {
      type: String,
      trim: true,
      maxlength: [50, 'Timeline cannot exceed 50 characters'],
      default: undefined,
    },
    workingStyle: {
      type: String,
      trim: true,
      lowercase: true,
      enum: {
        values: WORKING_STYLES,
        message: `workingStyle must be one of: ${WORKING_STYLES.join(', ')}`,
      },
      default: undefined,
    },
    // Study-buddy preferences
    courseCode: {
      type: String,
      trim: true,
      maxlength: [30, 'Course code cannot exceed 30 characters'],
      default: undefined,
    },
    topics: {
      type: [String],
      default: undefined,
    },
    learningPreferences: {
      type: [String],
      default: undefined,
    },
    // SkillSwap preferences
    desiredSkills: {
      type: [desiredSkillSubschema],
      default: undefined,
    },
    weeklyHours: {
      type: Number,
      min: [0.5, 'Weekly hours must be at least 0.5'],
      max: [168, 'Weekly hours cannot exceed 168'],
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Calculates deterministic profile completeness for each collaboration mode.
 * Identifies whether the profile has all required inputs for matching without inventing a score.
 *
 * Mode Requirements:
 * - Project: skills, timeSlots, goals, timeline, workingStyle
 * - Study: courseCode, topics, timeSlots, learningPreferences
 * - SkillSwap: skills (offered), desiredSkills, timeSlots, weeklyHours
 *
 * @param {Object} profile - Profile document or plain object
 * @returns {Object} Mode completeness breakdown
 */
export function calculateProfileCompleteness(profile) {
  const p = profile || {};

  // 1. Project collaboration mode
  const projectMissing = [];
  if (!Array.isArray(p.skills)) projectMissing.push('skills');
  if (!Array.isArray(p.timeSlots)) projectMissing.push('timeSlots');
  if (!Array.isArray(p.goals)) projectMissing.push('goals');
  if (typeof p.timeline !== 'string' || p.timeline.trim().length === 0) {
    projectMissing.push('timeline');
  }
  if (
    typeof p.workingStyle !== 'string' ||
    !WORKING_STYLES.includes(p.workingStyle.trim().toLowerCase())
  ) {
    projectMissing.push('workingStyle');
  }

  // 2. Study buddy mode
  const studyMissing = [];
  if (typeof p.courseCode !== 'string' || p.courseCode.trim().length === 0) {
    studyMissing.push('courseCode');
  }
  if (!Array.isArray(p.topics)) studyMissing.push('topics');
  if (!Array.isArray(p.timeSlots)) studyMissing.push('timeSlots');
  if (!Array.isArray(p.learningPreferences)) studyMissing.push('learningPreferences');

  // 3. SkillSwap mode
  const skillswapMissing = [];
  if (!Array.isArray(p.skills)) skillswapMissing.push('skills');
  if (!Array.isArray(p.desiredSkills)) skillswapMissing.push('desiredSkills');
  if (!Array.isArray(p.timeSlots)) skillswapMissing.push('timeSlots');
  if (
    typeof p.weeklyHours !== 'number' ||
    !Number.isFinite(p.weeklyHours) ||
    p.weeklyHours <= 0
  ) {
    skillswapMissing.push('weeklyHours');
  }

  return {
    project: {
      isComplete: projectMissing.length === 0,
      missingFields: projectMissing,
    },
    study: {
      isComplete: studyMissing.length === 0,
      missingFields: studyMissing,
    },
    skillswap: {
      isComplete: skillswapMissing.length === 0,
      missingFields: skillswapMissing,
    },
  };
}

/**
 * Instance method to calculate completeness.
 */
studentProfileSchema.methods.getCompleteness = function () {
  return calculateProfileCompleteness(this);
};

/**
 * Adapts general profile fields to the matching engine's Project input contract.
 */
studentProfileSchema.methods.toProjectMatchingPayload = function () {
  return {
    skills: Array.isArray(this.skills)
      ? this.skills.map((s) => ({ name: s.name, level: s.level }))
      : undefined,
    timeSlots: this.timeSlots,
    goals: this.goals,
    timeline: this.timeline,
    workingStyle: this.workingStyle,
  };
};

/**
 * Adapts profile fields to the matching engine's Study input contract.
 */
studentProfileSchema.methods.toStudyMatchingPayload = function () {
  return {
    courseCode: this.courseCode,
    topics: this.topics,
    timeSlots: this.timeSlots,
    learningPreferences: this.learningPreferences,
  };
};

/**
 * Adapts general skills into offeredSkills for the matching engine's SkillSwap contract.
 * Reuses the general skills field to maintain a single source of truth.
 */
studentProfileSchema.methods.toSkillSwapMatchingPayload = function () {
  return {
    offeredSkills: Array.isArray(this.skills)
      ? this.skills.map((s) => ({ name: s.name, level: s.level }))
      : undefined,
    desiredSkills: Array.isArray(this.desiredSkills)
      ? this.desiredSkills.map((d) => ({ name: d.name, targetLevel: d.targetLevel }))
      : undefined,
    timeSlots: this.timeSlots,
    weeklyHours: this.weeklyHours,
  };
};

/**
 * Returns safe profile object representation without Mongoose internals.
 */
studentProfileSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    bio: this.bio,
    skills: this.skills,
    timeSlots: this.timeSlots,
    goals: this.goals,
    timeline: this.timeline,
    workingStyle: this.workingStyle,
    courseCode: this.courseCode,
    topics: this.topics,
    learningPreferences: this.learningPreferences,
    desiredSkills: this.desiredSkills,
    weeklyHours: this.weeklyHours,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;
