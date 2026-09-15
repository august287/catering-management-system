import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'gold'
    | 'pending'
    | 'pending_verification'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'verified'
    | 'rejected';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-cream-dark text-text border border-border',
    gold: 'bg-gold-light text-gold-dark border border-gold/30',
    pending: 'bg-amber-50 text-amber-800 border border-amber-200',
    pending_verification: 'bg-amber-50 text-amber-800 border border-amber-200',
    confirmed: 'bg-blue-50 text-blue-800 border border-blue-200',
    in_progress: 'bg-purple-50 text-purple-800 border border-purple-200',
    completed: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-800 border border-rose-200',
    verified: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    rejected: 'bg-rose-50 text-rose-800 border border-rose-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
