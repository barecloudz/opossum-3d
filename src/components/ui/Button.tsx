import React from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  as?: typeof Link;
  to?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-background)] hover:opacity-90 hover:shadow-neon focus:ring-[var(--color-primary)]',
  secondary:
    'bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 focus:ring-[var(--color-primary)]',
  outline:
    'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 focus:ring-[var(--color-primary)]',
  ghost:
    'text-theme opacity-80 hover:bg-[var(--color-border)] hover:opacity-100 focus:ring-[var(--color-border)]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  as,
  to,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const classes = `
    inline-flex items-center justify-center font-semibold rounded-lg
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-background)]
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  const content = isLoading ? (
    <>
      <Spinner size="sm" className="mr-2" />
      Loading...
    </>
  ) : (
    children
  );

  if (as === Link && to) {
    return (
      <Link to={to} className={classes} onClick={props.onClick as React.MouseEventHandler}>
        {content}
      </Link>
    );
  }

  return (
    <button disabled={isDisabled} className={classes} {...props}>
      {content}
    </button>
  );
}
