import React from 'react';

/**
 * SkillSync Minimalist Button
 * Primary variant: #1B2A49 (navy) in light mode, #E9E2D0 (cream) in dark mode.
 * Amber is never used as primary button fill per design specification.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-sans font-medium transition-colors duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary border border-transparent',
    secondary:
      'bg-transparent text-text-main border border-border hover:bg-bg-section focus:ring-primary',
    ghost:
      'bg-transparent text-text-muted hover:text-text-main hover:bg-bg-section focus:ring-primary border border-transparent',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;

