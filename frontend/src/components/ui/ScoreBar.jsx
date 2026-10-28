import React from 'react';

/**
 * SkillSync Compatibility Score Bar
 * Thin factor bar: Amber fill (#C98A1B light / #E0A53A dark) over Navy track (#1B2A49 light / #262C3A dark).
 */
export function ScoreBar({
  label,
  value = 0,
  showValue = true,
  className = '',
}) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className="font-medium text-text-muted">{label}</span>
          )}
          {showValue && (
            <span className="font-sans font-medium text-text-main">
              {clampedValue}%
            </span>
          )}
        </div>
      )}

      {/* Thin factor bar track and amber fill */}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Compatibility factor'}
        className="h-1.5 w-full overflow-hidden rounded-full bg-factor-track"
      >
        <div
          className="h-full bg-factor-fill transition-all duration-300 ease-out"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export default ScoreBar;

