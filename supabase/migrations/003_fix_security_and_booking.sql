-- ==============================================================================
-- Migration: 003_fix_security_and_booking.sql
-- Fixes:
-- BUG-01: Server-side sequence & trigger for unique booking_code generation
-- BUG-02: Policy permitting authenticated users to insert notifications
-- BUG-05: Drop unrestricted customer update policy on reservations
-- BUG-06: Security definer handle_new_user() hard-codes 'customer' role
-- ==============================================================================

-- BUG-01: Booking code sequence & trigger
CREATE SEQUENCE IF NOT EXISTS booking_code_seq START WITH 16;

CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_code IS NULL OR EXISTS (SELECT 1 FROM reservations WHERE booking_code = NEW.booking_code) THEN
    NEW.booking_code := 'RES-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('booking_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_code ON reservations;
CREATE TRIGGER set_booking_code
  BEFORE INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION generate_booking_code();

-- BUG-02: Allow authenticated users to insert notifications (customers notify admin, admin notifies customers)
DROP POLICY IF EXISTS "Admins insert notifications" ON notifications;
CREATE POLICY "Authenticated insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- BUG-05: Drop unrestricted customer update policy on reservations
DROP POLICY IF EXISTS "Customers update own reservations" ON reservations;

-- BUG-06: Security definer handle_new_user() must never trust client-supplied role
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New Customer'),
    NEW.raw_user_meta_data->>'phone',
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- BUG-10: Setup payment-proofs storage bucket with 5MB limit and secure RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Authenticated users upload payment proof" ON storage.objects;
CREATE POLICY "Authenticated users upload payment proof"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users and admins view payment proofs" ON storage.objects;
CREATE POLICY "Users and admins view payment proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

