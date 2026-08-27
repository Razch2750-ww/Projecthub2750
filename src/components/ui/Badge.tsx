import React from 'react';
import { cn } from '../../lib/utils';
import { TaskStatus } from '../../types';

export const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    default: "bg-surface-hover text-secondary",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status, className }: { status: TaskStatus; className?: string }) => {
  let variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';
  
  switch(status) {
    case 'Baru': variant = 'info'; break;
    case 'Bekerja': variant = 'warning'; break;
    case 'Butuh Revisi': variant = 'danger'; break;
    case 'Revisi Selesai': variant = 'success'; break;
    case 'Lanjut Next Step': variant = 'success'; break;
    case 'Selesai': variant = 'default'; break;
    case 'Approved': variant = 'success'; break;
    case 'Signed': variant = 'success'; break;
    case 'Paused': variant = 'warning'; break;
    case 'Cancelled': variant = 'danger'; break;
  }

  return <Badge variant={variant} className={className}>{status}</Badge>;
}
