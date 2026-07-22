import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-surface text-primary border border-divider rounded-[18px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-200 ease-out",
        interactive && "hover:border-[#0066cc]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] active:scale-[0.99]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

