-- ==============================================================================
-- Migration 006: Dish / menu item photos
-- Adds an image column to menu_items plus a public storage bucket that admins
-- can upload dish photos to. Existing rows keep working with a UI fallback.
-- ==============================================================================

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public read menu images" ON storage.objects;
CREATE POLICY "Public read menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Admins manage menu images" ON storage.objects;
CREATE POLICY "Admins manage menu images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'menu-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());
