/**
 * SkillSync Backend Validation Utilities
 *
 * Implements server-side input validation and normalization for authentication.
 * Accepts both personal email providers (Gmail, Yahoo, Outlook, etc.)
 * and institutional/academic domains (.edu, .ac.in, etc.).
 *
 * NOTE: Email format validation only verifies structural syntax.
 * It does not prove email ownership or university affiliation.
 */

// Standard RFC 5322 compatible regex for email syntax validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Normalizes an email address for consistent storage and login lookup.
 * Strategy: Trim surrounding whitespace and convert entire email to lowercase.
 * This guarantees case-insensitive uniqueness and prevents duplicate accounts.
 *
 * @param {string} email
 * @returns {string} Normalized email
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates email format independently on the backend.
 * Accepts personal (Gmail, Yahoo, Outlook) and institutional (.edu, .ac.in) addresses.
 * Rejects empty, missing, or malformed addresses and addresses with internal spaces.
 *
 * @param {string} email
 * @returns {string|null} Error message or null if valid.
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'Email address is required';
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email address is required';
  }

  // Reject internal whitespace
  if (/\s/.test(trimmed)) {
    return 'Email address cannot contain spaces';
  }

  const atIndex = trimmed.indexOf('@');
  const lastAtIndex = trimmed.lastIndexOf('@');

  // Must contain exactly one '@'
  if (atIndex === -1 || atIndex !== lastAtIndex) {
    return 'Please enter a valid email address';
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (!localPart || !domainPart) {
    return 'Please enter a valid email address';
  }

  // Local part checks
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return 'Please enter a valid email address';
  }

  const normalizedDomain = domainPart.toLowerCase();
  const normalizedEmail = `${localPart}@${normalizedDomain}`;

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return 'Please enter a valid email address';
  }

  // Ensure domain labels and TLD are valid
  const domainLabels = normalizedDomain.split('.');
  const tld = domainLabels[domainLabels.length - 1];

  if (tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
    return 'Please enter a valid email address';
  }

  if (domainLabels.some((label) => !label || label.startsWith('-') || label.endsWith('-'))) {
    return 'Please enter a valid email address';
  }

  return null;
}

/**
 * Validates student name.
 *
 * @param {string} name
 * @returns {string|null} Error message or null if valid.
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return 'Full name is required';
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Full name must be at least 2 characters';
  }

  if (trimmed.length > 70) {
    return 'Full name cannot exceed 70 characters';
  }

  return null;
}

/**
 * Validates password format and bounds.
 * Minimum 8 characters; maximum 72 characters to prevent bcrypt truncation.
 *
 * @param {string} password
 * @returns {string|null} Error message or null if valid.
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (password.length > 72) {
    return 'Password cannot exceed 72 characters';
  }

  return null;
}

