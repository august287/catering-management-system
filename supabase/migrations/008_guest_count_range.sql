alter table public.reservations
  drop constraint if exists reservations_guest_count_range;

alter table public.reservations
  add constraint reservations_guest_count_range
  check (guest_count between 100 and 200) not valid;

update public.packages
set min_pax = least(greatest(coalesce(min_pax, 100), 100), 200);

alter table public.packages
  alter column min_pax set default 100;

alter table public.packages
  drop constraint if exists packages_min_pax_range;

alter table public.packages
  add constraint packages_min_pax_range
  check (min_pax between 100 and 200);
