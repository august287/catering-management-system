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

    // guest count range tests (client policy: 100-200 pax)
    assert.strictEqual(utils.MIN_GUEST_COUNT, 100, 'MIN_GUEST_COUNT must be 100');
    assert.strictEqual(utils.MAX_GUEST_COUNT, 200, 'MAX_GUEST_COUNT must be 200');
    assert.strictEqual(utils.isValidGuestCount(100), true, '100 pax must be valid');
    assert.strictEqual(utils.isValidGuestCount(200), true, '200 pax must be valid');
    assert.strictEqual(utils.isValidGuestCount(99), false, '99 pax must be invalid');
    assert.strictEqual(utils.isValidGuestCount(201), false, '201 pax must be invalid');
    assert.strictEqual(utils.isValidGuestCount(150.5), false, 'fractional pax must be invalid');

    // booking date must be at least 1 week ahead
    const fixedToday = new Date(2026, 9, 23, 12, 0, 0);
    assert.strictEqual(utils.MIN_BOOKING_DAYS, 7, 'MIN_BOOKING_DAYS must be 7');
    assert.strictEqual(utils.getMinimumBookingDate(fixedToday), '2026-10-30', 'Minimum booking date must be 7 days ahead');
    assert.strictEqual(utils.isAtLeastOneWeekAhead('2026-10-30', fixedToday), true, '7-day advance booking must be accepted');
    assert.strictEqual(utils.isAtLeastOneWeekAhead('2026-10-29', fixedToday), false, '6-day advance booking must be rejected');

    // payment reference validation tests
    assert.strictEqual(utils.isValidPaymentReference('GCASH-19284091'), true, 'valid GCash reference rejected');
    assert.strictEqual(utils.isValidPaymentReference('BDO_REF.4921'), true, 'valid bank reference rejected');
    assert.strictEqual(utils.isValidPaymentReference('ABC123'), true, 'six-character reference rejected');
    assert.strictEqual(utils.isValidPaymentReference('AB12'), false, 'too-short reference accepted');
    assert.strictEqual(utils.isValidPaymentReference('GCASH 19284091'), false, 'reference with spaces accepted');
    assert.strictEqual(utils.isValidPaymentReference('-GCASH19284091'), false, 'reference starting with hyphen accepted');
    assert.strictEqual(utils.isValidPaymentReference('GCASH#19284091'), false, 'reference with invalid symbol accepted');
    assert.strictEqual(utils.isValidPaymentReference('A'.repeat(81)), false, 'overlong reference accepted');

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
      assert.ok(pkg.min_pax >= 100 && pkg.min_pax <= 200, `Package ${pkg.name} min_pax must be between 100 and 200`);
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

    const migration003Sql = fs.readFileSync('./supabase/migrations/003_fix_security_and_booking.sql', 'utf-8');
    assert.ok(migration003Sql.includes('generate_booking_code'), 'Migration 003 missing booking code generator');
    assert.ok(migration003Sql.includes('EXISTS (SELECT 1 FROM reservations'), 'Migration 003 trigger must check for existing booking codes');
    assert.ok(migration003Sql.includes('Authenticated insert notifications'), 'Migration 003 missing notification insert policy');
    assert.ok(migration003Sql.includes('Customers update own reservations'), 'Migration 003 missing drop of customer update policy');
    assert.ok(migration003Sql.includes("'customer'"), 'Migration 003 missing hardcoded customer role in handle_new_user');
    assert.ok(migration003Sql.includes('payment-proofs'), 'Migration 003 missing payment-proofs storage setup');

    console.log('Testing frontend code integrity across BUG-01 to BUG-16 ...');
    const useAuthCode = fs.readFileSync('./src/hooks/useAuth.tsx', 'utf-8');
    assert.ok(!useAuthCode.includes("email.includes('admin')"), 'useAuth must not determine admin role by email substring');
    assert.ok(!useAuthCode.includes("cleanEmail.includes('admin')"), 'useAuth must not determine admin role by cleanEmail substring');

    const myResCode = fs.readFileSync('./src/pages/customer/MyReservations.tsx', 'utf-8');
    assert.ok(myResCode.includes("res.status !== 'completed'"), 'MyReservations must block completed reservations from payment');
    assert.ok(!myResCode.includes('00000000-0000-0000-0000-000000000002'), 'MyReservations must not contain hardcoded demo user fallback');

    const sidebarCode = fs.readFileSync('./src/components/layout/Sidebar.tsx', 'utf-8');
    assert.ok(sidebarCode.includes('profile?.id'), 'Sidebar must support active admin profile ID for notifications');

    const topbarCode = fs.readFileSync('./src/components/layout/Topbar.tsx', 'utf-8');
    assert.ok(topbarCode.includes('profile?.id'), 'Topbar must support active admin profile ID for notifications');

    const paymentsCustCode = fs.readFileSync('./src/pages/customer/Payments.tsx', 'utf-8');
    assert.ok(paymentsCustCode.includes('5 * 1024 * 1024'), 'Payments must enforce 5MB file size limit');
    assert.ok(paymentsCustCode.includes('image/webp'), 'Payments must support WebP, JPG, PNG');
    assert.ok(paymentsCustCode.includes("r.status !== 'completed'"), 'Payments must exclude completed bookings from payable');

    const reportsCode = fs.readFileSync('./src/pages/admin/Reports.tsx', 'utf-8');
    assert.ok(reportsCode.includes('fullMonthNames'), 'Reports must map peak catering month to full month name');

    // BUG-A: customers must not be able to change their own role
    const migration010Sql = fs.readFileSync('./supabase/migrations/010_lock_profile_role.sql', 'utf-8');
    assert.ok(migration010Sql.includes('new.role is distinct from old.role'), 'Migration 010 must detect role changes');
    assert.ok(migration010Sql.includes('not public.is_admin()'), 'Migration 010 must only allow admins to change roles');
    assert.ok(migration010Sql.includes('before update on public.profiles'), 'Migration 010 trigger must run before profile updates');

    // BUG-B: save first, check the result, then notify
    const dataHookCode = fs.readFileSync('./src/hooks/useCateringData.ts', 'utf-8');
    const sliceFn = (name, nextName) =>
      dataHookCode.slice(dataHookCode.indexOf(`const ${name} =`), dataHookCode.indexOf(`const ${nextName} =`));
    for (const [fn, next, table] of [
      ['verifyPayment', 'markNotificationAsRead', 'payments'],
      ['updateReservationStatus', 'submitPayment', 'reservations'],
    ]) {
      const body = sliceFn(fn, next);
      const updateAt = body.search(new RegExp(`from\\('${table}'\\)\\s*\\.update\\(`));
      const notifyAt = body.indexOf("from('notifications').insert");
      assert.ok(updateAt !== -1, `${fn} must update ${table}`);
      assert.ok(notifyAt > updateAt, `${fn} must save the change before notifying the customer`);
      assert.ok(body.includes('updateError') && body.includes('savedRows.length === 0'), `${fn} must check the update result`);
    }

    console.log('✓ Supabase schema, migration SQL & code integrity verified');

    // Reservation calendar availability & double-booking guard
    console.log('Testing src/lib/availability.ts ...');
    const avail = await loadTsModule('./src/lib/availability.ts');
    const sample = [
      { id: 1, event_date: '2026-11-20', status: 'confirmed' },
      { id: 2, event_date: '2026-11-21', status: 'cancelled' },
      { id: 3, event_date: '2026-11-22', status: 'completed' },
      { id: 4, event_date: '2026-11-23', status: 'pending' },
      { id: 5, event_date: '2026-11-23', status: 'in_progress' },
    ];
    const map = avail.buildAvailabilityMap(sample);
    assert.deepStrictEqual(map, { '2026-11-20': 1, '2026-11-23': 2 }, 'cancelled/completed bookings must free their date');
    assert.deepStrictEqual(avail.buildAvailabilityMap(sample, 1), { '2026-11-23': 2 }, 'excluded reservation must not count');
    assert.ok(avail.isDateFullyBooked(map, '2026-11-20'), 'a date with an active booking is full at capacity 1');
    assert.ok(!avail.isDateFullyBooked(map, '2026-11-21'), 'a date with only a cancelled booking is open');
    assert.ok(!avail.isDateFullyBooked(map, '2026-11-20', 2), 'capacity 2 leaves a slot');
    const today = '2026-11-01', minKey = '2026-11-08';
    assert.strictEqual(avail.getDateStatus('2026-10-31', map, today, minKey), 'past');
    assert.strictEqual(avail.getDateStatus('2026-11-05', map, today, minKey), 'too_soon');
    assert.strictEqual(avail.getDateStatus('2026-11-20', map, today, minKey), 'booked');
    assert.strictEqual(avail.getDateStatus('2026-11-21', map, today, minKey), 'available');
    assert.strictEqual(avail.getDateStatus('2026-11-20', map, today, minKey, 2), 'limited');
    assert.ok(avail.isDoubleBookingError('DATE_FULLY_BOOKED: 2026-11-20 is already fully booked.'));
    assert.ok(!avail.isDoubleBookingError('some other error'));
    const grid = avail.getMonthGrid(2026, 10); // November 2026
    assert.strictEqual(grid.length % 7, 0, 'month grid must be whole weeks');
    assert.strictEqual(grid[0].getDay(), 0, 'month grid must start on Sunday');
    assert.ok(grid.some(d => avail.toDateKey(d) === '2026-11-30'), 'month grid must include the last day');
    assert.strictEqual(avail.MAX_EVENTS_PER_DAY, 1, 'keep MAX_EVENTS_PER_DAY in sync with max_events_per_day() in migration 011');

    const availSql = fs.readFileSync('./supabase/migrations/011_reservation_availability.sql', 'utf-8');
    assert.ok(availSql.includes('select 1 $$'), 'migration 011 capacity must match MAX_EVENTS_PER_DAY');
    assert.ok(availSql.includes('pg_advisory_xact_lock'), 'double-booking trigger must lock the date against concurrent inserts');
    assert.ok(availSql.includes('security definer') && !/selects+r.*/i.test(availSql), 'availability RPC must expose counts only');
    const ccd = fs.readFileSync('./src/hooks/useCateringData.ts', 'utf-8');
    const createBody = ccd.slice(ccd.indexOf('const createReservation'), ccd.indexOf('const updateReservationStatus'));
    assert.ok(createBody.indexOf('isDateFullyBooked') < createBody.indexOf("from('reservations')"), 'createReservation must check availability before inserting');
    console.log('✓ src/lib/availability.ts & double-booking guard tests passed');



    console.log('\n========================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
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
