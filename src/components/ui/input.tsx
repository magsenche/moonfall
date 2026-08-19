'use client';

import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-moon-100/70 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 bg-night-800 border border-night-600 rounded-xl text-white placeholder-moon-100/30',
            'focus:outline-none focus:ring-2 focus:ring-moon-500 focus:border-transparent',
            'transition-all duration-200',
            error && 'border-blood-500 focus:ring-blood-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-blood-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
