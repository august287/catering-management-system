<?php
/**
 * Expects: $pageTitle, $user (current_user() array)
 */
?>
<header class="topbar">
  <div class="topbar-left">
    <button class="topbar-menu-btn" type="button" onclick="document.getElementById('sidebar').classList.toggle('is-open')" aria-label="Toggle menu">
      <?= icon('menu') ?>
    </button>
    <h1 class="topbar-title"><?= htmlspecialchars($pageTitle) ?></h1>
  </div>
  <div class="topbar-user">
    <div class="topbar-user__text">
      <div class="topbar-user__name"><?= htmlspecialchars($user['name']) ?></div>
      <div class="topbar-user__role"><?= htmlspecialchars(ucfirst($user['role'])) ?></div>
    </div>
    <div class="avatar"><?= htmlspecialchars(initials($user['name'])) ?></div>
  </div>
</header>
