import React from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'pill';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.96]";
    
    const variants = {
      primary: "bg-[#0066cc] text-white hover:bg-[#0071e3] active:bg-[#005bb5] shadow-xs rounded-full font-normal tracking-tight",
      pill: "bg-[#0066cc] text-white hover:bg-[#0071e3] active:bg-[#005bb5] shadow-xs rounded-full font-normal tracking-tight",
      secondary: "bg-surface-hover text-primary hover:bg-[var(--bg-surface-hover)] border border-divider rounded-full font-normal",
      outline: "border border-divider bg-transparent text-primary hover:bg-surface-hover rounded-lg font-normal",
      ghost: "bg-transparent text-primary hover:bg-surface-hover rounded-lg font-normal",
    };

    const sizes = {
      sm: "h-8 px-3.5 text-xs gap-1.5",
      md: "h-9.5 px-4 text-[14px] gap-2",
      lg: "h-11 px-6 text-[15px] gap-2.5",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

