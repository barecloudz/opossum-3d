import { forwardRef } from 'react';
import type { ComponentPropsWithRef, ElementType } from 'react';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps<T extends ElementType = 'button'> = ButtonBaseProps & {
  as?: T;
} & Omit<ComponentPropsWithRef<T>, keyof ButtonBaseProps | 'as'>;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-neon text-brand-black hover:bg-brand-emerald hover:shadow-neon focus:ring-brand-neon',
  secondary:
    'bg-brand-emerald-dark text-brand-neon hover:bg-brand-emerald/20 focus:ring-brand-emerald',
  outline:
    'border-2 border-brand-neon text-brand-neon hover:bg-brand-neon/10 focus:ring-brand-neon',
  ghost:
    'text-gray-300 hover:bg-brand-gray hover:text-white focus:ring-brand-gray',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

function ButtonInner<T extends ElementType = 'button'>(
  {
    as,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    className = '',
    children,
    ...props
  }: ButtonProps<T>,
  ref: React.Ref<Element>
) {
  const Component = as || 'button';
  const isDisabled = disabled || isLoading;

  return (
    <Component
      ref={ref}
      disabled={Component === 'button' ? isDisabled : undefined}
      className={`
        inline-flex items-center justify-center font-semibold rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-black
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Loading...
        </>
      ) : (
        children
      )}
    </Component>
  );
}

const Button = forwardRef(ButtonInner) as <T extends ElementType = 'button'>(
  props: ButtonProps<T> & { ref?: React.Ref<Element> }
) => React.ReactElement | null;

export default Button;
