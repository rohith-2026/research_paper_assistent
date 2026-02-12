import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={clsx(
            'input-field',
            error && 'border-red-400 focus:border-red-400',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-300">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
