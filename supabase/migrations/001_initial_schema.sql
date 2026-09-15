-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Project: Natalie's Catering (CaterPro Management System)
-- Purpose: Complete database schema, triggers, RLS policies, and storage setup
-- ==============================================================================

-- 1. Profiles (Extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New Customer'),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Event Themes
create table if not exists event_themes (
  id serial primary key,
  name text not null,
  tagline text,
  description text,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Menu Categories
create table if not exists menu_categories (
  id serial primary key,
  name text not null,
  display_order int default 0
);

-- 4. Menu Items
create table if not exists menu_items (
  id serial primary key,
  category_id int references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price_per_head numeric(10,2) default 0,
  is_available boolean default true
);

-- 5. Packages
create table if not exists packages (
  id serial primary key,
  name text not null,
  description text,
  price_per_pax numeric(10,2) not null,
  min_pax int default 50,
  theme_id int references event_themes(id) on delete set null,
  created_at timestamptz default now()
);

-- 6. Rental Items
create table if not exists rental_items (
  id serial primary key,
  name text not null,
  category text not null,
  rate_per_unit numeric(10,2) not null,
  stock_quantity int default 0,
  is_available boolean default true
);

-- 7. Reservations
create table if not exists reservations (
  id serial primary key,
  booking_code text not null unique,
  customer_id uuid references profiles(id) on delete cascade,
  theme_id int references event_themes(id) on delete set null,
  package_id int references packages(id) on delete set null,
  event_date date not null,
  event_time time not null,
  venue_address text not null,
  guest_count int not null,
  special_requests text,
  total_amount numeric(12,2) default 0,
  status text default 'pending' check (status in ('pending','confirmed','in_progress','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. Reservation Rentals (junction)
create table if not exists reservation_rentals (
  id serial primary key,
  reservation_id int references reservations(id) on delete cascade,
  rental_item_id int references rental_items(id) on delete cascade,
  quantity int default 1,
  subtotal numeric(10,2) not null
);

-- 9. Payments
create table if not exists payments (
  id serial primary key,
  reservation_id int references reservations(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_type text not null check (payment_type in ('downpayment','full_payment','final_balance')),
  payment_method text not null check (payment_method in ('cash','bank_transfer','gcash','credit_card')),
  reference_number text,
  proof_image_url text,
  status text default 'pending_verification' check (status in ('pending_verification','verified','rejected')),
  paid_at timestamptz default now(),
  verified_at timestamptz
);

-- 10. Notifications
create table if not exists notifications (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

-- Profiles: users read own, admins read all
alter table profiles enable row level security;

create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Admins read all profiles" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Reservations: customers see own, admins see all
alter table reservations enable row level security;

create policy "Customers read own reservations" on reservations
  for select using (customer_id = auth.uid());

create policy "Customers insert own reservations" on reservations
  for insert with check (customer_id = auth.uid());

create policy "Customers update own reservations" on reservations
  for update using (customer_id = auth.uid());

create policy "Admins full access reservations" on reservations
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Reservation Rentals:
alter table reservation_rentals enable row level security;

create policy "Users read own reservation rentals" on reservation_rentals
  for select using (
    reservation_id in (select id from reservations where customer_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users insert own reservation rentals" on reservation_rentals
  for insert with check (
    reservation_id in (select id from reservations where customer_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Payments: customers see own reservation payments, admins see all
alter table payments enable row level security;

create policy "Customers read own payments" on payments
  for select using (
    reservation_id in (select id from reservations where customer_id = auth.uid())
  );

create policy "Customers insert own payments" on payments
  for insert with check (
    reservation_id in (select id from reservations where customer_id = auth.uid())
  );

create policy "Admins full access payments" on payments
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Public read for menus, themes, packages, rentals
alter table event_themes enable row level security;
create policy "Public read themes" on event_themes for select using (true);

alter table menu_categories enable row level security;
create policy "Public read categories" on menu_categories for select using (true);

alter table menu_items enable row level security;
create policy "Public read items" on menu_items for select using (true);

alter table packages enable row level security;
create policy "Public read packages" on packages for select using (true);

alter table rental_items enable row level security;
create policy "Public read rentals" on rental_items for select using (true);

-- Admin write policies for catalog tables
create policy "Admins manage themes" on event_themes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins manage categories" on menu_categories
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins manage items" on menu_items
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins manage packages" on packages
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins manage rentals" on rental_items
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Notifications: users see own only
alter table notifications enable row level security;

create policy "Users read own notifications" on notifications
  for select using (user_id = auth.uid());

create policy "Users update own notifications" on notifications
  for update using (user_id = auth.uid());

create policy "Admins insert notifications" on notifications
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or user_id = auth.uid()
  );

-- ==============================================================================
-- Supabase Storage Bucket Setup
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Authenticated users upload payment proof"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and auth.role() = 'authenticated'
  );

create policy "Users and admins view payment proofs"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    )
  );
