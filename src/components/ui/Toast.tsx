import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (t: { tone?: ToastTone; title: string; description?: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: React.ElementType; className: string; iconClass: string }> = {
  success: { icon: CheckCircle2, className: 'border-emerald-200', iconClass: 'text-emerald-600' },
  error: { icon: AlertCircle, className: 'border-red-200', iconClass: 'text-red-600' },
  info: { icon: Info, className: 'border-border', iconClass: 'text-gold' },
};

/**
 * Lightweight toast notifications so every action gives visible feedback
 * (Nielsen heuristic #1: visibility of system status).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    ({ tone = 'success', title, description, duration = 4000 }) => {
      const id = nextId.current++;
      setToasts(prev => [...prev.slice(-2), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? duration + 2000 : duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end no-print"
      >
        {toasts.map(t => {
          const cfg = toneStyles[t.tone];
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-3.5 shadow-pop',
                cfg.className
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', cfg.iconClass)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-text-muted">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded p-1 text-text-muted hover:bg-cream-dark hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Fall back to a no-op so components still render outside the provider (e.g. tests).
  return ctx ?? { toast: () => {} };
}

export default ToastProvider;
