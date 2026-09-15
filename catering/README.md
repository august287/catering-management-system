# Natalie's Catering — Frontend (PHP)

Front-end build matching the Figma Make design (login, admin dashboard,
customer "Browse Menu"). Uses plain PHP for templating/session state,
hand-rolled CSS (no framework), and Chart.js (CDN) for the dashboard charts.

## Run it

You need PHP 8+ installed locally (no database required — auth and data
are mocked in `includes/config.php`).

```bash
cd catering
php -S localhost:8000
```

Then open **http://localhost:8000/login.php**

### Demo credentials
- Admin: `admin@caterpro.ph` / `admin123`
- Customer: `customer@test.ph` / `pass123`

## Structure

```
catering/
├── index.php              # redirects to login or the right dashboard
├── login.php               # split-screen sign-in (screenshot 1)
├── logout.php
├── admin/
│   └── dashboard.php       # stat cards + revenue line chart + donut (screenshot 2)
├── customer/
│   └── menu.php            # hero + tabs + event theme grid (screenshot 3)
├── includes/
│   ├── config.php          # session bootstrap + mock users/data
│   ├── icons.php            # inline SVG icon set (no external icon font)
│   ├── sidebar.php          # role-aware nav (admin vs customer)
│   └── topbar.php           # page title + user avatar
└── assets/
    └── css/style.css       # all design tokens + component styles
```

## Notes / what's stubbed

Only 3 screens were provided as reference images, so only those are fully
built: **Login**, **Admin Dashboard**, **Customer → Browse Menu**.

The sidebar links to the other sections shown in the nav (Menu Management,
Reservations, Customers, Payments & Billing, Notifications, Reports &
Analytics, My Reservations) but those pages don't exist yet — send more
screenshots and I'll build them in the same style.

Auth is a simple session-based mock (`includes/config.php`) matching the
demo credentials shown on the login screen. Swap it for real DB-backed
auth (password hashing, prepared statements, CSRF token) before using
this in production — right now it's front-end only, as requested.

## Design tokens used

- Ink/near-black: `#17140f` (sidebar, buttons)
- Gold accent: `#a9822f` (brand, active states, chart line)
- Cream background: `#faf8f4`
- Headings: Playfair Display (serif) · Body: Inter (sans)
