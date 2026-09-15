<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/icons.php';
require_role('admin');

$user = current_user();
$role = 'admin';
$active = 'dashboard';
$pageTitle = 'Admin Dashboard';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard · Natalie's Catering</title>
  <link rel="stylesheet" href="../assets/css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
</head>
<body>
  <div class="app-shell">
    <?php require __DIR__ . '/../includes/sidebar.php'; ?>

    <div class="main">
      <?php require __DIR__ . '/../includes/topbar.php'; ?>

      <main class="content">
        <section class="stat-grid">
          <?php foreach ($ADMIN_STATS as $stat): ?>
            <div class="card stat-card">
              <div class="stat-card__icon icon-<?= $stat['tone'] ?>"><?= icon($stat['icon']) ?></div>
              <div class="stat-card__value"><?= htmlspecialchars($stat['value']) ?></div>
              <div class="stat-card__label"><?= htmlspecialchars($stat['label']) ?></div>
              <div class="stat-card__meta"><?= htmlspecialchars($stat['meta']) ?></div>
            </div>
          <?php endforeach; ?>
        </section>

        <section class="panel-grid">
          <div class="card panel">
            <h2 class="panel-title">Monthly Revenue</h2>
            <div class="chart-wrap">
              <canvas id="revenueChart"></canvas>
            </div>
          </div>

          <div class="card panel">
            <h2 class="panel-title">Events by Type</h2>
            <div class="donut-wrap">
              <canvas id="eventsChart"></canvas>
            </div>
            <ul class="legend">
              <?php foreach ($EVENTS_BY_TYPE as $e): ?>
                <li>
                  <span class="legend-dot" style="background:<?= htmlspecialchars($e['color']) ?>"></span>
                  <?= htmlspecialchars($e['label']) ?>
                  <span class="legend-pct"><?= $e['pct'] ?>%</span>
                </li>
              <?php endforeach; ?>
            </ul>
          </div>
        </section>
      </main>
    </div>
  </div>

  <script>
    const revenueLabels = <?= json_encode(array_column($REVENUE_SERIES, 'month')) ?>;
    const revenueValues = <?= json_encode(array_column($REVENUE_SERIES, 'value')) ?>;

    new Chart(document.getElementById('revenueChart'), {
      type: 'line',
      data: {
        labels: revenueLabels,
        datasets: [{
          data: revenueValues,
          borderColor: '#a9822f',
          backgroundColor: 'rgba(169, 130, 47, 0.12)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.45,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#a9822f',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            grid: { color: '#eee9df', drawTicks: false },
            border: { display: false },
            ticks: {
              callback: (v) => '₱' + (v / 1000) + 'k',
              color: '#6b6459',
              font: { size: 12 }
            }
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#6b6459', font: { size: 12 } }
          }
        }
      }
    });

    const eventLabels = <?= json_encode(array_column($EVENTS_BY_TYPE, 'label')) ?>;
    const eventValues = <?= json_encode(array_column($EVENTS_BY_TYPE, 'pct')) ?>;
    const eventColors = <?= json_encode(array_column($EVENTS_BY_TYPE, 'color')) ?>;

    new Chart(document.getElementById('eventsChart'), {
      type: 'doughnut',
      data: {
        labels: eventLabels,
        datasets: [{
          data: eventValues,
          backgroundColor: eventColors,
          borderWidth: 3,
          borderColor: '#ffffff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } }
      }
    });

    // Close mobile sidebar when a nav link is tapped
    document.querySelectorAll('.sidebar-link').forEach(el => {
      el.addEventListener('click', () => document.getElementById('sidebar').classList.remove('is-open'));
    });
  </script>
</body>
</html>
