import React from 'react';
import { cn } from '../../lib/utils';
import { TaskStatus } from '../../types';

export const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan' }) => {
  const variants = {
    default: "bg-[var(--bg-surface-hover)] text-secondary border border-divider",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors", variants[variant], className)}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status, className }: { status: TaskStatus; className?: string }) => {
  let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan' = 'default';
  
  switch(status) {
    case 'Baru': variant = 'info'; break;
    case 'Bekerja': variant = 'warning'; break;
    case 'Butuh Revisi': variant = 'danger'; break;
    case 'Revisi Selesai': variant = 'cyan'; break;
    case 'Lanjut Next Step': variant = 'purple'; break;
    case 'Selesai': variant = 'success'; break;
    case 'Approved': variant = 'success'; break;
    case 'Signed': variant = 'success'; break;
  }

  return <Badge variant={variant} className={className}>{status}</Badge>;
}

