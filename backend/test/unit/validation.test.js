import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  normalizeEmail,
  validateName,
  validatePassword,
} from '../../src/utils/validation.js';

describe('Validation Utilities - Unit Tests', () => {
  describe('Email Validation (validateEmail)', () => {
    it('accepts personal email addresses (Gmail, Yahoo, Outlook)', () => {
      assert.equal(validateEmail('student@gmail.com'), null);
      assert.equal(validateEmail('name@yahoo.com'), null);
      assert.equal(validateEmail('person@outlook.com'), null);
      assert.equal(validateEmail('user@hotmail.com'), null);
      assert.equal(validateEmail('dev@proton.me'), null);
    });

    it('accepts institutional and academic email addresses (.edu, .ac.in, etc.)', () => {
      assert.equal(validateEmail('student@iitd.ac.in'), null);
      assert.equal(validateEmail('student@university.edu'), null);
      assert.equal(validateEmail('scholar@ox.ac.uk'), null);
      assert.equal(validateEmail('student@du.edu.in'), null);
      assert.equal(validateEmail('researcher@unimelb.edu.au'), null);
      assert.equal(validateEmail('student@tum.de'), null);
    });

    it('rejects empty or whitespace-only emails', () => {
      assert.equal(validateEmail(''), 'Email address is required');
      assert.equal(validateEmail('   '), 'Email address is required');
      assert.equal(validateEmail(null), 'Email address is required');
      assert.equal(validateEmail(undefined), 'Email address is required');
    });

    it('rejects email addresses with internal spaces', () => {
      assert.equal(validateEmail('student @gmail.com'), 'Email address cannot contain spaces');
      assert.equal(validateEmail('student@ gmail.com'), 'Email address cannot contain spaces');
      assert.equal(validateEmail('student@gm ail.com'), 'Email address cannot contain spaces');
      assert.equal(validateEmail('stu dent@gmail.com'), 'Email address cannot contain spaces');
    });

    it('rejects malformed email formats', () => {
      assert.equal(validateEmail('notanemail'), 'Please enter a valid email address');
      assert.equal(validateEmail('student@'), 'Please enter a valid email address');
      assert.equal(validateEmail('@domain.com'), 'Please enter a valid email address');
      assert.equal(validateEmail('student@domain'), 'Please enter a valid email address');
      assert.equal(validateEmail('student@domain.c'), 'Please enter a valid email address');
      assert.equal(validateEmail('.student@domain.com'), 'Please enter a valid email address');
      assert.equal(validateEmail('student.@domain.com'), 'Please enter a valid email address');
      assert.equal(validateEmail('student..name@domain.com'), 'Please enter a valid email address');
      assert.equal(validateEmail('student@-domain.com'), 'Please enter a valid email address');
      assert.equal(validateEmail('student@domain-.com'), 'Please enter a valid email address');
      assert.equal(validateEmail('student@@domain.com'), 'Please enter a valid email address');
    });
  });

  describe('Email Normalization (normalizeEmail)', () => {
    it('trims leading and trailing whitespace and lowercases entire email', () => {
      assert.equal(normalizeEmail('  student@gmail.com  '), 'student@gmail.com');
      assert.equal(normalizeEmail('STUDENT@GMAIL.COM'), 'student@gmail.com');
      assert.equal(normalizeEmail('  Alex.Morgan@University.EDU  '), 'alex.morgan@university.edu');
      assert.equal(normalizeEmail('Student@IITD.AC.IN'), 'student@iitd.ac.in');
    });

    it('handles non-string inputs safely', () => {
      assert.equal(normalizeEmail(null), '');
      assert.equal(normalizeEmail(undefined), '');
      assert.equal(normalizeEmail(123), '');
    });
  });

  describe('Name Validation (validateName)', () => {
    it('accepts valid full names', () => {
      assert.equal(validateName('Alex Morgan'), null);
      assert.equal(validateName('Jo'), null);
      assert.equal(validateName('Priya Sharma'), null);
    });

    it('rejects empty or too short names', () => {
      assert.equal(validateName(''), 'Full name is required');
      assert.equal(validateName('   '), 'Full name must be at least 2 characters');
      assert.equal(validateName('A'), 'Full name must be at least 2 characters');
    });

    it('rejects names exceeding 70 characters', () => {
      const longName = 'A'.repeat(71);
      assert.equal(validateName(longName), 'Full name cannot exceed 70 characters');
    });
  });

  describe('Password Validation (validatePassword)', () => {
    it('accepts passwords between 8 and 72 characters', () => {
      assert.equal(validatePassword('12345678'), null);
      assert.equal(validatePassword('CorrectHorseBatteryStaple!'), null);
      assert.equal(validatePassword('a'.repeat(72)), null);
    });

    it('rejects passwords shorter than 8 characters', () => {
      assert.equal(validatePassword('1234567'), 'Password must be at least 8 characters long');
      assert.equal(validatePassword(''), 'Password is required');
      assert.equal(validatePassword(null), 'Password is required');
    });

    it('rejects passwords exceeding 72 characters (bcrypt limit)', () => {
      assert.equal(validatePassword('a'.repeat(73)), 'Password cannot exceed 72 characters');
    });
  });
});

