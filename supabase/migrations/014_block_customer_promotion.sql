-- ==============================================================================
-- Migration: 014_block_customer_promotion.sql
-- Purpose: Customer accounts can never be promoted to 'admin' or 'super_admin'
--          from the app, not even by a super admin.
--
-- Rules for role changes made by a logged-in user (after this migration):
--   * Only a super admin can change a role.
--   * Nobody can change their own role.
--   * A customer cannot be changed to admin or super_admin.
--
-- Staff accounts are created by the project owner instead: requests with no
-- logged-in user (SQL editor, service role, seed.sql) skip these checks, e.g.
--   update public.profiles set role = 'admin' where id = '<user uuid>';
--
-- Keep in sync with roleChangeError() in src/types/database.ts.
-- Requires 013_super_admin_role.sql. Safe to run repeatedly.
-- ==============================================================================

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    if not public.is_super_admin() then
      raise exception 'Only super administrators can change a user role.'
        using errcode = '42501'; -- insufficient_privilege
    end if;

    if old.id = auth.uid() then
      raise exception 'You cannot change your own role.'
        using errcode = '42501';
    end if;

    if old.role = 'customer' and new.role in ('admin', 'super_admin') then
      raise exception 'Customer accounts cannot be promoted to Admin or Super Admin.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_change();
