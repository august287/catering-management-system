<?php
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/icons.php';

// Already logged in? Skip straight to the right dashboard.
if ($user = current_user()) {
    header('Location: ' . BASE_URL . ($user['role'] === 'admin' ? '/admin/dashboard.php' : '/customer/menu.php'));
    exit;
}

$error = '';
$emailValue = 'admin@caterpro.ph';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $emailValue = $email;

    if ($email === '' || $password === '') {
        $error = 'Please enter both your email address and password.';
    } elseif (!isset($USERS[$email]) || $USERS[$email]['password'] !== $password) {
        $error = 'Incorrect email or password. Please try again.';
    } else {
        $_SESSION['user'] = [
            'email' => $email,
            'role'  => $USERS[$email]['role'],
            'name'  => $USERS[$email]['name'],
        ];
        header('Location: ' . BASE_URL . ($USERS[$email]['role'] === 'admin' ? '/admin/dashboard.php' : '/customer/menu.php'));
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In · Natalie's Catering</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <div class="login-shell">
    <div class="login-visual" style="background-image: url('https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1400&auto=format&fit=crop');"></div>

    <div class="login-panel">
      <div class="login-brand">
        <span class="login-brand__mark"><?= icon('utensils') ?></span>
        <span class="login-brand__name">Natalie's Catering</span>
      </div>

      <h2 class="login-heading">Welcome back</h2>
      <p class="login-sub">Sign in to your account to continue.</p>

      <?php if ($error): ?>
        <div class="form-error"><?= htmlspecialchars($error) ?></div>
      <?php endif; ?>

      <form method="post" action="login.php" novalidate>
        <div class="field">
          <label for="email">Email address</label>
          <input type="email" id="email" name="email" value="<?= htmlspecialchars($emailValue) ?>" placeholder="you@example.com" required>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary">Sign In</button>
      </form>

      <p class="login-register">Don't have an account? <a href="register.php">Register here</a></p>

      <div class="demo-box">
        <div><strong>Demo Credentials</strong></div>
        <div class="row">Admin: admin@caterpro.ph / admin123</div>
        <div class="row">Customer: customer@test.ph / pass123</div>
      </div>
    </div>
  </div>
</body>
</html>
