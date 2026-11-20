-- ==============================================================================
-- Migration: 020_rental_item_photos.sql
-- Adds a photo column to rental_items and gives the seeded rentals formal names
-- and photos (served from /images/rentals).
--
-- Rows are matched by id so existing reservation_rentals links, rates and stock
-- are untouched. Safe to run repeatedly.
-- ==============================================================================

alter table public.rental_items add column if not exists image_url text;

update public.rental_items as r
set name = v.name,
    category = v.category,
    image_url = v.image_url
from (values
  (1, 'Monobloc Chairs', 'Seating', '/images/rentals/monobloc-chair.webp'),
  (2, 'Banquet Table (7-Seater)', 'Tables', '/images/rentals/table-7-seater.webp'),
  (3, 'Long Banquet Table (12-Seater)', 'Tables', '/images/rentals/long-table-12-seater.webp'),
  (4, 'Full-Drop Embroidered Table Linen', 'Linens', '/images/rentals/full-drop-embroidered-table-linen.webp'),
  (5, 'Spandex Chair Cover with Gold Satin Bow', 'Linens', '/images/rentals/spandex-chair-cover-gold-satin-bow.webp'),
  (6, 'Cocktail Highboy Table with Spandex Cover', 'Tables', '/images/rentals/cocktail-highboy-table.webp'),
  (7, 'Mobile Sound System with Two Cordless Microphones', 'Audio & Lights', '/images/rentals/mobile-sound-system.webp'),
  (8, 'LED Uplighting Set (8 Warm Amber Par Lights)', 'Audio & Lights', '/images/rentals/led-uplighting-set.webp')
) as v(id, name, category, image_url)
where r.id = v.id;
