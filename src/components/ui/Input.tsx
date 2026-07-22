import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'pill';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-9.5 w-full bg-surface px-3.5 py-2 text-[14px] text-primary border border-divider placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 ease-out shadow-2xs",
          variant === 'pill' ? "rounded-full px-4" : "rounded-xl",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[90px] w-full rounded-xl border border-divider bg-surface px-3.5 py-2.5 text-[14px] text-primary placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 ease-out shadow-2xs",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

