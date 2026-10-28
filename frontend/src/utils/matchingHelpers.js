/**
 * @file Matching Display and Formatting Helpers
 * @module frontend/src/utils/matchingHelpers
 *
 * Provides shared utility functions for formatting compatibility scores,
 * missing profile fields, and schedule slots across recommendation pages.
 */

export const HUMAN_FIELD_NAMES = Object.freeze({
  skills: 'Technical Skills',
  desiredSkills: 'Desired Skills (to Learn)',
  timeSlots: 'Available Time Slots',
  goals: 'Goals',
  timeline: 'Project Timeline',
  workingStyle: 'Working Style',
  learningStyle: 'Learning Style',
  courseCode: 'Course Code',
  topics: 'Active Study Topics',
  learningPreferences: 'Learning Format Preferences',
  weeklyHours: 'Weekly Hour Commitment',
  profile: 'Student Profile',
});

/**
 * Returns a human-friendly field name for incomplete profile error banners.
 * @param {string} field
 * @returns {string}
 */
export function formatMissingFieldName(field) {
  return HUMAN_FIELD_NAMES[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase();
}

/**
 * Returns qualitative match tier labels and badge styling classes for a compatibility score.
 * Never relies on color alone (provides descriptive textual labels).
 *
 * @param {number|null} score - Integer score 0-100
 * @returns {{ label: string, variant: string, badgeClass: string }}
 */
export function getScoreTier(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return {
      label: 'Score Unavailable',
      variant: 'neutral',
      badgeClass: 'border-border text-text-muted',
    };
  }

  if (score >= 85) {
    return {
      label: 'Excellent Match',
      variant: 'match',
      badgeClass: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    };
  }
  if (score >= 70) {
    return {
      label: 'Strong Match',
      variant: 'amber',
      badgeClass: 'border-accent/40 text-text-amber bg-accent/10',
    };
  }
  if (score >= 50) {
    return {
      label: 'Good Match',
      variant: 'neutral',
      badgeClass: 'border-border text-text-main bg-bg-section',
    };
  }
  return {
    label: 'Moderate Match',
    variant: 'neutral',
    badgeClass: 'border-border text-text-muted bg-bg-section/50',
  };
}

export const COMMON_TIME_SLOT_LABELS = Object.freeze({
  mon_morning: 'Mon Morning',
  mon_afternoon: 'Mon Afternoon',
  mon_evening: 'Mon Evening',
  tue_morning: 'Tue Morning',
  tue_afternoon: 'Tue Afternoon',
  tue_evening: 'Tue Evening',
  wed_morning: 'Wed Morning',
  wed_afternoon: 'Wed Afternoon',
  wed_evening: 'Wed Evening',
  thu_morning: 'Thu Morning',
  thu_afternoon: 'Thu Afternoon',
  thu_evening: 'Thu Evening',
  fri_morning: 'Fri Morning',
  fri_afternoon: 'Fri Afternoon',
  fri_evening: 'Fri Evening',
  sat_morning: 'Sat Morning',
  sat_afternoon: 'Sat Afternoon',
  sat_evening: 'Sat Evening',
  sun_morning: 'Sun Morning',
  sun_afternoon: 'Sun Afternoon',
  sun_evening: 'Sun Evening',
});

/**
 * Formats a time slot identifier into a friendly label.
 * @param {string} slotId
 * @returns {string}
 */
export function formatTimeSlot(slotId) {
  return COMMON_TIME_SLOT_LABELS[slotId] || slotId.replace(/_/g, ' ');
}
