# Natalie's Catering — Modern React Application

Modern web-based catering management system ported to **React 18 + Vite + TypeScript + Tailwind CSS + Supabase**.

Designed for high-end hospitality capstone defense demonstrations, preserving the **Dark Ink & Gold** design DNA (`#17140f`, `#a9822f`, `#faf8f4`, Playfair Display & Inter).

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Build for Production & Typecheck
```bash
npm run typecheck
npm run build
```

---

## Demo Accounts

| Role | Email | Password | Access / Portal |
|------|-------|----------|-----------------|
| **Super Admin** | `superadmin@caterpro.ph` | `super123` | Everything an administrator has, plus User Management (change user roles). Needs migration `013_super_admin_role.sql` on Supabase. |
| **Administrator** | `admin@caterpro.ph` | `admin123` | KPI Dashboard, Menu Management, Reservations, Customers, Payment Verifications, Reports |
| **Customer** | `customer@test.ph` | `pass123` | Browse Menu & Themes, Multi-Step Booking Wizard, My Reservations, Proof of Payment Uploads |

---

## Architecture & Features

### Supabase Backend
- **Schema & Migrations:** `supabase/migrations/001_initial_schema.sql` (10 tables, triggers, strict RLS policies, storage bucket policies)
- **Seed Data:** `supabase/seed.sql` (Authentic Filipino catering data: dishes, packages, themes, rental inventory, reservations, payments)
- **Offline / Standalone Fallback:** `src/lib/mockData.ts` mirrors the exact Supabase seed data in local storage, allowing 100% testable, interactive offline defense demonstrations without external network fragility.

### Admin Suite (7 Features)
1. **Dashboard Overview:** Real-time StatCards, monthly revenue trend area chart, event distribution donut chart, pending payment alert banner.
2. **Menu Management:** Complete CRUD modals for dishes, packages, themes, and rental inventory with category filtering and availability toggles.
3. **Reservations:** Status-tabbed reservation queue (pending, confirmed, in-progress, completed, cancelled), status changer, detailed contract modal.
4. **Customer Directory:** Client registry with search, lifetime catering spend, and booking history modals.
5. **Payment Verifications:** Review incoming payment receipts, view attached proof images, one-click approve/reject actions.
6. **Notifications:** Real-time alerts for bookings, payments, and system updates with mark-as-read toggles.
7. **Reports & Financial Analytics:** Tremor-style revenue curves, package popularity charts, and payment channel breakdown.

### Customer Portal (6 Features)
8. **Browse Menu:** Signature theme showcase, filterable authentic Filipino food catalog, and equipment rentals.
9. **Theme Detail:** Dedicated showcase page with full event motif styling, inclusions, and associated package bundles.
10. **Multi-Step Booking Wizard:** 4-step reservation builder (Theme & Package → Rentals & Add-ons → Schedule & Venue → Live Contract Quote & Downpayment calculation).
11. **My Reservations:** Real-time booking tracking with status badges, schedule info, and remaining balance calculations.
12. **Payments Portal:** Submit GCash, Bank Transfer, or Card payments with transaction references and receipt proof upload.
13. **Customer Notifications:** Personal notifications for booking confirmations and verified payments.

---

## Live Backend Setup (Supabase)

These steps are needed once on the live Supabase project. The offline demo works without them.

### 1. Auto-cancel double bookings
Run `supabase/migrations/012_auto_cancel_double_bookings.sql` in the Supabase SQL Editor. It cancels any date that holds more than one active booking (keeps the most advanced status, then the earliest booking) and notifies the affected customers. The admin app re-runs it automatically whenever a double booking appears.

### 2. Forgot password
1. In **Authentication → URL Configuration**, set **Site URL** to `https://<your-site>` and add `https://<your-site>/reset-password` under **Redirect URLs** (and `http://localhost:3000/reset-password` for local testing).
2. In **Authentication → Emails → Templates → Reset Password**, paste the body of `supabase/templates/reset-password.html`. Its button links to `/reset-password?token_hash=…&type=recovery`, which the app verifies when the page opens. This avoids broken links caused by email scanners pre-opening the one-time link, and by Supabase falling back to the Site URL.

### 3. Email receipts through Gmail
Receipts are emailed to the customer automatically when an admin verifies a payment, and can be resent with **Email Receipt** in the receipt preview.

1. On the business Gmail account, turn on 2-Step Verification, then create an **App password** (Google Account → Security → App passwords).
2. In Supabase → **Edge Functions → Secrets**, add `GMAIL_USER` and `GMAIL_APP_PASSWORD`.
3. The code lives in `supabase/functions/send-receipt/index.ts` and is deployed on Supabase as the function **`swift-api`** (the name the dashboard gave it). The app calls it by that name, set in `RECEIPT_FUNCTION_NAME` in `src/lib/receiptEmail.ts`. To update it, open `swift-api` in the dashboard editor, paste the new code, and deploy. If you deploy under another name, change `RECEIPT_FUNCTION_NAME` to match.

### 4. Realtime
Migrations 011 and 012 add `reservations` and `payments` to the `supabase_realtime` publication, so calendars and lists update live without a page refresh.

### 5. Super admin and staff accounts
1. Run `supabase/migrations/013_super_admin_role.sql`, then `014_block_customer_promotion.sql`, then `015_notify_all_admins.sql`, then `016_menu_customization.sql`, then `017_fix_payment_reference_check.sql`, in the SQL Editor. Migration 017 fixes "violates check constraint payments_reference_number_format" when verifying or rejecting older payments. Migration 015 sends booking and payment alerts to every admin and super admin instead of only the demo admin account. Migration 016 stores each package's menu allowance and each booking's chosen dishes (before it runs, bookings still work and the chosen menu is saved in the special requests).
2. Deploy `supabase/functions/manage-staff/index.ts` as an Edge Function named **`manage-staff`** (dashboard: Edge Functions → Deploy a new function, paste the code). It lets super admins delete staff accounts and set staff passwords from **User Management**. No extra secrets are needed. If you use another name, change `MANAGE_STAFF_FUNCTION_NAME` in `src/lib/staffAccounts.ts`.
3. Redeploy `swift-api` with the updated `send-receipt` code so super admins can email receipts too.
4. Customers can't be promoted to staff from the app. To create a staff account, have the person register, then run `update public.profiles set role = 'admin' where id = '<user uuid>';` in the SQL Editor.

---

## Tech Stack
- **Build Tool:** Vite
- **UI Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS + custom tokens (`#17140f`, `#a9822f`, `#faf8f4`)
- **Routing:** React Router v6
- **Database & Auth:** Supabase
- **Visual Analytics:** Recharts / Tremor aesthetics
- **Icons:** Lucide React
