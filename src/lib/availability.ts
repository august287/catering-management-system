import type { Reservation, ReservationStatus } from '@/types/database';

// How many events the kitchen can cater on one date. Keep in sync with
// max_events_per_day() in supabase/migrations/011_reservation_availability.sql.
export const MAX_EVENTS_PER_DAY = 1;

// Statuses that hold a date. Cancelled and completed bookings free it up.
export const BLOCKING_STATUSES: ReservationStatus[] = ['pending', 'confirmed', 'in_progress'];

export const DOUBLE_BOOKING_MESSAGE =
  'Sorry, that date was just booked by someone else. Please pick another available date.';

export type DateStatus = 'past' | 'too_soon' | 'available' | 'limited' | 'booked';

/** Map of 'YYYY-MM-DD' -> number of active bookings on that date. */
export type AvailabilityMap = Record<string, number>;

export function blocksDate(status: ReservationStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildAvailabilityMap(
  reservations: Pick<Reservation, 'id' | 'event_date' | 'status'>[],
  excludeReservationId?: number
): AvailabilityMap {
  const map: AvailabilityMap = {};
  for (const r of reservations) {
    if (!r.event_date || !blocksDate(r.status)) continue;
    if (excludeReservationId !== undefined && r.id === excludeReservationId) continue;
    const key = r.event_date.slice(0, 10);
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

export function isDateFullyBooked(
  map: AvailabilityMap,
  dateKey: string,
  capacity: number = MAX_EVENTS_PER_DAY
): boolean {
  return (map[dateKey] || 0) >= capacity;
}

/**
 * Classify a calendar date. `todayKey` and `minBookableKey` are 'YYYY-MM-DD'
 * strings so comparisons stay in the user's local calendar.
 */
export function getDateStatus(
  dateKey: string,
  map: AvailabilityMap,
  todayKey: string,
  minBookableKey: string,
  capacity: number = MAX_EVENTS_PER_DAY
): DateStatus {
  if (dateKey < todayKey) return 'past';
  const booked = map[dateKey] || 0;
  if (booked >= capacity) return 'booked';
  if (dateKey < minBookableKey) return 'too_soon';
  return booked > 0 ? 'limited' : 'available';
}

export function isDoubleBookingError(message: string | undefined | null): boolean {
  return !!message && message.includes('DATE_FULLY_BOOKED');
}

/** Dates shown in a month grid, padded to whole weeks (Sunday first). */
export function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const last = new Date(year, month + 1, 0);
  const end = new Date(year, month, last.getDate() + (6 - last.getDay()));
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}
