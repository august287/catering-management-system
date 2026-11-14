-- ==============================================================================
-- Migration: 018_fix_guest_count_check.sql
-- Fix: admins could not change the status of some reservations:
--   "new row for relation "reservations" violates check constraint
--    "reservations_guest_count_range""
--
-- Migration 008 added the 100–200 pax rule as a CHECK constraint marked
-- NOT VALID, so reservations booked before it kept their old guest counts
-- (e.g. 75 or 80 pax). But PostgreSQL re-checks a CHECK constraint on every
-- UPDATE of a row, so changing only the status of one of those older
-- reservations failed. (Same problem 017 fixed for payment references.)
--
-- This replaces the constraint with a trigger that checks the guest count only
-- when a reservation is created or its guest count is changed. Status-only
-- updates on older reservations now work, and new or edited bookings must
-- still be 100–200 pax, matching the app.
-- Safe to run repeatedly.
-- ==============================================================================

alter table public.reservations
  drop constraint if exists reservations_guest_count_range;

create or replace function public.check_reservation_guest_count()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.guest_count is not distinct from old.guest_count then
    return new; -- guest count unchanged (e.g. status change): nothing to check
  end if;

  if new.guest_count is null or new.guest_count not between 100 and 200 then
    raise exception 'Guest count must be between 100 and 200 pax.'
      using errcode = '23514'; -- check_violation
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_guest_count_range on public.reservations;
create trigger reservations_guest_count_range
  before insert or update of guest_count on public.reservations
  for each row
  execute function public.check_reservation_guest_count();
