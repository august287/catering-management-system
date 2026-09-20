-- ==============================================================================
-- Migration: 002_fix_rls_infinite_recursion.sql
-- Fix: Infinite recursion in RLS policies referencing profiles table
-- ==============================================================================

-- 1. Security definer function to check admin status without triggering RLS recursion
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- Grant execution to authenticated and anon
grant execute on function public.is_admin() to authenticated, anon;

-- 2. Fix profiles policies
drop policy if exists "Admins read all profiles" on profiles;
create policy "Admins read all profiles" on profiles
  for select using (public.is_admin());

-- 3. Fix reservations admin policy
drop policy if exists "Admins full access reservations" on reservations;
create policy "Admins full access reservations" on reservations
  for all using (public.is_admin());

-- 4. Fix reservation rentals policies
drop policy if exists "Users read own reservation rentals" on reservation_rentals;
create policy "Users read own reservation rentals" on reservation_rentals
  for select using (
    reservation_id in (select id from reservations where customer_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "Users insert own reservation rentals" on reservation_rentals;
create policy "Users insert own reservation rentals" on reservation_rentals
  for insert with check (
    reservation_id in (select id from reservations where customer_id = auth.uid())
    or public.is_admin()
  );

-- 5. Fix payments admin policy
drop policy if exists "Admins full access payments" on payments;
create policy "Admins full access payments" on payments
  for all using (public.is_admin());

-- 6. Fix catalog admin policies
drop policy if exists "Admins manage themes" on event_themes;
create policy "Admins manage themes" on event_themes
  for all using (public.is_admin());

drop policy if exists "Admins manage categories" on menu_categories;
create policy "Admins manage categories" on menu_categories
  for all using (public.is_admin());

drop policy if exists "Admins manage items" on menu_items;
create policy "Admins manage items" on menu_items
  for all using (public.is_admin());

drop policy if exists "Admins manage packages" on packages;
create policy "Admins manage packages" on packages
  for all using (public.is_admin());

drop policy if exists "Admins manage rentals" on rental_items;
create policy "Admins manage rentals" on rental_items
  for all using (public.is_admin());

-- 7. Fix notifications policies for admin and users
drop policy if exists "Users read own notifications" on notifications;
create policy "Users read own notifications" on notifications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users update own notifications" on notifications;
create policy "Users update own notifications" on notifications
  for update using (user_id = auth.uid() or public.is_admin());
