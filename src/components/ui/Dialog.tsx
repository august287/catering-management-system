import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, title, description, className }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-pop animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-md p-1.5 text-text-muted hover:bg-cream-dark hover:text-text transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {title && (
          <div className="mb-4 pr-6">
            <h3 className="font-serif text-xl font-bold text-ink">{title}</h3>
            {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}

export default Dialog;
