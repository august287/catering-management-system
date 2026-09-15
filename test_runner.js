import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const tempDir = path.resolve('./node_modules/.test_cache');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Transpile a TypeScript file to a temporary .mjs file and import it directly
async function loadTsModule(relativeFilePath) {
  const fullPath = path.resolve(relativeFilePath);
  const tsCode = fs.readFileSync(fullPath, 'utf-8');
  
  // Resolve @/ aliases to absolute paths or relative to the temp file
  const typesPath = path.resolve('./src/types/database').replace(/\\/g, '/');
  const libPath = path.resolve('./src/lib').replace(/\\/g, '/');

  const transformed = tsCode
    .replace(/@\/types\/database/g, typesPath)
    .replace(/@\/lib/g, libPath);

  const result = ts.transpileModule(transformed, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      removeComments: false,
    },
  });

  const tempFile = path.join(tempDir, `test_${path.basename(relativeFilePath, '.ts')}.mjs`);
  fs.writeFileSync(tempFile, result.outputText);
  
  const fileUrl = 'file:///' + tempFile.replace(/\\/g, '/') + `?t=${Date.now()}`;
  return import(fileUrl);
}

async function runTests() {
  console.log('--- NATALIE\'S CATERING TEST SUITE ---');

  try {
    // 1. Test src/lib/utils.ts functions
    console.log('Testing src/lib/utils.ts ...');
    const utils = await loadTsModule('./src/lib/utils.ts');

    // formatCurrency tests
    assert.strictEqual(utils.formatCurrency(0), '₱0.00', 'formatCurrency(0) must return ₱0.00');
    assert.strictEqual(utils.formatCurrency(450), '₱450.00', 'formatCurrency(450) must return ₱450.00');
    assert.strictEqual(utils.formatCurrency(142500), '₱142,500.00', 'formatCurrency(142500) must return ₱142,500.00');
    assert.strictEqual(utils.formatCurrency('350.5'), '₱350.50', 'formatCurrency string parse failed');
    assert.strictEqual(utils.formatCurrency(null), '₱0.00', 'formatCurrency(null) must return ₱0.00');
    assert.strictEqual(utils.formatCurrency(undefined), '₱0.00', 'formatCurrency(undefined) must return ₱0.00');
    assert.strictEqual(utils.formatCurrency('invalid'), '₱0.00', 'formatCurrency(invalid) must return ₱0.00');

    // formatDate tests
    assert.strictEqual(utils.formatDate('2026-10-24'), 'Oct 24, 2026', 'formatDate(2026-10-24) failed');
    assert.strictEqual(utils.formatDate(null), '—', 'formatDate(null) must return —');
    assert.strictEqual(utils.formatDate(undefined), '—', 'formatDate(undefined) must return —');

    // formatTime tests
    assert.strictEqual(utils.formatTime('17:00'), '5:00 PM', 'formatTime(17:00) must return 5:00 PM');
    assert.strictEqual(utils.formatTime('09:30'), '9:30 AM', 'formatTime(09:30) must return 9:30 AM');
    assert.strictEqual(utils.formatTime('12:00'), '12:00 PM', 'formatTime(12:00) must return 12:00 PM');
    assert.strictEqual(utils.formatTime('00:15'), '12:15 AM', 'formatTime(00:15) must return 12:15 AM');
    assert.strictEqual(utils.formatTime(null), '—', 'formatTime(null) must return —');

    // initials tests
    assert.strictEqual(utils.initials('Maria Santos'), 'MS', 'initials(Maria Santos) must return MS');
    assert.strictEqual(utils.initials('Juan'), 'J', 'initials(Juan) must return J');
    assert.strictEqual(utils.initials(''), '?', 'initials("") must return ?');
    assert.strictEqual(utils.initials(null), '?', 'initials(null) must return ?');

    console.log('✓ src/lib/utils.ts tests passed');

    // 2. Test src/lib/mockData.ts entities & local asset references
    console.log('Testing src/lib/mockData.ts ...');
    const mockData = await loadTsModule('./src/lib/mockData.ts');

    // Profiles
    assert.strictEqual(mockData.INITIAL_PROFILES.length, 4, 'Must have 4 seed profiles');
    const adminProf = mockData.INITIAL_PROFILES.find(p => p.role === 'admin');
    assert.ok(adminProf, 'Must contain an admin profile');

    // Accounts
    assert.ok(Array.isArray(mockData.INITIAL_ACCOUNTS), 'INITIAL_ACCOUNTS must be an array');
    assert.ok(mockData.INITIAL_ACCOUNTS.length >= 2, 'Must have at least admin and customer demo accounts');
    assert.ok(
      mockData.INITIAL_ACCOUNTS.some(a => a.email === 'admin@caterpro.ph' && a.password === 'admin123'),
      'Admin demo credentials must be present'
    );
    assert.ok(
      mockData.INITIAL_ACCOUNTS.some(a => a.email === 'customer@test.ph' && a.password === 'pass123'),
      'Customer demo credentials must be present'
    );

    // Themes & local images
    assert.strictEqual(mockData.INITIAL_THEMES.length, 6, 'Must have 6 catering themes');
    for (const theme of mockData.INITIAL_THEMES) {
      assert.ok(theme.name, 'Theme must have a name');
      assert.ok(theme.tagline, 'Theme must have a tagline');
      assert.ok(theme.image_url, `Theme ${theme.name} must have an image_url`);
      assert.ok(theme.image_url.startsWith('/images/'), `Theme image ${theme.image_url} must be local`);
      const diskPath = path.join('public', theme.image_url.replace(/^\//, ''));
      assert.ok(fs.existsSync(diskPath), `Local image for theme ${theme.name} not found at ${diskPath}`);
    }

    // Categories & Menu Items
    assert.strictEqual(mockData.INITIAL_CATEGORIES.length, 6, 'Must have 6 menu categories');
    assert.strictEqual(mockData.INITIAL_MENU_ITEMS.length, 26, 'Must have 26 Filipino dishes');
    for (const item of mockData.INITIAL_MENU_ITEMS) {
      assert.ok(item.name, 'Dish must have a name');
      assert.ok(item.price_per_head > 0, `Dish ${item.name} must have price_per_head > 0`);
      assert.ok(
        mockData.INITIAL_CATEGORIES.some(c => c.id === item.category_id),
        `Dish ${item.name} category_id must map to a valid category`
      );
    }

    // Packages
    assert.strictEqual(mockData.INITIAL_PACKAGES.length, 5, 'Must have 5 packages');
    for (const pkg of mockData.INITIAL_PACKAGES) {
      assert.ok(pkg.price_per_pax >= 400 && pkg.price_per_pax <= 950, `Package ${pkg.name} price out of expected range`);
      assert.ok(pkg.min_pax >= 30, `Package ${pkg.name} min_pax must be at least 30`);
    }

    // Rental Items
    assert.strictEqual(mockData.INITIAL_RENTAL_ITEMS.length, 8, 'Must have 8 rental items');
    for (const rent of mockData.INITIAL_RENTAL_ITEMS) {
      assert.ok(rent.rate_per_unit > 0, `Rental ${rent.name} rate must be > 0`);
      assert.ok(rent.stock_quantity > 0, `Rental ${rent.name} stock must be > 0`);
    }

    // Reservations & Statuses
    assert.strictEqual(mockData.INITIAL_RESERVATIONS.length, 15, 'Must have 15 reservations');
    const statuses = mockData.INITIAL_RESERVATIONS.map(r => r.status);
    assert.strictEqual(statuses.filter(s => s === 'pending').length, 3, 'Must have 3 pending reservations');
    assert.strictEqual(statuses.filter(s => s === 'confirmed').length, 5, 'Must have 5 confirmed reservations');
    assert.strictEqual(statuses.filter(s => s === 'completed').length, 4, 'Must have 4 completed reservations');
    assert.strictEqual(statuses.filter(s => s === 'cancelled').length, 2, 'Must have 2 cancelled reservations');
    assert.strictEqual(statuses.filter(s => s === 'in_progress').length, 1, 'Must have 1 in_progress reservation');

    for (const res of mockData.INITIAL_RESERVATIONS) {
      assert.match(res.booking_code, /^RES-\d{4}-\d{4}$/, `Booking code ${res.booking_code} format invalid`);
      assert.ok(res.total_amount > 0, `Reservation ${res.booking_code} total_amount must be > 0`);
    }

    // Linked rentals on seed reservations 1, 2, 3, 7, 13
    const res1 = mockData.INITIAL_RESERVATIONS.find(r => r.id === 1);
    assert.ok(res1.rentals && res1.rentals.length === 3, 'Reservation 1 must have 3 rental items');
    const res2 = mockData.INITIAL_RESERVATIONS.find(r => r.id === 2);
    assert.ok(res2.rentals && res2.rentals.length === 1, 'Reservation 2 must have 1 rental item');

    // Payments
    assert.strictEqual(mockData.INITIAL_PAYMENTS.length, 10, 'Must have 10 payments');
    for (const pay of mockData.INITIAL_PAYMENTS) {
      assert.ok(pay.amount > 0, 'Payment amount must be > 0');
      assert.ok(
        mockData.INITIAL_RESERVATIONS.some(r => r.id === pay.reservation_id),
        `Payment ${pay.id} must reference a valid reservation`
      );
      assert.ok(pay.proof_image_url.startsWith('/images/'), `Payment proof ${pay.proof_image_url} must be local`);
      const proofDiskPath = path.join('public', pay.proof_image_url.replace(/^\//, ''));
      assert.ok(fs.existsSync(proofDiskPath), `Payment proof file not found on disk at ${proofDiskPath}`);
    }

    console.log('✓ src/lib/mockData.ts entities, relations, and local assets verified');

    // 3. Schema & Seed SQL File Verification
    console.log('Testing SQL schema & seed scripts ...');
    const schemaSql = fs.readFileSync('./supabase/migrations/001_initial_schema.sql', 'utf-8');
    assert.ok(schemaSql.includes('create table if not exists profiles'), 'Schema missing profiles');
    assert.ok(schemaSql.includes('create table if not exists event_themes'), 'Schema missing event_themes');
    assert.ok(schemaSql.includes('create table if not exists menu_categories'), 'Schema missing menu_categories');
    assert.ok(schemaSql.includes('create table if not exists menu_items'), 'Schema missing menu_items');
    assert.ok(schemaSql.includes('create table if not exists packages'), 'Schema missing packages');
    assert.ok(schemaSql.includes('create table if not exists rental_items'), 'Schema missing rental_items');
    assert.ok(schemaSql.includes('create table if not exists reservations'), 'Schema missing reservations');
    assert.ok(schemaSql.includes('create table if not exists reservation_rentals'), 'Schema missing reservation_rentals');
    assert.ok(schemaSql.includes('create table if not exists payments'), 'Schema missing payments');
    assert.ok(schemaSql.includes('create table if not exists notifications'), 'Schema missing notifications');
    assert.ok(schemaSql.includes('alter table profiles enable row level security'), 'Schema missing RLS for profiles');
    assert.ok(schemaSql.includes('alter table reservations enable row level security'), 'Schema missing RLS for reservations');
    assert.ok(schemaSql.includes('insert into storage.buckets'), 'Schema missing payment-proofs bucket');

    const seedSql = fs.readFileSync('./supabase/seed.sql', 'utf-8');
    assert.ok(seedSql.includes('/images/receipt_sample.svg'), 'Seed SQL must reference /images/receipt_sample.svg');
    assert.ok(!seedSql.includes('/images/receipt_sample.png'), 'Seed SQL must not reference nonexistent .png receipt');
    assert.ok(seedSql.includes('insert into reservation_rentals'), 'Seed SQL must contain reservation_rentals');

    console.log('✓ Supabase schema & seed SQL verified');

    console.log('\n========================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY (12/12)!');
    console.log('========================================');
  } finally {
    // Cleanup temp cache
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
