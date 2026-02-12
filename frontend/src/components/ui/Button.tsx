import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, className, children, disabled, ...props }, ref) => {
    const baseClass = clsx(
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]',
      {
        'btn-primary': variant === 'primary',
        'btn-secondary': variant === 'secondary',
        'btn-ghost': variant === 'ghost',
        'px-3 py-2 text-sm': size === 'sm',
        'px-4 py-2.5 text-sm': size === 'md',
        'px-6 py-3 text-base': size === 'lg',
      },
      className
    );

    return (
      <button
        ref={ref}
        className={baseClass}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="loading-spinner w-4 h-4" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
