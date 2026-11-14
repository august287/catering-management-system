import React from 'react';
import { ChefHat } from 'lucide-react';
import { groupSelectionForDisplay } from '@/lib/menuCourses';
import { MenuSelectionItem } from '@/types/database';
import { cn } from '@/lib/utils';

/** The dishes a customer chose for their event, grouped by course. Renders nothing if none. */
export function ChosenMenu({ items, className }: { items?: MenuSelectionItem[] | null; className?: string }) {
  const groups = groupSelectionForDisplay(items);
  if (groups.length === 0) return null;
  return (
    <div className={cn('rounded-lg border border-border p-3 bg-white text-xs', className)}>
      <span className="flex items-center gap-1 border-b border-border pb-1.5 text-[11px] font-bold uppercase text-ink">
        <ChefHat className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> Chosen Menu
      </span>
      <dl className="mt-2 space-y-1.5">
        {groups.map(g => (
          <div key={g.label} className="grid grid-cols-[7.5rem_1fr] gap-2">
            <dt className="font-semibold text-text-muted">{g.label}</dt>
            <dd className="text-text">{g.names.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default ChosenMenu;
