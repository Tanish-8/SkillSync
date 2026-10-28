/**
 * @file StudentProfile Mongoose Model
 * @module backend/src/models/StudentProfile
 *
 * Implements persistent student profiles for SkillSync.
 * Stores technical skills, schedule availability, goals, study preferences,
 * reciprocal SkillSwap configurations, academic background, learning style,
 * and project experience for deterministic compatibility scoring.
 */

import mongoose from 'mongoose';
import {
  WORKING_STYLES,
  LEARNING_STYLES,
  GRADE_SCALES,
  GRADE_SCALE_BOUNDS,
} from '../services/matching/compatibilityEngine.js';

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

/**
 * Subschema for academic background.
 */
const academicBackgroundSubschema = new mongoose.Schema(
  {
    degree: {
      type: String,
      trim: true,
      maxlength: [100, 'Degree cannot exceed 100 characters'],
      default: undefined,
    },
    branch: {
      type: String,
      trim: true,
      maxlength: [100, 'Branch cannot exceed 100 characters'],
      default: undefined,
    },
    yearOfStudy: {
      type: Number,
      min: [1, 'Year of study must be at least 1'],
      max: [8, 'Year of study cannot exceed 8'],
      validate: {
        validator: (val) => val === undefined || Number.isInteger(val),
        message: 'Year of study must be an integer',
      },
      default: undefined,
    },
    semester: {
      type: Number,
      min: [1, 'Semester must be at least 1'],
      max: [16, 'Semester cannot exceed 16'],
      validate: {
        validator: (val) => val === undefined || Number.isInteger(val),
        message: 'Semester must be an integer',
      },
      default: undefined,
    },
    relevantSubjects: {
      type: [String],
      default: undefined,
    },
  },
  { _id: false }
);

/**
 * Subschema for optional self-reported academic performance.
 * Validates scores strictly against the declared scale.
 */
const academicPerformanceSubschema = new mongoose.Schema(
  {
    scale: {
      type: String,
      trim: true,
      enum: {
        values: GRADE_SCALES,
        message: `scale must be one of: ${GRADE_SCALES.join(', ')}`,
      },
      required: [true, 'Scale is required when academic performance is provided'],
    },
    score: {
      type: Number,
      required: [true, 'Score is required when academic performance is provided'],
      validate: {
        validator: function (val) {
          if (typeof val !== 'number' || !Number.isFinite(val)) return false;
          const bounds = GRADE_SCALE_BOUNDS[this.scale];
          if (!bounds) return false;
          return val >= bounds.min && val <= bounds.max;
        },
        message: 'Score is out of bounds for the declared academic scale',
      },
    },
  },
  { _id: false }
);

/**
 * Subschema for student project ideas.
 */
const projectIdeaSubschema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project idea title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: undefined,
    },
    tags: {
      type: [String],
      default: undefined,
    },
  },
  { _id: false }
);

/**
 * Subschema for previous projects and experience.
 */
const previousProjectSubschema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Previous project title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    skills: {
      type: [String],
      default: undefined,
    },
    domain: {
      type: [String],
      default: undefined,
    },
    role: {
      type: String,
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters'],
      default: undefined,
    },
    achievements: {
      type: String,
      trim: true,
      maxlength: [1000, 'Achievements cannot exceed 1000 characters'],
      default: undefined,
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
    // Academic background & performance
    academicBackground: {
      type: academicBackgroundSubschema,
      default: undefined,
    },
    academicPerformance: {
      type: academicPerformanceSubschema,
      default: undefined,
    },
    // Learning style
    learningStyle: {
      type: String,
      trim: true,
      lowercase: true,
      enum: {
        values: LEARNING_STYLES,
        message: `learningStyle must be one of: ${LEARNING_STYLES.join(', ')}`,
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
    // Project ideas & portfolio
    projectIdeas: {
      type: [projectIdeaSubschema],
      default: undefined,
    },
    previousProjects: {
      type: [previousProjectSubschema],
      default: undefined,
    },
    achievements: {
      type: [String],
      default: undefined,
    },
    collaborationPreferences: {
      type: [String],
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
 * - Project: skills, timeSlots, goals, timeline, workingStyle, learningStyle
 * - Study: courseCode, topics, timeSlots, learningPreferences, learningStyle
 * - SkillSwap: skills (offered), desiredSkills, timeSlots, weeklyHours, learningStyle
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
  if (
    typeof p.learningStyle !== 'string' ||
    !LEARNING_STYLES.includes(p.learningStyle.trim().toLowerCase())
  ) {
    projectMissing.push('learningStyle');
  }

  // 2. Study buddy mode
  const studyMissing = [];
  if (typeof p.courseCode !== 'string' || p.courseCode.trim().length === 0) {
    studyMissing.push('courseCode');
  }
  if (!Array.isArray(p.topics)) studyMissing.push('topics');
  if (!Array.isArray(p.timeSlots)) studyMissing.push('timeSlots');
  if (!Array.isArray(p.learningPreferences)) studyMissing.push('learningPreferences');
  if (
    typeof p.learningStyle !== 'string' ||
    !LEARNING_STYLES.includes(p.learningStyle.trim().toLowerCase())
  ) {
    studyMissing.push('learningStyle');
  }

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
  if (
    typeof p.learningStyle !== 'string' ||
    !LEARNING_STYLES.includes(p.learningStyle.trim().toLowerCase())
  ) {
    skillswapMissing.push('learningStyle');
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
    learningStyle: this.learningStyle,
    academicBackground: this.academicBackground
      ? {
          degree: this.academicBackground.degree,
          branch: this.academicBackground.branch,
          yearOfStudy: this.academicBackground.yearOfStudy,
          semester: this.academicBackground.semester,
          relevantSubjects: this.academicBackground.relevantSubjects,
        }
      : undefined,
    academicPerformance: this.academicPerformance
      ? {
          scale: this.academicPerformance.scale,
          score: this.academicPerformance.score,
        }
      : undefined,
    previousProjects: Array.isArray(this.previousProjects)
      ? this.previousProjects.map((p) => ({
          title: p.title,
          skills: p.skills,
          domain: p.domain,
          role: p.role,
          achievements: p.achievements,
        }))
      : undefined,
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
    learningStyle: this.learningStyle,
    academicBackground: this.academicBackground
      ? {
          degree: this.academicBackground.degree,
          branch: this.academicBackground.branch,
          yearOfStudy: this.academicBackground.yearOfStudy,
          semester: this.academicBackground.semester,
          relevantSubjects: this.academicBackground.relevantSubjects,
        }
      : undefined,
    academicPerformance: this.academicPerformance
      ? {
          scale: this.academicPerformance.scale,
          score: this.academicPerformance.score,
        }
      : undefined,
    goals: this.goals,
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
    learningStyle: this.learningStyle,
    goals: this.goals,
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
    // Phase 5D extended fields
    academicBackground: this.academicBackground,
    academicPerformance: this.academicPerformance,
    learningStyle: this.learningStyle,
    projectIdeas: this.projectIdeas,
    previousProjects: this.previousProjects,
    achievements: this.achievements,
    collaborationPreferences: this.collaborationPreferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;
