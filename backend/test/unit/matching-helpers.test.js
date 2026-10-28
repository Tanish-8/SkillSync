import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getScoreTier,
  formatMissingFieldName,
  formatTimeSlot,
  HUMAN_FIELD_NAMES,
  COMMON_TIME_SLOT_LABELS,
} from '../../../frontend/src/utils/matchingHelpers.js';

describe('Matching Display & Formatting Helpers - Unit Tests', () => {
  describe('1. getScoreTier', () => {
    it('returns Excellent Match tier for scores >= 85', () => {
      const tier100 = getScoreTier(100);
      assert.equal(tier100.label, 'Excellent Match');
      assert.equal(tier100.variant, 'match');
      assert.ok(tier100.badgeClass.includes('emerald'));

      const tier85 = getScoreTier(85);
      assert.equal(tier85.label, 'Excellent Match');
    });

    it('returns Strong Match tier for scores between 70 and 84', () => {
      const tier84 = getScoreTier(84);
      assert.equal(tier84.label, 'Strong Match');
      assert.equal(tier84.variant, 'amber');
      assert.ok(tier84.badgeClass.includes('accent'));

      const tier70 = getScoreTier(70);
      assert.equal(tier70.label, 'Strong Match');
    });

    it('returns Good Match tier for scores between 50 and 69', () => {
      const tier69 = getScoreTier(69);
      assert.equal(tier69.label, 'Good Match');
      assert.equal(tier69.variant, 'neutral');

      const tier50 = getScoreTier(50);
      assert.equal(tier50.label, 'Good Match');
    });

    it('returns Moderate Match tier for scores < 50', () => {
      const tier49 = getScoreTier(49);
      assert.equal(tier49.label, 'Moderate Match');

      const tier0 = getScoreTier(0);
      assert.equal(tier0.label, 'Moderate Match');
    });

    it('handles null, undefined, and non-number scores gracefully', () => {
      const tierNull = getScoreTier(null);
      assert.equal(tierNull.label, 'Score Unavailable');

      const tierUndef = getScoreTier(undefined);
      assert.equal(tierUndef.label, 'Score Unavailable');

      const tierNaN = getScoreTier(NaN);
      assert.equal(tierNaN.label, 'Score Unavailable');
    });
  });

  describe('2. formatMissingFieldName', () => {
    it('formats known profile input field names into readable strings', () => {
      assert.equal(formatMissingFieldName('skills'), 'Technical Skills');
      assert.equal(formatMissingFieldName('desiredSkills'), 'Desired Skills (to Learn)');
      assert.equal(formatMissingFieldName('timeSlots'), 'Available Time Slots');
      assert.equal(formatMissingFieldName('goals'), 'Goals');
      assert.equal(formatMissingFieldName('timeline'), 'Project Timeline');
      assert.equal(formatMissingFieldName('workingStyle'), 'Working Style');
      assert.equal(formatMissingFieldName('learningStyle'), 'Learning Style');
      assert.equal(formatMissingFieldName('courseCode'), 'Course Code');
      assert.equal(formatMissingFieldName('topics'), 'Active Study Topics');
      assert.equal(formatMissingFieldName('learningPreferences'), 'Learning Format Preferences');
      assert.equal(formatMissingFieldName('weeklyHours'), 'Weekly Hour Commitment');
      assert.equal(formatMissingFieldName('profile'), 'Student Profile');
    });

    it('converts camelCase fields safely for unexpected keys', () => {
      assert.equal(formatMissingFieldName('extraField'), 'extra field');
    });
  });

  describe('3. formatTimeSlot', () => {
    it('formats recognized time slot identifiers', () => {
      assert.equal(formatTimeSlot('mon_morning'), 'Mon Morning');
      assert.equal(formatTimeSlot('wed_afternoon'), 'Wed Afternoon');
      assert.equal(formatTimeSlot('fri_evening'), 'Fri Evening');
      assert.equal(formatTimeSlot('sat_morning'), 'Sat Morning');
      assert.equal(formatTimeSlot('sun_evening'), 'Sun Evening');
    });

    it('replaces underscores for custom time slot strings', () => {
      assert.equal(formatTimeSlot('custom_weekend_slot'), 'custom weekend slot');
    });
  });
});
