/**
 * SkillSync Email Validation Utility
 *
 * Validates email addresses for student registration and authentication.
 * Accepts any syntactically valid email address, including personal email
 * providers (Gmail, Yahoo, Outlook, etc.) and institutional/academic domains
 * (.edu, .ac.in, .edu.in, etc.).
 *
 * Rejects empty, missing, or malformed email addresses and addresses with
 * internal whitespace.
 *
 * NOTE: Client-side email format validation checks syntax only. It does not
 * verify email ownership, university affiliation, or student status.
 * Server-side validation and authentication occur in Phase 3B.
 */

/**
 * Normalizes an email address by trimming surrounding whitespace
 * and lowercasing only the domain portion (preserving local part casing).
 *
 * @param {string} email
 * @returns {string} Normalized email string
 */
export function normalizeEmail(email) {
  const trimmed = (email || '').trim();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) {
    return trimmed;
  }
  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1).toLowerCase();
  return `${localPart}@${domainPart}`;
}

/**
 * Validates any student email address for registration or authentication.
 * Accepts both personal email providers (Gmail, Yahoo, Outlook, etc.)
 * and institutional/academic domains (.edu, .ac.in, etc.).
 *
 * @param {string} email
 * @returns {string|null} Error message or null if valid.
 */
export function validateEmail(email) {
  const trimmed = (email || '').trim();

  if (!trimmed) {
    return 'Email address is required.';
  }

  // Reject internal whitespace
  if (/\s/.test(trimmed)) {
    return 'Email address cannot contain spaces.';
  }

  const atIndex = trimmed.indexOf('@');
  const lastAtIndex = trimmed.lastIndexOf('@');

  // Must contain exactly one '@'
  if (atIndex === -1 || atIndex !== lastAtIndex) {
    return 'Please enter a valid email address.';
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (!localPart || !domainPart) {
    return 'Please enter a valid email address.';
  }

  // Local part validation (cannot start or end with dot, no consecutive dots)
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return 'Please enter a valid email address.';
  }

  const normalizedDomain = domainPart.toLowerCase();
  const normalizedEmail = `${localPart}@${normalizedDomain}`;

  // Standard email syntax check
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return 'Please enter a valid email address.';
  }

  // Ensure TLD is at least 2 alphabetic characters
  const domainLabels = normalizedDomain.split('.');
  const tld = domainLabels[domainLabels.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
    return 'Please enter a valid email address.';
  }

  // Ensure no domain label starts or ends with a hyphen
  if (domainLabels.some((label) => !label || label.startsWith('-') || label.endsWith('-'))) {
    return 'Please enter a valid email address.';
  }

  return null;
}

// Aliases for clear semantic usage across registration and sign-in
export const validateRegistrationEmail = validateEmail;
export const validateSignInEmail = validateEmail;
export const validateInstitutionalEmail = validateEmail;
