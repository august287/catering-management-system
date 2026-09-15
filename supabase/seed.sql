-- ==============================================================================
-- Seed Data: seed.sql
-- Project: Natalie's Catering (CaterPro Management System)
-- Purpose: Realistic Filipino Catering Seed Data
-- ==============================================================================

-- 0. Enable pgcrypto for password encryption
create extension if not exists pgcrypto;

-- 1. Demo Auth Users (Supabase auth.users & auth.identities)
-- Allows login via demo credentials:
--   admin@caterpro.ph  / admin123
--   customer@test.ph   / pass123
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@caterpro.ph',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Admin User","role":"admin"}'::jsonb,
  now(),
  now(),
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'customer@test.ph',
  crypt('pass123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Maria Santos","role":"customer"}'::jsonb,
  now(),
  now(),
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'juan@test.ph',
  crypt('pass123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Juan Dela Cruz","role":"customer"}'::jsonb,
  now(),
  now(),
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'beatrice@test.ph',
  crypt('pass123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Beatrice Lim","role":"customer"}'::jsonb,
  now(),
  now(),
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@caterpro.ph"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000001',
  now(), now(), now()
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"customer@test.ph"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000002',
  now(), now(), now()
),
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  '{"sub":"00000000-0000-0000-0000-000000000003","email":"juan@test.ph"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000003',
  now(), now(), now()
),
(
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000004',
  '{"sub":"00000000-0000-0000-0000-000000000004","email":"beatrice@test.ph"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000004',
  now(), now(), now()
)
on conflict (id) do nothing;

-- 2. Demo Profiles
insert into profiles (id, name, phone, role)
values
  ('00000000-0000-0000-0000-000000000001', 'Admin User', '0917-888-0001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Maria Santos', '0918-123-4567', 'customer'),
  ('00000000-0000-0000-0000-000000000003', 'Juan Dela Cruz', '0922-987-6543', 'customer'),
  ('00000000-0000-0000-0000-000000000004', 'Beatrice Lim', '0917-555-1212', 'customer')
on conflict (id) do update set
  name = excluded.name,
  phone = excluded.phone,
  role = excluded.role;

-- 2. Event Themes
insert into event_themes (id, name, tagline, description, image_url, is_active)
values
  (1, 'Wedding', 'Your perfect day, exquisitely served', 'Timeless romantic banquet styling with delicate table runners, elegant floral backdrops, warm fairy lights, and VIP couple dining arrangements.', '/images/2 PIC.jpg', true),
  (2, 'Birthday Celebration', 'Celebrate every milestone in grand style', 'Vibrant festive balloons, dynamic balloon arches, customized stage backdrop, themed dessert table, and party favors setup.', '/images/5.jpg', true),
  (3, 'Debut Elegance', 'A modern fairytale debutante celebration', 'Glamorous 18-roses and 18-candles grand reception, illuminated floral centerpieces, chandelier accents, and plush debutante throne.', '/images/1 PIC.jpg', true),
  (4, 'Corporate Gala', 'Professional hospitality for distinguished corporate events', 'Sleek executive banquet setup, podium styling, neat linen presentation, and polished buffet service for conferences and annual galas.', '/images/4 PIC.jpg', true),
  (5, 'Filipino Fiesta', 'Authentic traditional Pinoy feast for festive gatherings', 'Warm native bamboo accents, vibrant banner streamers, traditional banana leaf accents, and hearty heirloom banquet service.', '/images/3 PIC.jpg', true),
  (6, 'Christening & Dedication', 'Blessings and joyful memories for the little one', 'Soft pastel palettes, delicate cloud balloons, angel wings or carousel backdrop styling, and family-friendly buffet arrangements.', '/images/6.jpg', true)
on conflict (id) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  image_url = excluded.image_url;

-- 3. Menu Categories
insert into menu_categories (id, name, display_order)
values
  (1, 'Appetizers', 1),
  (2, 'Soup & Salad', 2),
  (3, 'Main Course (Meat & Poultry)', 3),
  (4, 'Seafood Special', 4),
  (5, 'Rice & Noodles', 5),
  (6, 'Desserts & Beverages', 6)
on conflict (id) do update set name = excluded.name, display_order = excluded.display_order;

-- 4. Menu Items
insert into menu_items (id, category_id, name, description, price_per_head, is_available)
values
  -- Appetizers
  (1, 1, 'Lumpiang Shanghai', 'Crispy golden fried pork and vegetable spring rolls with house sweet & sour dip', 120.00, true),
  (2, 1, 'Dynamite Cheese Sticks', 'Green finger chili stuffed with mild cheddar and cream cheese, fried golden', 135.00, true),
  (3, 1, 'Savory Beef Canapés', 'Herb toasted crostini topped with tender roast beef slivers and caramelized onion', 150.00, true),
  (4, 1, 'Pork Siomai Dimsum', 'Steamed homemade pork and shrimp dumplings with calamansi chili garlic soy', 110.00, true),

  -- Soup & Salad
  (5, 2, 'Cream of Wild Mushroom', 'Velvety slow-simmered forest mushrooms with fresh cream and butter croutons', 110.00, true),
  (6, 2, 'Sinigang na Hipon Broth', 'Tamarind sour soup with fresh river prawns and native garden vegetables', 160.00, true),
  (7, 2, 'Kani & Mango Garden Salad', 'Crisp romaine, sweet ripe mango cubes, Japanese crab stick, and sesame vinaigrette', 140.00, true),

  -- Main Course
  (8, 3, 'Slow-Roasted Beef Caldereta', 'Fork-tender beef brisket slow-cooked in rich tomato liver sauce with bell peppers and cheese', 295.00, true),
  (9, 3, 'Crispy Lechon Kawali', 'Crispy pork belly with crackling golden skin served with spiced liver sauce', 280.00, true),
  (10, 3, 'Chicken Inasal Bacolod Style', 'Grilled lemongrass and annatto-marinated chicken cuts with chicken oil garlic rice dip', 220.00, true),
  (11, 3, 'Classic Kare-Kareng Baka', 'Slow-cooked beef shanks and tripe in rich savory peanut sauce with sautéed bagoong alamang', 310.00, true),
  (12, 3, 'Crispy Pata Premiere', 'Deep-fried pork knuckle with crispy blistered skin and spicy vinegar soy dip', 350.00, true),
  (13, 3, 'Pork Ribs Barbecue', 'Tender grilled pork loin ribs glazed in smoky sweet honey barbecue marinade', 260.00, true),

  -- Seafood
  (14, 4, 'Garlic Butter Tiger Prawns', 'Sautéed succulent prawns tossed in golden garlic butter and parsley', 340.00, true),
  (15, 4, 'Sweet & Sour Lapu-Lapu', 'Crispy fried local grouper topped with sweet and tangy bell pepper ginger glaze', 320.00, true),

  -- Rice & Noodles
  (16, 5, 'Special Pancit Canton Guisado', 'Egg noodles stir-fried with chicken strips, shrimp, pork meatballs, and crisp vegetables', 130.00, true),
  (17, 5, 'Pancit Sotanghon Guisado', 'Silky glass vermicelli noodles with shredded chicken, wood-ear mushrooms, and toasted garlic', 135.00, true),
  (18, 5, 'Fragrant Pandan Steamed Rice', 'Fluffy jasmine rice cooked with fresh pandan leaves', 35.00, true),
  (19, 5, 'Toasted Garlic Golden Rice', 'Jasmine rice fried with fragrant roasted minced garlic and spring onion', 45.00, true),
  (20, 5, 'Savory Java Rice', 'Annatto-infused rice with subtle herbs and sweet corn kernels', 50.00, true),

  -- Desserts & Drinks
  (21, 6, 'Royal Leche Flan', 'Velvety smooth caramel custard made with rich egg yolks and condensed milk', 95.00, true),
  (22, 6, 'Buko Pandan Supreme', 'Young coconut strips and fragrant pandan jelly in sweetened rich cream', 90.00, true),
  (23, 6, 'Classic Ube Halaya', 'Slow-stirred purple yam jam with toasted coconut latik topping', 105.00, true),
  (24, 6, 'Chilled Mango Float Cups', 'Graham cracker crust layered with fresh sweet Manila mango and whipped cream', 95.00, true),
  (25, 6, 'Traditional Sago''t Gulaman', 'Chilled brown sugar and pandan syrup with chewy tapioca pearls and grass jelly', 60.00, true),
  (26, 6, 'Fresh Calamansi Honey Cooler', 'Zesty freshly-squeezed native calamansi juice with wild forest honey', 65.00, true)
on conflict (id) do update set name = excluded.name, price_per_head = excluded.price_per_head;

-- 5. Catering Packages
insert into packages (id, name, description, price_per_pax, min_pax, theme_id)
values
  (1, 'Silver Buffet', '1 Soup, 1 Appetizer, 3 Main Courses (Pork, Chicken, Fish), 1 Noodle, 1 Rice, 1 Dessert, Bottomless Iced Tea. Complete buffet setup with floral arrangement and trained waiters.', 450.00, 50, null),
  (2, 'Gold Feast', '1 Soup, 2 Appetizers, 4 Main Courses (Beef, Pork, Chicken, Seafood), 1 Noodle, 2 Rice varieties, 2 Desserts, Bottomless Specialty Cooler. Complete themed setup with centerpiece on all guest tables.', 650.00, 50, null),
  (3, 'Platinum Royal Banquet', 'Full wedding grand reception: 2 Soups, 3 Appetizers, 5 Premium Mains including Roasted Beef Caldereta & Tiger Prawns, 2 Noodles, 3 Gourmet Desserts, Champagne toast, VIP Table service & centerpiece.', 950.00, 80, 1),
  (4, 'Debutante Special Feast', 'Curated for 18th Birthdays: 2 Appetizers, 4 Main Courses, 1 Pasta/Noodle, Steamed Rice, 2 Desserts, Mocktail fountain, Debutante stage decor and 18-roses arrangement coordination.', 550.00, 60, 3),
  (5, 'Corporate Lite Executive', 'Tailored for conferences, seminars, and corporate meetings: Quick-serve hot buffet with 3 Mains, 1 Vegetable/Salad, Rice, Dessert, and Fresh Brewed Coffee / Iced Tea station.', 400.00, 30, 4)
on conflict (id) do update set name = excluded.name, price_per_pax = excluded.price_per_pax;

-- 6. Rental Items
insert into rental_items (id, name, category, rate_per_unit, stock_quantity, is_available)
values
  (1, 'Tiffany Gold Chairs', 'Seating', 85.00, 350, true),
  (2, 'Round Banquet Tables (10-Seater)', 'Tables', 350.00, 45, true),
  (3, 'Stainless Roll-Top Chafing Dish', 'Food Service', 250.00, 40, true),
  (4, 'Full Drop Embroidered Table Linen', 'Linens', 120.00, 60, true),
  (5, 'Spandex Chair Covers with Gold Satin Bow', 'Linens', 45.00, 400, true),
  (6, 'Cocktail Highboy Tables with Spandex Cover', 'Tables', 200.00, 25, true),
  (7, 'Mobile Sound System with 2 Cordless Mics', 'Audio & Lights', 2500.00, 5, true),
  (8, 'LED Uplighting Set (8 Warm Amber Pars)', 'Audio & Lights', 1800.00, 6, true)
on conflict (id) do update set name = excluded.name, rate_per_unit = excluded.rate_per_unit;

-- 7. Realistic Reservations
insert into reservations (id, booking_code, customer_id, theme_id, package_id, event_date, event_time, venue_address, guest_count, special_requests, total_amount, status, created_at)
values
  (1, 'RES-2026-0001', '00000000-0000-0000-0000-000000000002', 1, 3, '2026-10-24', '17:00:00', 'Fernwood Gardens, Quezon City', 150, 'Allergies: No peanuts for 2 VIP guests. Warm amber uplighting preferred.', 142500.00, 'confirmed', now() - interval '14 days'),
  (2, 'RES-2026-0002', '00000000-0000-0000-0000-000000000003', 2, 2, '2026-10-28', '11:30:00', 'San Antonio Clubhouse, Makati City', 80, 'Lightning McQueen backdrop setup for child 7th birthday.', 52000.00, 'confirmed', now() - interval '10 days'),
  (3, 'RES-2026-0003', '00000000-0000-0000-0000-000000000004', 3, 4, '2026-11-05', '18:00:00', 'The Blue Leaf Pavilion, Taguig', 120, '18 roses coordinator table, Cinderella theme palette.', 66000.00, 'in_progress', now() - interval '8 days'),
  (4, 'RES-2026-0004', '00000000-0000-0000-0000-000000000002', 4, 5, '2026-11-12', '09:00:00', 'BGC Tower Function Hall 4B, Taguig', 60, 'Coffee station setup 30 minutes prior to keynote.', 24000.00, 'pending', now() - interval '3 days'),
  (5, 'RES-2026-0005', '00000000-0000-0000-0000-000000000003', 5, 1, '2026-11-20', '12:00:00', 'Barangay San Isidro Community Hall, Pasig', 100, 'Additional rice warmer requested.', 45000.00, 'pending', now() - interval '2 days'),
  (6, 'RES-2026-0006', '00000000-0000-0000-0000-000000000004', 6, 2, '2026-11-25', '10:30:00', 'Holy Trinity Hall, San Juan', 75, 'Pastel blue theme with angel wings photo booth.', 48750.00, 'pending', now() - interval '1 day'),
  (7, 'RES-2026-0007', '00000000-0000-0000-0000-000000000002', 1, 3, '2026-08-15', '16:00:00', 'Villa Milagros Events Place, Rodriguez Rizal', 180, 'Completed wedding banquet. Exceptional compliments on Kare-Kare.', 171000.00, 'completed', now() - interval '40 days'),
  (8, 'RES-2026-0008', '00000000-0000-0000-0000-000000000003', 4, 5, '2026-08-22', '08:30:00', 'Ortigas Center Boardroom, Pasig', 40, 'Quarterly shareholder lunch.', 16000.00, 'completed', now() - interval '32 days'),
  (9, 'RES-2026-0009', '00000000-0000-0000-0000-000000000004', 2, 1, '2026-09-01', '14:00:00', 'Valle Verde 2 Clubhouse, Pasig', 90, '50th Golden Jubilee Birthday.', 40500.00, 'completed', now() - interval '20 days'),
  (10, 'RES-2026-0010', '00000000-0000-0000-0000-000000000002', 5, 2, '2026-09-10', '18:00:00', 'Marikina River Park Pavilion', 110, 'Alumni Reunion Feast.', 71500.00, 'completed', now() - interval '12 days'),
  (11, 'RES-2026-0011', '00000000-0000-0000-0000-000000000003', 1, 2, '2026-10-05', '15:00:00', 'Taal Vista Hotel Viewdeck, Tagaytay', 70, 'Client rescheduled to next year due to overseas travel.', 45500.00, 'cancelled', now() - interval '15 days'),
  (12, 'RES-2026-0012', '00000000-0000-0000-0000-000000000004', 3, 4, '2026-09-18', '17:00:00', 'Oasis Manila, New Manila, QC', 100, 'Cancelled by client request.', 55000.00, 'cancelled', now() - interval '5 days'),
  (13, 'RES-2026-0013', '00000000-0000-0000-0000-000000000002', 1, 3, '2026-12-10', '17:30:00', 'Glass Garden Events Venue, Pasig', 200, 'Winter wonderland floral motif.', 190000.00, 'confirmed', now() - interval '6 days'),
  (14, 'RES-2026-0014', '00000000-0000-0000-0000-000000000003', 2, 2, '2026-12-18', '12:00:00', 'Acropolis Clubhouse, Quezon City', 85, 'Family reunion and Christmas birthday.', 55250.00, 'confirmed', now() - interval '4 days'),
  (15, 'RES-2026-0015', '00000000-0000-0000-0000-000000000004', 4, 5, '2026-12-22', '18:00:00', 'Grand Hyatt Ballroom, Taguig', 150, 'Annual Company Year-End Thanksgiving Banquet.', 60000.00, 'confirmed', now() - interval '2 days')
on conflict (id) do nothing;

-- 8. Reservation Rentals
insert into reservation_rentals (reservation_id, rental_item_id, quantity, subtotal)
values
  (1, 1, 150, 12750.00),
  (1, 2, 15, 5250.00),
  (1, 8, 2, 3600.00),
  (2, 6, 4, 800.00),
  (3, 1, 120, 10200.00),
  (3, 7, 1, 2500.00),
  (7, 1, 180, 15300.00),
  (13, 1, 200, 17000.00)
on conflict (id) do nothing;

-- 9. Payments
insert into payments (id, reservation_id, amount, payment_type, payment_method, reference_number, proof_image_url, status, paid_at, verified_at)
values
  (1, 1, 71250.00, 'downpayment', 'gcash', 'GCASH-20260902-984210', '/images/receipt_sample.svg', 'verified', now() - interval '13 days', now() - interval '12 days'),
  (2, 2, 26000.00, 'downpayment', 'bank_transfer', 'BDO-REF-492019482', '/images/receipt_sample.svg', 'verified', now() - interval '9 days', now() - interval '8 days'),
  (3, 3, 33000.00, 'downpayment', 'gcash', 'GCASH-20260908-112394', '/images/receipt_sample.svg', 'verified', now() - interval '7 days', now() - interval '6 days'),
  (4, 7, 85500.00, 'downpayment', 'bank_transfer', 'BPI-TRF-883920114', '/images/receipt_sample.svg', 'verified', now() - interval '38 days', now() - interval '37 days'),
  (5, 7, 85500.00, 'final_balance', 'credit_card', 'CC-AUTH-77392104', '/images/receipt_sample.svg', 'verified', now() - interval '41 days', now() - interval '40 days'),
  (6, 8, 16000.00, 'full_payment', 'bank_transfer', 'BDO-CORP-9921004', '/images/receipt_sample.svg', 'verified', now() - interval '31 days', now() - interval '30 days'),
  (7, 9, 40500.00, 'full_payment', 'gcash', 'GCASH-20260830-449102', '/images/receipt_sample.svg', 'verified', now() - interval '19 days', now() - interval '18 days'),
  (8, 10, 71500.00, 'full_payment', 'cash', 'RECEIPT-OR-09482', '/images/receipt_sample.svg', 'verified', now() - interval '11 days', now() - interval '10 days'),
  (9, 4, 12000.00, 'downpayment', 'gcash', 'GCASH-20260914-774910', '/images/receipt_sample.svg', 'pending_verification', now() - interval '1 day', null),
  (10, 13, 95000.00, 'downpayment', 'bank_transfer', 'METRO-TRF-66392011', '/images/receipt_sample.svg', 'pending_verification', now() - interval '4 hours', null)
on conflict (id) do nothing;

-- 10. Notifications
insert into notifications (id, user_id, title, message, is_read, created_at)
values
  (1, '00000000-0000-0000-0000-000000000001', 'New Reservation Received', 'Booking RES-2026-0004 for Corporate Gala (60 pax) requires review.', false, now() - interval '3 days'),
  (2, '00000000-0000-0000-0000-000000000001', 'Payment Submitted for Verification', 'Customer Maria Santos submitted ₱12,000 via GCash for RES-2026-0004.', false, now() - interval '1 day'),
  (3, '00000000-0000-0000-0000-000000000001', 'High-Value Payment Alert', 'Reservation RES-2026-0013 submitted ₱95,000 downpayment via Bank Transfer.', false, now() - interval '4 hours'),
  (4, '00000000-0000-0000-0000-000000000002', 'Reservation Confirmed', 'Your Wedding booking RES-2026-0001 has been confirmed by management.', true, now() - interval '12 days'),
  (5, '00000000-0000-0000-0000-000000000002', 'Downpayment Received', 'Thank you! Downpayment of ₱71,250.00 for RES-2026-0001 is verified.', true, now() - interval '12 days'),
  (6, '00000000-0000-0000-0000-000000000003', 'Birthday Booking Confirmed', 'Your booking RES-2026-0002 for 80 pax at San Antonio Clubhouse is confirmed.', true, now() - interval '8 days')
on conflict (id) do nothing;
