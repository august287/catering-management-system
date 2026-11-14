-- ==============================================================================
-- Migration: 013_super_admin_role.sql
-- Purpose: Add a 'super_admin' role.
--
-- * super_admin can do everything an admin can (is_admin() now includes it).
-- * Only a super_admin can change anyone's role. Regular admins no longer can.
-- * Super admins can update any profile row (needed for the User Management page).
--
-- To make someone a super admin, run in the SQL editor:
--   update public.profiles set role = 'super_admin' where id = '<user uuid>';
--
-- Safe to run repeatedly.
-- ==============================================================================

-- 1. Allow the new role value.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('super_admin', 'admin', 'customer'));

-- 2. Admin check now covers super admins, so every existing admin policy applies to them.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
end;
$$;

grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
end;
$$;

grant execute on function public.is_super_admin() to authenticated, anon;

-- 3. Only super admins may change a role. Requests with no logged-in user
--    (SQL editor, service role) are still allowed.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_super_admin() then
    raise exception 'Only super administrators can change a user role.'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  -- A super admin can't demote themselves (avoids locking everyone out).
  if new.role is distinct from old.role
     and auth.uid() is not null
     and old.id = auth.uid() then
    raise exception 'You cannot change your own role.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_change();

-- 4. Super admins can update any profile (role changes from User Management).
drop policy if exists "Super admins update profiles" on public.profiles;
create policy "Super admins update profiles" on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- 5. Double-booking resolver: let super admins run it and notify them too.
--    (Same as 012, with the admin checks widened.)
create or replace function public.resolve_double_bookings()
returns table (id int, booking_code text, event_date date, customer_id uuid)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
begin
  -- Only admins may trigger this from the API. Direct SQL (auth.uid() is null)
  -- such as this migration is allowed.
  if auth.uid() is not null and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ) then
    raise exception 'Only administrators can resolve double bookings.' using errcode = '42501';
  end if;

  -- One resolver at a time, so two admins can't double-notify customers.
  perform pg_advisory_xact_lock(hashtext('resolve_double_bookings'));

  for r in
    with ranked as (
      select res.id,
             res.booking_code,
             res.event_date,
             res.customer_id,
             row_number() over (
               partition by res.event_date
               order by case res.status::text
                          when 'in_progress' then 0
                          when 'confirmed' then 1
                          else 2
                        end,
                        res.created_at,
                        res.id
             ) as rn
      from public.reservations res
      where public.reservation_blocks_date(res.status::text)
    )
    select ranked.* from ranked where ranked.rn > public.max_events_per_day()
  loop
    update public.reservations set status = 'cancelled' where reservations.id = r.id;

    insert into public.notifications (user_id, title, message)
    values (
      r.customer_id,
      'Reservation Auto-Cancelled (Double Booking)',
      format(
        'Your booking %s on %s was automatically cancelled because the date was already booked. Please choose another date. Any payment made will be refunded or moved to your new booking.',
        r.booking_code,
        to_char(r.event_date, 'Mon DD, YYYY')
      )
    );

    insert into public.notifications (user_id, title, message)
    select p.id,
           'Double Booking Auto-Cancelled',
           format('%s on %s was automatically cancelled to resolve a double booking.',
                  r.booking_code, to_char(r.event_date, 'Mon DD, YYYY'))
    from public.profiles p
    where p.role in ('admin', 'super_admin');

    id := r.id;
    booking_code := r.booking_code;
    event_date := r.event_date;
    customer_id := r.customer_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.resolve_double_bookings() from public;
grant execute on function public.resolve_double_bookings() to authenticated;
