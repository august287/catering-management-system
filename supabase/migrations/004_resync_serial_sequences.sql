-- ==============================================================================
-- Migration: 004_resync_serial_sequences.sql
-- Fixes: duplicate key value violates unique constraint "<table>_pkey"
--
-- Root cause:
--   seed.sql inserts rows with explicit ids (e.g. reservations 1..15). PostgreSQL
--   does NOT advance a serial column's sequence when an explicit id is supplied,
--   so the next app insert calls nextval() and receives 1 -> collides with the
--   seeded row id 1. This migration advances every serial sequence to the current
--   max(id) so subsequent inserts continue after the seeded rows.
--
-- Safe to run repeatedly (idempotent).
-- ==============================================================================

select setval(pg_get_serial_sequence('public.event_themes', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.event_themes;

select setval(pg_get_serial_sequence('public.menu_categories', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.menu_categories;

select setval(pg_get_serial_sequence('public.menu_items', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.menu_items;

select setval(pg_get_serial_sequence('public.packages', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.packages;

select setval(pg_get_serial_sequence('public.rental_items', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.rental_items;

select setval(pg_get_serial_sequence('public.reservations', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.reservations;

select setval(pg_get_serial_sequence('public.reservation_rentals', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.reservation_rentals;

select setval(pg_get_serial_sequence('public.payments', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.payments;

select setval(pg_get_serial_sequence('public.notifications', 'id'),
              coalesce(max(id), 1), max(id) is not null)
from public.notifications;

-- Keep the booking-code sequence ahead of every existing seeded code so the
-- set_booking_code trigger can never generate a duplicate booking_code.
select setval('public.booking_code_seq',
              greatest(
                coalesce((
                  select max((regexp_replace(booking_code, '^RES-\d{4}-', ''))::int)
                  from public.reservations
                ), 0),
                15
              ) + 1,
              false);
