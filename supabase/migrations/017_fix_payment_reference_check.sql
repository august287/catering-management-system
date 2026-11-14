-- ==============================================================================
-- Migration: 017_fix_payment_reference_check.sql
-- Fix: admins could not verify or reject some payments:
--   "new row for relation "payments" violates check constraint
--    "payments_reference_number_format""
--
-- Migration 009 added the reference-number format rule as a CHECK constraint
-- marked NOT VALID, so payments saved before it kept their old references
-- (e.g. "GCASH 1234", "#5566"). But PostgreSQL re-checks a CHECK constraint on
-- every UPDATE of a row, so changing only the status of one of those older
-- payments failed.
--
-- This replaces the constraint with a trigger that checks the reference only
-- when a payment is created or its reference number is changed. Status-only
-- updates (verify / reject) on older payments now work, and new or edited
-- references must still use the same format as the app:
--   6–80 characters, letters/digits first, then letters, digits, . _ -
-- Safe to run repeatedly.
-- ==============================================================================

alter table public.payments
  drop constraint if exists payments_reference_number_format;

create or replace function public.check_payment_reference_format()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ref text := btrim(coalesce(new.reference_number, ''));
begin
  if tg_op = 'UPDATE' and new.reference_number is not distinct from old.reference_number then
    return new; -- reference unchanged (e.g. verifying the payment): nothing to check
  end if;

  if ref <> '' and not (
    char_length(ref) between 6 and 80
    and ref ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
  ) then
    raise exception 'Invalid payment reference number. Use 6–80 letters or digits (. _ - allowed).'
      using errcode = '23514'; -- check_violation
  end if;

  return new;
end;
$$;

drop trigger if exists payments_reference_number_format on public.payments;
create trigger payments_reference_number_format
  before insert or update of reference_number on public.payments
  for each row
  execute function public.check_payment_reference_format();
