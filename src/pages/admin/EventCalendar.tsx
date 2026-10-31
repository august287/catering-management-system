import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarX, Clock, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ReservationCalendar } from '@/components/ReservationCalendar';
import { useCateringData } from '@/hooks/useCateringData';
import { blocksDate, buildAvailabilityMap, MAX_EVENTS_PER_DAY, toDateKey } from '@/lib/availability';
import { formatCurrency, formatDate, formatTime, getMinimumBookingDate } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function EventCalendar() {
  const { reservations, profiles } = useCateringData();
  const todayKey = toDateKey(new Date());
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);

  const withCustomers = useMemo(
    () =>
      reservations.map(r => ({
        ...r,
        customer: r.customer || profiles.find(p => p.id === r.customer_id),
      })),
    [reservations, profiles]
  );

  const dayEvents = withCustomers
    .filter(r => r.event_date.slice(0, 10) === selectedKey)
    .sort((a, b) => a.event_time.localeCompare(b.event_time));
  const activeOnDay = dayEvents.filter(r => blocksDate(r.status)).length;

  // Dates that somehow hold more active bookings than capacity (legacy data).
  const conflicts = useMemo(() => {
    const map = buildAvailabilityMap(reservations);
    return Object.entries(map)
      .filter(([key, count]) => count > MAX_EVENTS_PER_DAY && key >= todayKey)
      .map(([key]) => key)
      .sort();
  }, [reservations, todayKey]);

  const upcoming = withCustomers
    .filter(r => blocksDate(r.status) && r.event_date >= todayKey)
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.event_time.localeCompare(b.event_time))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Event Calendar</h2>
        <p className="text-sm text-text-muted">
          Live view of every booked date. Customers can only pick dates shown as available.
        </p>
      </div>

      {conflicts.length > 0 && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <strong>Double booking detected</strong> on {conflicts.map(formatDate).join(', ')}. Cancel or
          reschedule one of the events on {conflicts.length > 1 ? 'these dates' : 'this date'}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ReservationCalendar
          mode="admin"
          value={selectedKey}
          onSelect={setSelectedKey}
          minBookableKey={getMinimumBookingDate()}
          reservations={withCustomers}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{formatDate(selectedKey)}</CardTitle>
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                {activeOnDay >= MAX_EVENTS_PER_DAY ? (
                  <>
                    <CalendarX className="h-3.5 w-3.5 text-rose-600" />
                    <span className="text-rose-700">Fully booked</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">
                      {MAX_EVENTS_PER_DAY - activeOnDay} of {MAX_EVENTS_PER_DAY} slot
                      {MAX_EVENTS_PER_DAY > 1 ? 's' : ''} open
                    </span>
                  </>
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-text-muted">No events on this date.</p>
              ) : (
                dayEvents.map(r => (
                  <div key={r.id} className="space-y-1.5 rounded-lg border border-border bg-cream/40 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink">{r.booking_code}</span>
                      <Badge variant={r.status}>{STATUS_LABELS[r.status]}</Badge>
                    </div>
                    <p className="font-semibold text-ink">{r.customer?.name || 'Customer'}</p>
                    <p className="flex items-center gap-1.5 text-text-muted">
                      <Clock className="h-3 w-3" /> {formatTime(r.event_time)}
                      <Users className="ml-2 h-3 w-3" /> {r.guest_count} pax
                    </p>
                    <p className="flex items-start gap-1.5 text-text-muted">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {r.venue_address}
                    </p>
                    <p className="font-semibold text-ink">{formatCurrency(r.total_amount)}</p>
                  </div>
                ))
              )}
              {dayEvents.length > 0 && (
                <Link
                  to="/admin/reservations"
                  className="block text-center text-xs font-semibold text-gold-dark hover:underline"
                >
                  Manage in Reservations →
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Next up</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-xs text-text-muted">No upcoming events.</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map(r => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(r.event_date.slice(0, 10))}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-cream-dark"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{r.customer?.name || r.booking_code}</span>
                          <span className="text-text-muted">
                            {formatDate(r.event_date)} · {formatTime(r.event_time)}
                          </span>
                        </span>
                        <Badge variant={r.status}>{STATUS_LABELS[r.status]}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EventCalendar;
