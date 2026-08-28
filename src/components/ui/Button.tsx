import React from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold tracking-[-0.01em] transition-[background-color,color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-45";
    
    const variants = {
      primary: "border border-transparent bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)]",
      secondary: "border border-transparent bg-surface-hover text-primary hover:bg-[var(--color-accent-100)]",
      outline: "border border-divider bg-surface/35 text-primary hover:border-divider-hover hover:bg-surface-elevated",
      ghost: "border border-transparent bg-transparent text-primary hover:bg-surface-hover",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-5 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ y: 1, scale: 0.985 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
