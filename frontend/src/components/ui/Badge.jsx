import React from 'react';

/**
 * SkillSync Restrained Badge
 * 1px border, 6px radius, neutral/amber status styling.
 */
export function Badge({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) {
  const variantStyles = {
    neutral: 'bg-bg-section text-text-muted border-border',
    amber: 'bg-bg-section text-text-amber border-border',
    match: 'bg-bg-section text-text-amber border-border font-medium',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-sans border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;

