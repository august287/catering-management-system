<?php
require __DIR__ . '/includes/config.php';
$user = current_user();
if ($user) {
    header('Location: ' . BASE_URL . ($user['role'] === 'admin' ? '/admin/dashboard.php' : '/customer/menu.php'));
} else {
    header('Location: ' . BASE_URL . '/login.php');
}
exit;
