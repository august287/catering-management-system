# Bug Report — Natalie's Catering Management System

> **QA Lead review · static code analysis (test cases executed by code inspection)**
> **Date:** 2026-10-12
> **Scope:** `src/` (React + Vite + Tailwind), `supabase/migrations/`, `supabase/seed.sql`
> **Runtime mode:** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set → app runs in **Supabase mode**, with a demo/localStorage fallback when Supabase calls fail.

---

## 1. Executive Summary

| ID | Severity | Title |
|----|----------|-------|
| BUG-01 | **CRITICAL** | Booking code generation collides → new customer reservations silently vanish in Supabase mode |
| BUG-02 | **CRITICAL** | Notifications are never persisted to the database — entire notification system is dead in production |
| BUG-03 | **HIGH** | Payment amount field cannot be edited (auto-suggest effect overwrites user input on every render) |
| BUG-04 | **HIGH** | "Approve & Verify" inside the proof modal verifies immediately without confirmation, then opens a misleading confirm dialog |
| BUG-05 | **HIGH** | RLS lets customers UPDATE their own reservation rows (status / total_amount) with no column restriction |
| BUG-06 | **HIGH** | Security-definer signup trigger trusts client-supplied `role` metadata → privilege escalation to admin |
| BUG-07 | **HIGH** | Dashboard/Reports revenue charts blend fabricated hard-coded months with all-time revenue |
| BUG-08 | MEDIUM | `final_balance` auto-suggest = 50% of total instead of the actual remaining balance |
| BUG-09 | MEDIUM | Customers can submit payment for cancelled/completed reservations |
| BUG-10 | MEDIUM | Payment proofs are stored as base64 strings in a DB column; `payment-proofs` storage bucket is never used |
| BUG-11 | MEDIUM | Registration "succeeds" with no session when email confirmation is enabled → phantom session lost on refresh |
| BUG-12 | MEDIUM | Admin catalog writes use client `Date.now()` ids that never reconcile with server-side serial ids |
| BUG-13 | LOW | Login redirect is decided by `email.includes('admin')`, not the actual role |
| BUG-14 | LOW | Donut charts fabricate `1 booking` for themes with zero bookings (`count || 1`) |
| BUG-15 | LOW | Root `/` never redirects already-logged-in users to their portal |
| BUG-16 | LOW | Hard-coded demo customer UUID fallback (`00000000-...-0002`) leaks another user's data if profile fails to load |

---

## 2. Critical Bugs

### BUG-01 — Booking codes collide; new customer bookings are silently lost
**Files:** `src/hooks/useCateringData.ts:244-251, 281, 297-314`

**How it was tested (static):**
1. Reads the next booking number from `reservations.reduce(...)` over the **client-side `reservations` state**.
2. In Supabase mode, `refreshData()` (line 64) fetches reservations, which are **RLS-filtered to the signed-in customer's own rows only** (`Customers read own reservations`, `001_initial_schema.sql:161-162`).
3. A brand-new customer's list is empty → `maxNum = 0` → next code = `RES-2026-0001`, which already exists (`booking_code text not null unique`, `001_initial_schema.sql:92`; seed rows `001_initial_schema` data `RES-2026-0001..15`).
4. `setReservations(updated)` (line 281) optimistically shows the booking; the Supabase `insert` (line 298) fails with a **unique-constraint error that is never caught** (unhandled promise rejection).
5. The UI still navigates and shows **"Booking Submitted Successfully!"** (`BookReservation.tsx:154-156`). After a refresh the booking is gone.

**Impact:** A new customer can never successfully book in Supabase mode; existing customers can also collide (their `maxNum` is not the server-global max). Two customers booking at the same moment both generate the same code. Silent data loss + false success confirmation.

**Suggested fix:** Generate the code server-side (DB trigger/`nextval` sequence or a `SELECT max(...) FOR UPDATE` transaction), or catch the insert error and retry with a corrected code; never rely on a client-side, per-user filtered max.

---

### BUG-02 — Notifications are never written to the DB
**Files:** `src/hooks/useCateringData.ts:285-295, 338-350, 384-395, 448-461`

**How it was tested (static):** Every notification-producing action (`createReservation`, `updateReservationStatus`, `submitPayment`, `verifyPayment`) only calls `setNotifications(...)` + `mockStore.saveNotifications(...)`. **None of them executes a `supabase.from('notifications').insert(...)`.** The realtime subscription (lines 99-125) only reacts to DB `INSERT`/`UPDATE` events — which never happen.

**Impact:** In production (Supabase) mode, admin "New Booking"/"Payment Awaiting Verification" alerts and customer confirmation alerts exist only transiently in memory. After any refresh the notifications, sidebar unread badges (`Sidebar.tsx:44-46`), and the Notifications pages (`admin/Notifications.tsx`, `customer/Notifications.tsx`) all show empty. The feature is non-functional end-to-end.

**Suggested fix:** Mirror the local optimistic insert with a `supabase.from('notifications').insert(...)` call (and handle the admin id `00000000-0000-0000-0000-000000000001` per `seed.sql`).

---

## 3. High-Severity Bugs

### BUG-03 — Payment amount field is effectively non-editable
**File:** `src/pages/customer/Payments.tsx:42-53`

**How it was tested:**
- The `useEffect` depends on `myReservations`, which is recomputed on **every render** (line 21-23 returns a new array reference each time).
- Therefore the effect runs after **every render** and calls `setAmount(...)` with the suggestion (50% of total, full total, or 50% for final balance).
- When a user types a custom amount, `setAmount` re-renders → the effect fires → the typed value is overwritten.

**Impact:** Users cannot remit a custom amount (e.g. an extra partial payment); the field silently snaps back to the suggested value. No error is shown.

### BUG-04 — Proof-modal Approve verifies instantly and then shows a pointless confirmation
**File:** `src/pages/admin/Payments.tsx:237-260, 266-283`

**How it was tested:**
- From the **proof modal**, clicking "Approve & Verify" calls `handleVerify(selectedProof.id, 'verified')` immediately (line 251), **before** any confirmation, then ALSO sets `paymentAction` (line 252) which opens the "Are you sure?" `ConfirmationModal`.
- From the **table row** (lines 157-165), the button only sets `paymentAction`, deferring the action until the admin confirms.

**Impact:** The two verify paths behave inconsistently. The proof-modal path performs an irreversible verification **without the confirmation step**, and then presents a confirmation dialog for an action that has already happened (double-calling `verifyPayment`). An accidental click in the proof modal silently verifies a payment and confirms the reservation.

### BUG-05 — RLS allows customers to update their own reservations without restriction
**File:** `supabase/migrations/001_initial_schema.sql:167-168`

**How it was tested (static):** Policy `"Customers update own reservations"` is `for update using (customer_id = auth.uid())` with **no `with check` column restriction**. Any authenticated customer can issue `UPDATE reservations SET status='confirmed', total_amount=0, event_date=... WHERE id = <own>` directly against the PostgREST API. The web app never uses this policy (customers have no reservation-edit UI), so it exists only as an attack surface.

**Impact:** A customer can self-confirm an unpaid booking, tamper with contracted amounts, dates, or guest counts, bypassing the whole "50% downpayment confirms the booking" business rule (`useCateringData.ts:432-446`). Financial/reporting integrity.

**Suggested fix:** Drop the policy entirely (or restrict with `with check` to non-financial columns and prevent status changes).

### BUG-06 — Signup trigger trusts client-supplied `role` metadata (privilege escalation)
**Files:** `supabase/migrations/001_initial_schema.sql:17-34`, `src/hooks/useAuth.tsx:186-205`

**How it was tested (static):** `handle_new_user()` reads `coalesce(new.raw_user_meta_data->>'role', 'customer')` and writes it to `profiles.role`, running with `security definer`. The app's own `signUp` passes `role: 'customer'` (good), but a malicious client can call the Supabase Auth endpoint directly with `user_metadata: { role: 'admin' }`. Because `is_admin()` (`002_fix_rls_infinite_recursion.sql:7-19`) reads the profile role, the attacker is then granted **full admin access** to all tables.

**Impact:** Any unauthenticated user can register an admin account and take over the entire system (catalog, payments, reservations, reports).

**Suggested fix:** In the trigger, hard-code `'customer'` for the role (never trust metadata), e.g. `insert into profiles (id, name, phone) values (...);` and set role via an explicit admin-only path.

### BUG-07 — Analytics charts mix hard-coded fake data with all-time revenue
**Files:** `src/pages/admin/Dashboard.tsx:29-40`, `src/pages/admin/Reports.tsx:26-36`

**How it was tested:** Jan–Aug entries are **hard-coded constants** (`150000, 120000, ...`), not derived from payments. The Sep entry is `totalRevenue` (Dashboard) / `totalCollected` (Reports), which is the sum of **all verified payments of all time** — not September-only revenue.

**Impact:** The "Monthly Revenue Trend" chart is fabricated; Sep can be several times larger than any other month and is mislabeled. Revenue reporting cannot be trusted for a demo/defense presentation.

---

## 4. Medium-Severity Bugs

- **BUG-08 — `final_balance` suggestion is wrong** (`customer/Payments.tsx:50`): always suggests `total_amount * 0.5` (the downpayment amount) instead of the remaining balance after verified payments. If a customer already paid a 50% downpayment it happens to match; any other payment history produces an incorrect suggestion, and it feeds BUG-03's overwrite.
- **BUG-09 — Payment allowed on cancelled/completed bookings** (`customer/Payments.tsx:163-167`): the reservation dropdown lists **all** of the customer's reservations, including `cancelled` and past `completed` ones (the MyReservations page correctly hides the pay button for cancelled — `MyReservations.tsx:161`). A customer can submit money against a cancelled booking; `verifyPayment` will credit the payment and, if already `confirmed`, do nothing to prevent it.
- **BUG-10 — Proof images stored as base64 in the DB** (`customer/Payments.tsx:56-65, 98`; `001_initial_schema.sql:267-295`): `FileReader.readAsDataURL` produces a full base64 data URL stored in `payments.proof_image_url`. The dedicated `payment-proofs` storage bucket, its 5 MB limit, and its ACL policies are dead code. No file is ever uploaded to storage → DB bloat and no genuine receipt storage/retention.
- **BUG-11 — Registration succeeds without a session when email confirmation is on** (`useAuth.tsx:186-205`): `signUp` returns `data.user` even with `session: null` when email confirmation is required. The code sets `user`/`profile` and navigates to `/customer/menu`; on the next reload `onAuthStateChange` has no session → user is bounced to `/login`. If `data.user` is null, the code silently falls through to **demo registration** (localStorage) while in Supabase mode → the "account" can never log in. Deceptive UX + split-brained auth.
- **BUG-12 — Optimistic admin CRUD never reconciles server ids** (`useCateringData.ts:130-139, 160-169, 190-199, 211-229`): added items use `id: Date.now()` in local state while the DB assigns its own serial id. The returned value from `insert` is ignored. In-session lists show items under the wrong id (affecting later references), and the mismatch resolves only after a refresh.

## 5. Low-Severity Bugs

- **BUG-13 — Role redirect by email substring** (`Login.tsx:54-57`): navigation to `/admin/dashboard` is decided by `email.includes('admin')` rather than the authenticated role. A customer with "admin" in the address is briefly bounced to the admin portal before `ProtectedRoute` redirects them back. Use `role` from `useAuth()` instead.
- **BUG-14 — Donut chart fabricates bookings** (`Dashboard.tsx:55`, `Reports.tsx:51`): `value: count || 1` shows "1 booking" for themes that have zero reservations. Analytics misrepresentation.
- **BUG-15 — Logged-in users hitting `/` get the landing page** (`App.tsx:39`): no redirect to the role dashboard; users must manually navigate. Minor friction, but inconsistent with expected portal behavior.
- **BUG-16 — Hard-coded demo UUID fallback** (`MyReservations.tsx:26`, `customer/Payments.tsx:22`, `customer/Notifications.tsx:15`): when `profile` is missing the code falls back to `00000000-0000-0000-0000-000000000002` (Maria Santos). If the profile ever fails to load in a real session, the app would display **another user's** reservations/payments/notifications.

## 6. Additional notes (non-bugs, worth flagging)

- **Lockout mechanism is client-side only** (`Login.tsx:16-35, 63-67`): reset on page reload; not a security control. Acceptable for a demo, must not be presented as an anti-brute-force control.
- **AppShell back-button interception** (`AppShell.tsx:16-32`): pushes a history entry on every pathname change and on mount; repeated pushes can grow history and the back button always triggers the logout prompt. Intentional per requirements ("prevent uncontrolled session exit") but has a quality-of-life cost.
- **`/LandingPage` used in logo anchors** (`Login.tsx:96`, `Register.tsx:78`): no route exists; it works only via the catch-all `* → /` in `App.tsx:79`. Prefer linking to `/`.
- **Reports "Peak Catering Month: December" and StatCard metas are hard-coded** (`Reports.tsx:138`, `Dashboard.tsx:93, 107`).

---

## 7. Recommended verification sequence (once fixes are in)

1. **Auth:** Register a new customer → confirm email (if enabled) → log in → verify portal redirect by **role**, not email.
2. **Booking:** New customer books → confirm `booking_code` uniqueness server-side → refresh → booking must persist (BUG-01).
3. **Notifications:** Customer submits payment → admin sees "Payment Awaiting Verification" after refresh (BUG-02).
4. **Payments:** Type a custom amount and confirm it is not overwritten (BUG-03); verify from the proof modal and confirm the confirmation dialog gates the action (BUG-04); attempt to pay a cancelled booking and confirm it is blocked (BUG-09); `final_balance` suggestion equals the true remaining balance (BUG-08).
5. **Security (API-level):** Attempt `UPDATE reservations SET status='confirmed'` as a customer (must fail — BUG-05); attempt signup with `role:'admin'` metadata (must produce a *customer* profile — BUG-06).
6. **Reporting:** Cross-check the revenue chart numbers against the payments table (BUG-07).