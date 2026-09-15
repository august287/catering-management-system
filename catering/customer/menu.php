<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/icons.php';
require_role('customer');

$user = current_user();
$role = 'customer';
$active = 'menu';
$pageTitle = 'Browse Menu';

// simple query-string tab state: ?tab=themes|food|rentals
$tab = $_GET['tab'] ?? 'themes';
if (!in_array($tab, ['themes', 'food', 'rentals'], true)) {
    $tab = 'themes';
}

$themeImages = [
    'Wedding' => 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
    'Birthday' => 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop',
    'Corporate Event' => 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=800&auto=format&fit=crop',
    'Debut' => 'https://images.unsplash.com/photo-1470753323753-3f8091bb0232?q=80&w=800&auto=format&fit=crop',
    'Fiesta' => 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Browse Menu · Natalie's Catering</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
  <div class="app-shell">
    <?php require __DIR__ . '/../includes/sidebar.php'; ?>

    <div class="main">
      <?php require __DIR__ . '/../includes/topbar.php'; ?>

      <main class="content">
        <div class="hero" style="background-image:url('https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1600&auto=format&fit=crop');">
          <div class="hero-inner">
            <div class="hero-eyebrow">Our Offerings</div>
            <h1>Menu &amp; Packages</h1>
            <p>Browse event themes, curated catering packages, and rental options for your perfect celebration.</p>
          </div>
        </div>

        <nav class="tabs">
          <a class="tab<?= $tab === 'themes' ? ' is-active' : '' ?>" href="?tab=themes">Event Themes</a>
          <a class="tab<?= $tab === 'food' ? ' is-active' : '' ?>" href="?tab=food">Food &amp; Packages</a>
          <a class="tab<?= $tab === 'rentals' ? ' is-active' : '' ?>" href="?tab=rentals">Table &amp; Chair Rentals</a>
        </nav>

        <?php if ($tab === 'themes'): ?>
          <div class="section-eyebrow">Choose Your Event</div>
          <div class="theme-grid">
            <?php foreach ($EVENT_THEMES as $theme): ?>
              <a class="theme-card" href="theme.php?name=<?= urlencode($theme['name']) ?>"
                 style="background-image:url('<?= htmlspecialchars($themeImages[$theme['name']] ?? '') ?>');">
                <div class="theme-card-inner">
                  <div class="theme-card-tag"><?= htmlspecialchars($theme['tag']) ?></div>
                  <h3><?= htmlspecialchars($theme['name']) ?></h3>
                  <p><?= htmlspecialchars($theme['desc']) ?></p>
                </div>
              </a>
            <?php endforeach; ?>
          </div>
        <?php elseif ($tab === 'food'): ?>
          <div class="section-eyebrow">Curated Packages</div>
          <p style="color:var(--color-text-muted);">Food &amp; package listings go here — buffet sets, plated menus, and add-ons.</p>
        <?php else: ?>
          <div class="section-eyebrow">Rental Options</div>
          <p style="color:var(--color-text-muted);">Table, chair, and linen rental options go here.</p>
        <?php endif; ?>
      </main>
    </div>
  </div>

  <script>
    document.querySelectorAll('.sidebar-link').forEach(el => {
      el.addEventListener('click', () => document.getElementById('sidebar').classList.remove('is-open'));
    });
  </script>
</body>
</html>
