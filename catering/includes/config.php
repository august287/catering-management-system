<?php
/**
 * Bootstrap: session + mock "database".
 *
 * This is a front-end build, so real persistence/auth is stubbed with
 * an in-memory user table and PHP sessions. Swap check_login() and
 * $USERS for real DB calls when the backend is wired up.
 */
session_start();

define('BASE_URL', rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/'));

/** Demo accounts (mirrors the "Demo Credentials" box on the login screen) */
$USERS = [
    'admin@caterpro.ph' => [
        'password' => 'admin123',
        'role'     => 'admin',
        'name'     => 'Admin User',
    ],
    'customer@test.ph' => [
        'password' => 'pass123',
        'role'     => 'customer',
        'name'     => 'Maria Santos',
    ],
];

function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function require_role(string $role): void
{
    $user = current_user();
    if (!$user || $user['role'] !== $role) {
        header('Location: ' . BASE_URL . '/login.php');
        exit;
    }
}

function initials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name));
    $letters = array_map(fn($p) => mb_strtoupper(mb_substr($p, 0, 1)), array_slice($parts, 0, 2));
    return implode('', $letters) ?: '?';
}

/** Mock dashboard stats for the admin overview */
$ADMIN_STATS = [
    ['label' => 'Total Reservations', 'value' => '47', 'meta' => '+12% this month', 'icon' => 'calendar', 'tone' => 'green'],
    ['label' => 'Active Bookings', 'value' => '12', 'meta' => '8 confirmed, 4 pending', 'icon' => 'clock', 'tone' => 'blue'],
    ['label' => 'Monthly Revenue', 'value' => '₱298,000', 'meta' => '+8.3% vs last month', 'icon' => 'trend-up', 'tone' => 'orange'],
    ['label' => 'Total Customers', 'value' => '85', 'meta' => '5 new this week', 'icon' => 'users', 'tone' => 'violet'],
];

$REVENUE_SERIES = [
    ['month' => 'Jan', 'value' => 150000],
    ['month' => 'Feb', 'value' => 120000],
    ['month' => 'Mar', 'value' => 165000],
    ['month' => 'Apr', 'value' => 230000],
    ['month' => 'May', 'value' => 205000],
    ['month' => 'Jun', 'value' => 250000],
    ['month' => 'Jul', 'value' => 298000],
    ['month' => 'Aug', 'value' => 260000],
];

$EVENTS_BY_TYPE = [
    ['label' => 'Weddings',  'pct' => 38, 'color' => '#a9822f'],
    ['label' => 'Corporate', 'pct' => 24, 'color' => '#17140f'],
    ['label' => 'Birthdays', 'pct' => 20, 'color' => '#6b5a3a'],
    ['label' => 'Fiestas',   'pct' => 12, 'color' => '#e3d6b8'],
    ['label' => 'Others',    'pct' => 6,  'color' => '#b9c9ab'],
];

/** Mock catering event themes for the customer "Browse Menu" page */
$EVENT_THEMES = [
    ['name' => 'Wedding', 'tag' => 'Catering Theme', 'desc' => 'Your perfect day, perfectly served', 'img' => 'wedding.jpg'],
    ['name' => 'Birthday', 'tag' => 'Catering Theme', 'desc' => 'Celebrate every milestone in style', 'img' => 'birthday.jpg'],
    ['name' => 'Corporate Event', 'tag' => 'Catering Theme', 'desc' => 'Professional catering for professional events', 'img' => 'corporate.jpg'],
    ['name' => 'Debut', 'tag' => 'Catering Theme', 'desc' => 'A milestone worth celebrating grandly', 'img' => 'debut.jpg'],
    ['name' => 'Fiesta', 'tag' => 'Catering Theme', 'desc' => 'Filipino flavors for every gathering', 'img' => 'fiesta.jpg'],
];
