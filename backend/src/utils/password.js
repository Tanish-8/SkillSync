import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcryptjs with a work factor of 12.
 *
 * @param {string} password Plaintext password
 * @returns {Promise<string>} Password hash
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * Never throws on mismatch; returns boolean.
 *
 * @param {string} password Plaintext password
 * @param {string} hash Stored bcrypt hash
 * @returns {Promise<boolean>} True if password matches hash
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }

  return bcrypt.compare(password, hash);
}

