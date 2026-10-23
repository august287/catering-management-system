-- ==============================================================================
-- Migration: 010_lock_profile_role.sql
-- Fix: BUG-A — a customer could promote themselves to admin.
--
-- The "Users update own profile" policy lets a user update every column of their
-- own row, including `role`. A customer could run
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', <own id>)
-- and is_admin() would then grant them full admin access.
--
-- This trigger rejects any role change unless the caller is already an admin.
-- Requests with no logged-in user (SQL editor, service role) are still allowed,
-- so admins can be managed from the Supabase dashboard.
--
-- Safe to run repeatedly.
-- ==============================================================================

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only administrators can change a user role.'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_change();
