-- ==============================================================================
-- Migration: 016_menu_customization.sql
-- Purpose: Let customers choose their dishes when booking, within what their
--          package allows.
--
-- packages.menu_rules     How many dishes per course the package includes, e.g.
--                         {"counts": {"main": 3, "appetizer": 1, "dessert": 1,
--                                     "rice": 1, "soup": 1, "noodle": 1},
--                          "included": ["Bottomless Iced Tea"]}
--                         Course keys: appetizer, soup, main, noodle, rice,
--                         dessert, drink. Admins edit this in Menu Management.
-- reservations.menu_selection
--                         The dishes the customer picked:
--                         [{"course": "main", "item_id": 9, "name": "Crispy Lechon Kawali"}, ...]
--
-- The app keeps working before this migration runs (it uses built-in defaults
-- and puts the chosen menu in the special requests instead).
-- Safe to run repeatedly.
-- ==============================================================================

alter table public.packages add column if not exists menu_rules jsonb;
alter table public.reservations add column if not exists menu_selection jsonb;

-- Keep the stored shapes sane (the app validates the details).
alter table public.packages drop constraint if exists packages_menu_rules_shape;
alter table public.packages add constraint packages_menu_rules_shape check (
  menu_rules is null
  or (jsonb_typeof(menu_rules) = 'object' and jsonb_typeof(menu_rules -> 'counts') = 'object')
);

alter table public.reservations drop constraint if exists reservations_menu_selection_shape;
alter table public.reservations add constraint reservations_menu_selection_shape check (
  menu_selection is null
  or (jsonb_typeof(menu_selection) = 'array' and jsonb_array_length(menu_selection) <= 60)
);

-- Starting allowances for the standard tiers (only where none is set yet),
-- taken from each package's description.
update public.packages set menu_rules =
  '{"counts": {"soup": 1, "appetizer": 1, "main": 3, "noodle": 1, "rice": 1, "dessert": 1}, "included": ["Bottomless Iced Tea"]}'
where menu_rules is null and name ilike '%silver%';

update public.packages set menu_rules =
  '{"counts": {"soup": 1, "appetizer": 2, "main": 4, "noodle": 1, "rice": 2, "dessert": 2}, "included": ["Bottomless Specialty Cooler"]}'
where menu_rules is null and name ilike '%gold%';

update public.packages set menu_rules =
  '{"counts": {"soup": 2, "appetizer": 3, "main": 5, "noodle": 2, "rice": 1, "dessert": 3}, "included": ["Champagne Toast", "VIP Table Service"]}'
where menu_rules is null and (name ilike '%platinum%' or name ilike '%royal%');

update public.packages set menu_rules =
  '{"counts": {"appetizer": 2, "main": 4, "noodle": 1, "rice": 1, "dessert": 2}, "included": ["Mocktail Fountain"]}'
where menu_rules is null and name ilike '%debut%';

update public.packages set menu_rules =
  '{"counts": {"soup": 1, "main": 3, "rice": 1, "dessert": 1}, "included": ["Fresh Brewed Coffee & Iced Tea Station"]}'
where menu_rules is null and name ilike '%corporate%';
