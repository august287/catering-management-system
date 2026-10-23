# Test Report — Natalie's Catering (2026-10-24)

Tested live against the Supabase project with both demo accounts logged in at once:
customer on `http://localhost:3000`, admin on `http://admin.localhost:3000` (a separate
origin, so each tab keeps its own login).

Test data created: booking **RES-2026-0018** (now cancelled), a verified ₱33,750 GCash
payment (`QATEST-GCASH-20261024`) and a rejected ₱1,000 cash payment, plus the
notifications they triggered.

## Results

| # | Test case | Result |
|---|-----------|--------|
| 1 | Customer books → admin gets "New Booking Created" live (no reload), bell 3→4 | PASS (~3 s) |
| 2 | Booking blocked if event < 7 days away / guests outside 100–200 | PASS |
| 3 | Admin "Mark read" → bell count drops | PASS (bell lags ~1–2 s) |
| 4 | Booking totals: ₱450 × 150 = ₱67,500, 50% downpayment ₱33,750 | PASS |
| 5 | Customer pays → admin gets "Payment Awaiting Verification" live | PASS |
| 6 | Payment blocked: amount > balance, reference "abc", missing proof image | PASS |
| 7 | Same reference number reused (different letter case) is rejected | PASS |
| 8 | Admin can open the uploaded proof image | PASS |
| 9 | Admin verifies → booking auto-confirms, customer notified exactly once | PASS |
| 10 | Admin rejects → customer gets "Payment Issue Flagged" live | PASS |
| 11 | Customer "Mark All as Read" → bell clears | PASS |
| 12 | Admin cancels booking → customer notified live | PASS |
| 13 | Customer opening `/admin/*` is redirected to `/customer/menu` | PASS |
| 14 | Customer cannot see other customers' reservations / notifications | PASS |
| 15 | Customer cannot verify own payment or confirm own booking via API | PASS |
| 16 | Customer cannot promote themselves to admin via API | **FAIL — critical** |

## Bugs found

### BUG-A (Critical) — Any customer can make themselves admin
`profiles` policy "Users update own profile" (`001_initial_schema.sql:168`) allows
updating every column, including `role`. From the browser console a logged-in customer
ran `supabase.from('profiles').update({ role: 'admin' }).eq('id', <own id>)` and it
succeeded. (Reverted right after the test.) Since `is_admin()` reads this column, that
customer would then get full admin access to all data.
**Fixed in code:** `supabase/migrations/010_lock_profile_role.sql` adds a trigger that
rejects role changes unless the caller is an admin. **Must be run in the Supabase SQL
editor** to take effect.

### BUG-B (High) — Customer is told "approved" even if the payment update fails
In `verifyPayment` (`src/hooks/useCateringData.ts:741`) the customer notification is
inserted *before* the payment row is updated, and the update's error is never checked.
Evidence in the database: RES-2026-0017 has **two** "Payment Verified" notifications,
but only one of its two payments is verified; the other (`dawds`) is still pending.
`updateReservationStatus` has the same order/no-check problem.
**Fixed:** both functions now save first, check for errors (and for "0 rows changed",
which is how a blocked update looks), and only then notify. Repeat clicks on an already
verified/rejected payment are ignored. The admin Payments and Reservations pages now
show the error. Verified live: with a broken login token the admin sees the error and
the customer gets nothing; with a valid token exactly one notice is sent.

### BUG-C (Medium) — Anyone logged in can send a notification to anyone
Notifications INSERT policy is `auth.role() = 'authenticated'` with no check on
`user_id`, so a customer can put fake alerts (e.g. a fake "Payment Verified") into
another user's or the admin's inbox. **Fix:** move notification creation into DB
triggers / a `security definer` function and restrict direct inserts.

### BUG-D (Medium) — Cancelling a paid booking has no confirmation
Admin → Reservations → Details: changing the status dropdown to "Cancelled" applies
immediately. RES-2026-0018 had ₱33,750 verified and was cancelled with no prompt and
no refund note.

### BUG-E (Low) — Sidebar counters don't update live
Admin sidebar "Reservations" / "Payments" badges stayed at the old number after a new
booking and payment arrived; only a page reload fixed them. Each component calls
`useCateringData()` separately, so each keeps its own copy of the data, and only
notifications are live-synced.

### BUG-F (Low) — Old data skipped the reference rules
Payments `dawds`, `AWDASD` and a cash payment with reference `N/A` exist although the
current rules need 6+ characters and cash gets `CASH-<timestamp>`. Probably created
before migration 009; worth cleaning or re-validating.

### Minor UX
- Cash payment confirm dialog reads "with reference number ?" when blank.
- After the downpayment is verified, the payment form still defaults to "Down Payment (50%)".
- Demo-login fallback (`useAuth.tsx`): if Supabase login fails, `admin@caterpro.ph` /
  `admin123` from local mock data still logs in as admin (with mock data). If the real
  admin password is changed, the old demo password still opens the admin UI.

## Not yet tested (suggested next)
- Registration of a new customer + email confirmation flow
- Admin menu/package/theme CRUD and that customers see the changes
- Rentals/add-ons in the booking wizard (totals with rentals)
- Full payment and final-balance paths; booking marked "completed" blocks payments
- Two customers booking the same date (double-booking rules)
- Reports/dashboard numbers matching the database
- Mobile layout, logout from both roles, session expiry
