import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockData';
import { AvailabilityMap, buildAvailabilityMap, toDateKey } from '@/lib/availability';
import type { Reservation } from '@/types/database';

const POLL_MS = 20000;
const DATA_CHANGED_EVENT = 'catering:data-changed';

/** Fetch active-booking counts per date between two 'YYYY-MM-DD' keys. */
export async function fetchAvailability(fromKey: string, toKey: string): Promise<AvailabilityMap> {
  if (!isSupabaseConfigured()) {
    const all = buildAvailabilityMap(mockStore.getReservations());
    return Object.fromEntries(Object.entries(all).filter(([k]) => k >= fromKey && k <= toKey));
  }
  const { data, error } = await supabase.rpc('get_date_availability', {
    p_from: fromKey,
    p_to: toKey,
  });
  if (error) {
    // Function not deployed yet (migration 011 not run): count the rows this
    // user can see. Complete for admins; customers only see their own.
    if (error.code === 'PGRST202' || /get_date_availability/.test(error.message)) {
      console.warn('get_date_availability missing; run supabase/migrations/011_reservation_availability.sql');
      const { data: rows, error: rowsErr } = await supabase
        .from('reservations')
        .select('id, event_date, status')
        .gte('event_date', fromKey)
        .lte('event_date', toKey);
      if (rowsErr) throw new Error(rowsErr.message);
      return buildAvailabilityMap((rows || []) as Pick<Reservation, 'id' | 'event_date' | 'status'>[]);
    }
    throw new Error(error.message);
  }
  const map: AvailabilityMap = {};
  for (const row of (data || []) as { event_date: string; booked_count: number }[]) {
    map[row.event_date.slice(0, 10)] = row.booked_count;
  }
  return map;
}

/**
 * Live availability for a date window. Re-fetches when bookings change in this
 * tab, another tab, or (with Supabase) on any reservation change, on focus,
 * and on a short poll as a safety net.
 */
export function useDateAvailability(from: Date, to: Date) {
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Which window the current data covers, so a month switch never shows the
  // new month as "all open" before its counts arrive.
  const [loadedRange, setLoadedRange] = useState<string | null>(null);
  const rangeKey = `${fromKey}|${toKey}`;
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const map = await fetchAvailability(fromKey, toKey);
      if (id !== requestId.current) return; // a newer request won
      setAvailability(map);
      setLoadedRange(`${fromKey}|${toKey}`);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (id !== requestId.current) return;
      setError(err?.message || 'Could not load availability.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fromKey, toKey]);

  useEffect(() => {
    setLoading(true);
    refresh();

    const onChanged = () => refresh();
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    // Fires when another tab writes the local demo store.
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('reservations')) refresh();
    };

    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    window.addEventListener('focus', onChanged);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    const pollId = window.setInterval(refresh, POLL_MS);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('availability-' + Math.random().toString(36).slice(2, 9))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, onChanged)
        .subscribe();
    }

    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
      window.removeEventListener('focus', onChanged);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(pollId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { availability, loading, error, lastUpdated, refresh, ready: loadedRange === rangeKey };
}

export default useDateAvailability;
