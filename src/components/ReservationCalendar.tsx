import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDateAvailability } from '@/hooks/useDateAvailability';
import {
  DateStatus,
  MAX_EVENTS_PER_DAY,
  getDateStatus,
  getMonthGrid,
  toDateKey,
} from '@/lib/availability';
import type { Reservation } from '@/types/database';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_LABEL: Record<DateStatus, string> = {
  past: 'Past date',
  too_soon: 'Too soon to book (needs 7 days notice)',
  available: 'Available',
  limited: 'Limited slots left',
  booked: 'Fully booked',
};

const STATUS_CELL: Record<DateStatus, string> = {
  past: 'bg-transparent text-text-faint',
  too_soon: 'bg-cream-dark/50 text-text-faint',
  available: 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-emerald-200',
  limited: 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-200',
  booked: 'bg-rose-50 text-rose-800 border-rose-200',
};

const EVENT_DOT: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-600',
  in_progress: 'bg-purple-600',
  completed: 'bg-emerald-600',
  cancelled: 'bg-rose-400',
};

export interface ReservationCalendarProps {
  /** 'select' lets a customer pick an open date; 'admin' lets staff inspect any date. */
  mode?: 'select' | 'admin';
  value?: string;
  onSelect?: (dateKey: string) => void;
  /** Earliest date a customer may book ('YYYY-MM-DD'). */
  minBookableKey: string;
  /** Admin mode: reservations to list on each day. */
  reservations?: Reservation[];
  /** Month to open on ('YYYY-MM-DD'); defaults to the selected date or today. */
  initialMonthKey?: string;
  /** Select mode: called when the picked date becomes fully booked live. */
  onSelectedDateTaken?: (dateKey: string) => void;
  className?: string;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function ReservationCalendar({
  mode = 'select',
  value,
  onSelect,
  minBookableKey,
  reservations,
  initialMonthKey,
  onSelectedDateTaken,
  className,
}: ReservationCalendarProps) {
  const todayKey = toDateKey(new Date());
  const start = parseKey(initialMonthKey || value || todayKey);
  const [viewYear, setViewYear] = useState(start.getFullYear());
  const [viewMonth, setViewMonth] = useState(start.getMonth());
  const [focusKey, setFocusKey] = useState<string>(value || todayKey);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);

  const days = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const { availability, loading, error, lastUpdated, refresh, ready } = useDateAvailability(
    days[0],
    days[days.length - 1]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservations || []) {
      const key = r.event_date.slice(0, 10);
      (map[key] ||= []).push(r);
    }
    for (const list of Object.values(map)) list.sort((a, b) => a.event_time.localeCompare(b.event_time));
    return map;
  }, [reservations]);

  useEffect(() => {
    if (mode !== 'select' || !value || !ready) return;
    if (getDateStatus(value, availability, todayKey, minBookableKey) === 'booked') {
      onSelectedDateTaken?.(value);
    }
  }, [mode, value, ready, availability, todayKey, minBookableKey, onSelectedDateTaken]);

  // Keep keyboard focus on the active day after arrow-key moves.
  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusKey}"]`)?.focus();
  }, [focusKey, viewMonth, viewYear]);

  const goToMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const jumpToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setFocusKey(todayKey);
  };

  // Customers can't pick anything until this month's availability has loaded.
  const isSelectable = (status: DateStatus) =>
    mode === 'admin' || (ready && (status === 'available' || status === 'limited'));

  const moveFocus = (fromKey: string, deltaDays: number) => {
    const d = parseKey(fromKey);
    d.setDate(d.getDate() + deltaDays);
    shouldFocus.current = true;
    if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setFocusKey(toDateKey(d));
  };

  const onKeyDown = (e: React.KeyboardEvent, key: string) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      PageUp: -30,
      PageDown: 30,
    };
    if (e.key in moves) {
      e.preventDefault();
      moveFocus(key, moves[e.key]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      moveFocus(key, -parseKey(key).getDay());
    } else if (e.key === 'End') {
      e.preventDefault();
      moveFocus(key, 6 - parseKey(key).getDay());
    }
  };

  // Roving tabindex: the focused day must be in view, otherwise use the 1st.
  const visibleKeys = new Set(
    days.filter(d => d.getMonth() === viewMonth).map(d => toDateKey(d))
  );
  const tabbableKey = visibleKeys.has(focusKey)
    ? focusKey
    : value && visibleKeys.has(value)
    ? value
    : toDateKey(new Date(viewYear, viewMonth, 1));

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const monthStats = useMemo(() => {
    if (!ready) return { open: 0, booked: 0 };
    let open = 0;
    let booked = 0;
    for (const d of days) {
      if (d.getMonth() !== viewMonth) continue;
      const s = getDateStatus(toDateKey(d), availability, todayKey, minBookableKey);
      if (s === 'available' || s === 'limited') open++;
      if (s === 'booked') booked++;
    }
    return { open, booked };
  }, [ready, days, viewMonth, availability, todayKey, minBookableKey]);

  return (
    <div className={cn('rounded-lg border border-border bg-white', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-cream-dark"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h4 className="min-w-[9.5rem] text-center font-serif text-base font-bold text-ink" aria-live="polite">
            {monthLabel}
          </h4>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-cream-dark"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5" title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : undefined}>
            <span className={cn('h-2 w-2 rounded-full', error ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse')} aria-hidden="true" />
            {error ? 'Offline' : 'Live'}
          </span>
          <button
            type="button"
            onClick={() => refresh()}
            aria-label="Refresh availability"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-cream-dark"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="rounded-md border border-border px-2.5 py-1.5 font-semibold text-text hover:border-gold"
          >
            Today
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          Couldn't refresh availability ({error}). Showing the last known schedule.
        </p>
      )}

      {/* Grid */}
      <div className="p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden="true">
          {WEEKDAYS.map(w => (
            <div key={w} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted sm:text-[11px]">
              <span className="sm:hidden">{w[0]}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          ))}
        </div>
        <div ref={gridRef} role="grid" aria-label={`${monthLabel} availability`} className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const key = toDateKey(d);
            const inMonth = d.getMonth() === viewMonth;
            const realStatus = getDateStatus(key, availability, todayKey, minBookableKey);
            // Until data arrives, show future dates as neutral, not "open".
            const status: DateStatus =
              !ready && (realStatus === 'available' || realStatus === 'limited') ? 'too_soon' : realStatus;
            const booked = availability[key] || 0;
            const selectable = isSelectable(status) && inMonth;
            const selected = value === key;
            const events = eventsByDate[key] || [];
            const slotsLeft = Math.max(0, MAX_EVENTS_PER_DAY - booked);
            const label = `${d.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}: ${ready ? STATUS_LABEL[status] : 'Checking availability'}${
              mode === 'admin' && events.length ? `, ${events.length} event${events.length > 1 ? 's' : ''}` : ''
            }`;

            if (!inMonth) {
              return <div key={key} aria-hidden="true" className="min-h-[2.75rem] sm:min-h-[4.5rem]" />;
            }

            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                data-date={key}
                tabIndex={key === tabbableKey ? 0 : -1}
                aria-label={label}
                aria-selected={selected}
                aria-disabled={!selectable}
                title={ready ? STATUS_LABEL[status] : 'Checking availability…'}
                onFocus={() => setFocusKey(key)}
                onKeyDown={e => onKeyDown(e, key)}
                onClick={() => selectable && onSelect?.(key)}
                className={cn(
                  'relative flex min-h-[2.75rem] flex-col items-stretch rounded-md border border-transparent p-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:min-h-[4.5rem] sm:p-1.5',
                  STATUS_CELL[status],
                  !selectable && 'cursor-not-allowed',
                  mode === 'admin' && 'cursor-pointer hover:border-gold/50',
                  selected && 'border-gold bg-gold text-white ring-2 ring-gold/40 hover:bg-gold-dark'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold sm:h-6 sm:w-6 sm:text-xs',
                    key === todayKey && !selected && 'bg-ink text-cream',
                    status === 'booked' && !selected && mode === 'select' && 'line-through'
                  )}
                >
                  {d.getDate()}
                </span>

                {mode === 'select' && (status === 'available' || status === 'limited' || status === 'booked') && (
                  <span className="mt-auto hidden truncate text-[10px] font-semibold sm:block">
                    {status === 'booked' ? 'Booked' : MAX_EVENTS_PER_DAY > 1 ? `${slotsLeft} left` : 'Open'}
                  </span>
                )}

                {mode === 'admin' && events.length > 0 && (
                  <>
                    <span className="mt-auto flex gap-0.5 sm:hidden" aria-hidden="true">
                      {events.slice(0, 3).map(ev => (
                        <span key={ev.id} className={cn('h-1.5 w-1.5 rounded-full', EVENT_DOT[ev.status])} />
                      ))}
                    </span>
                    <span className="mt-1 hidden space-y-0.5 sm:block">
                      {events.slice(0, 2).map(ev => (
                        <span
                          key={ev.id}
                          className={cn(
                            'flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium',
                            selected ? 'bg-white/20' : 'bg-white/80 text-ink',
                            ev.status === 'cancelled' && 'line-through opacity-60'
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', EVENT_DOT[ev.status])} />
                          <span className="truncate">{ev.customer?.name || ev.booking_code}</span>
                        </span>
                      ))}
                      {events.length > 2 && (
                        <span className="block px-1 text-[10px] font-semibold">+{events.length - 2} more</span>
                      )}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-3 py-2.5 text-[11px] text-text-muted sm:px-4">
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          <LegendItem className="bg-emerald-100 border-emerald-300" label="Available" />
          {MAX_EVENTS_PER_DAY > 1 && <LegendItem className="bg-amber-100 border-amber-300" label="Limited" />}
          <LegendItem className="bg-rose-100 border-rose-300" label="Fully booked" />
          <LegendItem className="bg-cream-dark border-border" label="Unavailable" />
          {mode === 'select' && <LegendItem className="bg-gold border-gold" label="Your pick" />}
        </ul>
        {ready ? (
          <span>
            <strong className="text-emerald-700">{monthStats.open}</strong> open ·{' '}
            <strong className="text-rose-700">{monthStats.booked}</strong> booked this month
          </span>
        ) : (
          <span>Checking availability…</span>
        )}
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-sm border', className)} aria-hidden="true" />
      {label}
    </li>
  );
}

export default ReservationCalendar;
