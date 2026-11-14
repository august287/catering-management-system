-- ==============================================================================
-- Migration: 011_reservation_availability.sql
-- Purpose: Live date availability for the reservation calendar, and a hard
-- server-side guard against double bookings.
--
-- 1. get_date_availability(from, to): returns how many active bookings each
--    date has. Customers can only SELECT their own reservations under RLS, so
--    this SECURITY DEFINER function exposes counts only (no customer data).
-- 2. prevent_double_booking trigger: rejects an insert/update that would put
--    more than `max_events_per_day` active bookings on one date. An advisory
--    lock per date serialises concurrent submits, so two customers clicking
--    "Submit" at the same moment cannot both win the last slot.
-- 3. Adds reservations to the Realtime publication so admin calendars update
--    the moment a booking lands.
--
-- Keep max_events_per_day in sync with MAX_EVENTS_PER_DAY in
-- src/lib/availability.ts. Safe to run repeatedly (idempotent).
-- ==============================================================================

create or replace function public.max_events_per_day()
returns int
language sql
immutable
as $$ select 1 $$;

-- Cancelled and completed bookings no longer hold a date.
create or replace function public.reservation_blocks_date(p_status text)
returns boolean
language sql
immutable
as $$ select p_status in ('pending', 'confirmed', 'in_progress') $$;

create or replace function public.get_date_availability(p_from date, p_to date)
returns table (event_date date, booked_count int, capacity int)
language sql
stable
security definer
set search_path = public
as $$
  select r.event_date,
         count(*)::int as booked_count,
         public.max_events_per_day() as capacity
  from public.reservations r
  where r.event_date between p_from and p_to
    and public.reservation_blocks_date(r.status::text)
  group by r.event_date
  order by r.event_date;
$$;

revoke all on function public.get_date_availability(date, date) from public;
grant execute on function public.get_date_availability(date, date) to anon, authenticated;

create or replace function public.prevent_double_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taken int;
begin
  if not public.reservation_blocks_date(new.status::text) then
    return new;
  end if;

  -- Only re-check an update when the date or the blocking state changed.
  if tg_op = 'UPDATE'
     and old.event_date = new.event_date
     and public.reservation_blocks_date(old.status::text) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('reservation_date:' || new.event_date::text));

  select count(*) into v_taken
  from public.reservations r
  where r.event_date = new.event_date
    and r.id is distinct from new.id
    and public.reservation_blocks_date(r.status::text);

  if v_taken >= public.max_events_per_day() then
    raise exception 'DATE_FULLY_BOOKED: % is already fully booked.', new.event_date
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_double_booking on public.reservations;
create trigger prevent_double_booking
  before insert or update of event_date, status on public.reservations
  for each row execute function public.prevent_double_booking();

alter table public.reservations replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;
end $$;
