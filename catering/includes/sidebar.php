<?php
/**
 * Expects: $role ('admin'|'customer'), $active (nav key to highlight)
 */
$adminNav = [
    ['key' => 'dashboard',   'label' => 'Dashboard',          'icon' => 'grid',        'href' => BASE_URL . '/admin/dashboard.php'],
    ['key' => 'menu',        'label' => 'Menu Management',    'icon' => 'utensils',    'href' => BASE_URL . '/admin/menu-management.php'],
    ['key' => 'reservations','label' => 'Reservations',       'icon' => 'calendar',    'href' => BASE_URL . '/admin/reservations.php'],
    ['key' => 'customers',   'label' => 'Customers',          'icon' => 'users',       'href' => BASE_URL . '/admin/customers.php'],
    ['key' => 'payments',    'label' => 'Payments & Billing', 'icon' => 'credit-card', 'href' => BASE_URL . '/admin/payments.php'],
    ['key' => 'notifications','label' => 'Notifications',     'icon' => 'bell',        'href' => BASE_URL . '/admin/notifications.php', 'badge' => 2],
    ['key' => 'reports',     'label' => 'Reports & Analytics','icon' => 'bar-chart',   'href' => BASE_URL . '/admin/reports.php'],
];

$customerNav = [
    ['key' => 'menu',         'label' => 'Browse Menu',       'icon' => 'utensils',    'href' => BASE_URL . '/customer/menu.php'],
    ['key' => 'reservations', 'label' => 'My Reservations',   'icon' => 'calendar',    'href' => BASE_URL . '/customer/reservations.php'],
    ['key' => 'payments',     'label' => 'Payments & Billing','icon' => 'credit-card', 'href' => BASE_URL . '/customer/payments.php'],
    ['key' => 'notifications','label' => 'Notifications',     'icon' => 'bell',        'href' => BASE_URL . '/customer/notifications.php', 'badge' => 2],
];

$nav = $role === 'admin' ? $adminNav : $customerNav;
$brandSub = $role === 'admin' ? 'Management System' : 'Customer Portal';
?>
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <span class="sidebar-brand__mark"><?= icon('utensils') ?></span>
    <div>
      <div class="sidebar-brand__name">Natalie's Catering</div>
      <div class="sidebar-brand__sub"><?= htmlspecialchars($brandSub) ?></div>
    </div>
  </div>

  <nav class="sidebar-nav">
    <?php foreach ($nav as $item): ?>
      <a class="sidebar-link<?= $active === $item['key'] ? ' is-active' : '' ?>" href="<?= htmlspecialchars($item['href']) ?>">
        <?= icon($item['icon']) ?>
        <span><?= htmlspecialchars($item['label']) ?></span>
        <?php if (!empty($item['badge'])): ?>
          <span class="sidebar-link__badge"><?= (int) $item['badge'] ?></span>
        <?php endif; ?>
      </a>
    <?php endforeach; ?>
  </nav>

  <div class="sidebar-foot">
    <form method="post" action="<?= BASE_URL ?>/logout.php">
      <button type="submit" class="sidebar-signout">
        <?= icon('log-out') ?>
        <span>Sign Out</span>
      </button>
    </form>
  </div>
</aside>
