import React, { useEffect, useId, useRef } from 'react';
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

// Open dialogs, newest last. Only the top one reacts to Escape/Tab.
const dialogStack: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onOpenChange, children, title, description, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  // Keep the latest handler in a ref so inline callbacks don't re-run the effect (which would steal focus).
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;

    const token = Symbol('dialog');
    dialogStack.push(token);
    const isTop = () => dialogStack[dialogStack.length - 1] === token;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so keyboard and screen-reader users land in it.
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        onOpenChangeRef.current(false);
        return;
      }
      // Keep Tab focus inside the dialog.
      if (e.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      const idx = dialogStack.indexOf(token);
      if (idx !== -1) dialogStack.splice(idx, 1);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Bottom sheet on phones, centered card on larger screens */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={title && description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-50 w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-white p-5 shadow-pop outline-none sm:rounded-xl sm:p-6',
          'max-h-[92vh] max-h-[92dvh] sm:max-h-[90vh]',
          'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          className
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-md p-2 text-text-muted hover:bg-cream-dark hover:text-text transition-colors sm:right-4 sm:top-4 sm:p-1.5"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {title && (
          <div className="mb-4 pr-8">
            <h3 id={titleId} className="font-serif text-lg font-bold text-ink sm:text-xl break-words">
              {title}
            </h3>
            {description && (
              <p id={descId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}

export default Dialog;
