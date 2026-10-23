-- ==============================================================================
-- Migration 007: Prevent duplicate payment transaction references
-- Enforced across all customers (the app's client-side check only sees rows
-- visible under RLS). Empty/null references are ignored.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_number_unique
  ON public.payments (lower(trim(reference_number)))
  WHERE reference_number IS NOT NULL AND trim(reference_number) <> '';
