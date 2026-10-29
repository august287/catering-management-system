import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-cream-dark/50 p-1 text-text-muted scrollbar-none sm:inline-flex',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(TabsContext);
  const isActive = context?.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => context?.onValueChange(value)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:py-1.5',
        isActive
          ? 'bg-white text-ink shadow-sm font-semibold'
          : 'text-text-muted hover:text-text hover:bg-white/50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(TabsContext);
  if (context?.value !== value) return null;

  return <div role="tabpanel" className={cn('mt-4 focus-visible:outline-none', className)}>{children}</div>;
}
