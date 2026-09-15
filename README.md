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

## Demo Accounts (One-Click Auto-fill on Sign In)

| Role | Email | Password | Access / Portal |
|------|-------|----------|-----------------|
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

## Tech Stack
- **Build Tool:** Vite
- **UI Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS + custom tokens (`#17140f`, `#a9822f`, `#faf8f4`)
- **Routing:** React Router v6
- **Database & Auth:** Supabase (Postgres + Storage + RLS)
- **Visual Analytics:** Recharts / Tremor aesthetics
- **Icons:** Lucide React
