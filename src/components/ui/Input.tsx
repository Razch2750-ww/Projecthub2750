import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-control)] border border-divider bg-surface-elevated px-3.5 py-2 text-sm text-primary shadow-[0_1px_0_rgb(255_255_255/0.25)_inset] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted hover:border-divider-hover focus-visible:border-[var(--color-accent-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-500)]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-[border-color,box-shadow,background-color] duration-200",
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
          "flex min-h-[96px] w-full resize-y rounded-[var(--radius-control)] border border-divider bg-surface-elevated px-3.5 py-3 text-sm text-primary placeholder:text-muted hover:border-divider-hover focus-visible:border-[var(--color-accent-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-500)]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-[border-color,box-shadow,background-color] duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
