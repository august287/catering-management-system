import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gold' | 'outline' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      default: 'bg-ink text-cream hover:bg-ink-soft shadow-sm',
      gold: 'bg-gold text-white hover:bg-gold-dark shadow-sm hover:shadow-md',
      outline: 'border border-border bg-white text-text hover:bg-cream-dark hover:border-gold',
      secondary: 'bg-cream-dark text-text hover:bg-border',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      ghost: 'text-text hover:bg-cream-dark',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base font-semibold',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export default Button;
