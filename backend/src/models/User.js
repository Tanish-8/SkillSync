import mongoose from 'mongoose';
import { normalizeEmail, validateEmail } from '../utils/validation.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [70, 'Name cannot exceed 70 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => validateEmail(v) === null,
        message: 'Invalid email address format',
      },
      set: (v) => normalizeEmail(v),
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never returned in default queries
    },
    tokenVersion: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique index on email field
userSchema.index({ email: 1 }, { unique: true });

/**
 * Returns a safe user representation without sensitive fields (passwordHash, tokenVersion).
 *
 * @returns {{ id: string, name: string, email: string, createdAt: Date }}
 */
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
export default User;

