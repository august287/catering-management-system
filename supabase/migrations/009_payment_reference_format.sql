alter table public.payments
  drop constraint if exists payments_reference_number_format;

alter table public.payments
  add constraint payments_reference_number_format
  check (
    reference_number is null
    or reference_number = ''
    or (
      char_length(btrim(reference_number)) between 6 and 80
      and btrim(reference_number) ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
    )
  ) not valid;
