# Migrations — rules for new constraints

## Never add a `CHECK ... NOT VALID` for a rule that old rows may break

`NOT VALID` only skips checking the rows that already exist **when the
constraint is added**. PostgreSQL still re-checks the constraint on **every
UPDATE** of a row, even when the update doesn't touch the checked column.
So an old row that breaks the rule can no longer be updated at all — e.g. an
admin changing only the status gets:

```
new row for relation "reservations" violates check constraint "reservations_guest_count_range"
```

This happened twice (fixed in `017_fix_payment_reference_check.sql` and
`018_fix_guest_count_check.sql`).

### What to do instead

Pick one:

1. **Fix the existing data first, then add a normal (validated) `CHECK`.**
   Use this when old rows can safely be corrected with an `UPDATE`.
2. **Use a `BEFORE INSERT OR UPDATE OF <column>` trigger** that checks the value
   only on insert or when that column changes, and raises a readable message
   with `errcode = '23514'`. Copy the pattern in migration 018. Use this when
   old rows must keep their old values.

Other rules:

- Raise readable messages from triggers (they're shown to users as-is).
  Raw constraint errors are hidden by `src/lib/dbErrors.ts`, but only as a
  generic fallback message.
- Make migrations safe to re-run (`drop ... if exists`, `create or replace`).
- If you change a rule here, update the matching section in `supabase/seed.sql`.
