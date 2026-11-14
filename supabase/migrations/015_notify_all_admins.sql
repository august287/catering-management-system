-- ==============================================================================
-- Migration: 015_notify_all_admins.sql
-- Purpose: Send "New Booking" / "Payment Submitted" alerts to every admin and
--          super admin.
--
-- Before: the app sent these to one hard-coded admin id (the demo
-- admin@caterpro.ph account), because customers can't read other people's
-- profiles to find a real admin. If that account was missing or deleted, the
-- insert failed and no admin was told; super admins were never told.
--
-- notify_admins() runs with the owner's rights, so it can look up all staff and
-- insert one notification for each. Any signed-in user may call it, but it can
-- only write to staff accounts, with length-limited text.
--
-- Requires 013_super_admin_role.sql. Safe to run repeatedly.
-- ==============================================================================

create or replace function public.notify_admins(p_title text, p_message text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  sent integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_message), '') = '' then
    raise exception 'Title and message are required.' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, title, message)
  select p.id, left(btrim(p_title), 120), left(btrim(p_message), 500)
  from public.profiles p
  where p.role in ('admin', 'super_admin');

  get diagnostics sent = row_count;
  return sent;
end;
$$;

revoke all on function public.notify_admins(text, text) from public;
grant execute on function public.notify_admins(text, text) to authenticated;
