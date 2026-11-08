-- ==============================================================================
-- Migration: 012_auto_cancel_double_bookings.sql
-- Purpose: Automatically cancel double bookings.
--
-- Migration 011 blocks new double bookings, but dates can still end up with
-- more than max_events_per_day() active bookings (rows saved before 011, data
-- imports, manual edits with the trigger disabled). This migration:
--
-- 1. resolve_double_bookings(): for every over-booked date, keeps the most
--    advanced booking (in_progress > confirmed > pending, then the earliest
--    created) and sets the rest to 'cancelled'. Each affected customer gets a
--    notification, and every admin gets a summary. Returns the cancelled rows.
--    Admin-only when called from the app; runs as the owner inside this file.
-- 2. Runs it once now to clean existing data.
--
-- Keep the ordering in sync with findDoubleBookingLosers() in
-- src/lib/availability.ts. Safe to run repeatedly (idempotent).
-- ==============================================================================

create or replace function public.resolve_double_bookings()
returns table (id int, booking_code text, event_date date, customer_id uuid)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
begin
  -- Only admins may trigger this from the API. Direct SQL (auth.uid() is null)
  -- such as this migration is allowed.
  if auth.uid() is not null and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Only administrators can resolve double bookings.' using errcode = '42501';
  end if;

  -- One resolver at a time, so two admins can't double-notify customers.
  perform pg_advisory_xact_lock(hashtext('resolve_double_bookings'));

  for r in
    with ranked as (
      select res.id,
             res.booking_code,
             res.event_date,
             res.customer_id,
             row_number() over (
               partition by res.event_date
               order by case res.status::text
                          when 'in_progress' then 0
                          when 'confirmed' then 1
                          else 2
                        end,
                        res.created_at,
                        res.id
             ) as rn
      from public.reservations res
      where public.reservation_blocks_date(res.status::text)
    )
    select ranked.* from ranked where ranked.rn > public.max_events_per_day()
  loop
    update public.reservations set status = 'cancelled' where reservations.id = r.id;

    insert into public.notifications (user_id, title, message)
    values (
      r.customer_id,
      'Reservation Auto-Cancelled (Double Booking)',
      format(
        'Your booking %s on %s was automatically cancelled because the date was already booked. Please choose another date. Any payment made will be refunded or moved to your new booking.',
        r.booking_code,
        to_char(r.event_date, 'Mon DD, YYYY')
      )
    );

    insert into public.notifications (user_id, title, message)
    select p.id,
           'Double Booking Auto-Cancelled',
           format('%s on %s was automatically cancelled to resolve a double booking.',
                  r.booking_code, to_char(r.event_date, 'Mon DD, YYYY'))
    from public.profiles p
    where p.role = 'admin';

    id := r.id;
    booking_code := r.booking_code;
    event_date := r.event_date;
    customer_id := r.customer_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.resolve_double_bookings() from public;
grant execute on function public.resolve_double_bookings() to authenticated;

-- Clean up any double bookings that already exist.
select * from public.resolve_double_bookings();

-- Live updates for payment lists and dashboards (reservations were added in 011).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
