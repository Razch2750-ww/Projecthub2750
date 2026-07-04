import React from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opacity-50 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)] focus-visible:ring-[var(--color-accent-600)]",
      secondary: "bg-surface-hover text-primary hover:bg-opacity-80 focus-visible:ring-surface-hover",
      outline: "border border-divider bg-transparent text-primary hover:bg-surface-hover",
      ghost: "bg-transparent text-primary hover:bg-surface-hover",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
