-- ==============================================================================
-- Migration: 019_service_hours_servers_terms.sql
-- Purpose: Store the hours of service, number of servers, and the customer's
--          agreement to the terms & conditions on each reservation.
--
-- reservations.service_hours      Hours of buffet service (4 included, up to 10).
-- reservations.server_count       Servers / waitstaff booked for the event.
-- reservations.terms_accepted_at  When the customer agreed to the contract terms.
--
-- Existing rows stay NULL (shown as "standard"). Rules are enforced with a
-- column-scoped trigger so updates to old rows never trip a CHECK.
-- The app keeps working before this migration runs (it puts the details in the
-- special requests instead). Safe to run repeatedly.
-- ==============================================================================

alter table public.reservations add column if not exists service_hours smallint;
alter table public.reservations add column if not exists server_count smallint;
alter table public.reservations add column if not exists terms_accepted_at timestamptz;

create or replace function public.check_reservation_service_details()
returns trigger
language plpgsql
as $$
begin
  if new.service_hours is not null and (new.service_hours < 4 or new.service_hours > 10) then
    raise exception 'Hours of service must be between 4 and 10.' using errcode = '23514';
  end if;
  if new.server_count is not null and (new.server_count < 1 or new.server_count > 30) then
    raise exception 'Number of servers must be between 1 and 30.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_service_details_check on public.reservations;
create trigger reservations_service_details_check
  before insert or update of service_hours, server_count on public.reservations
  for each row execute function public.check_reservation_service_details();
