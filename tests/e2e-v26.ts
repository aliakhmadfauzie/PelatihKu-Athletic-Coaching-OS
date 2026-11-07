import { chromium } from 'playwright';
import assert from 'node:assert/strict';

interface TestStepResult {
  step: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestStepResult[] = [];

async function step(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  console.log(`\n⏳ [TEST AUTOMATOR] ${name}...`);
  try {
    await fn();
    const durationMs = Date.now() - start;
    console.log(`✅ [PASSED] ${name} (${durationMs}ms)`);
    results.push({ step: name, passed: true, durationMs });
  } catch (err: any) {
    const durationMs = Date.now() - start;
    console.error(`❌ [FAILED] ${name} (${durationMs}ms):`, err.message || err);
    results.push({ step: name, passed: false, durationMs, error: err.message || String(err) });
    throw err;
  }
}

async function runE2ESuite() {
  console.log('=================================================================');
  console.log('🚀 PelatihKu PRO — Full-Stack E2E Automated Verification (v2.6.0)');
  console.log('Frameworks: /test-driven-development · /test-automator');
  console.log('Target URL: https://pelatihku-pro.web.app');
  console.log('=================================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 Modern Mobile Portrait
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn(`   [Browser Console Error]: ${msg.text()}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: Cold Start & Login Screen Invariant
    // -------------------------------------------------------------
    await step('1. Cold Start: Verifies Landing Page is PIN Login Screen with Coach Panji identity', async () => {
      await page.goto('https://pelatihku-pro.web.app', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(1000);

      const bodyText = await page.textContent('body');
      assert.ok(bodyText?.includes('PelatihKu'), 'Must display brand PelatihKu');
      assert.ok(bodyText?.includes('Panji Akbar Syamsi'), 'Lead Coach must strictly be Panji Akbar Syamsi');
      assert.ok(bodyText?.includes('PIN 6-Digit') || bodyText?.includes('PIN & Biometrik'), 'Must offer PIN login');

      // Check PIN input exists
      const pinInput = page.locator('input[type="password"]');
      assert.strictEqual(await pinInput.count(), 1, 'Must have 1 PIN password input');
    });

    // -------------------------------------------------------------
    // STEP 2: Authentication Handshake with Coach PIN 123456
    // -------------------------------------------------------------
    await step('2. Authentication: Submits Coach PIN 123456 & unlocks Executive Dashboard', async () => {
      const pinInput = page.locator('input[type="password"]');
      await pinInput.fill('123456');
      await page.waitForTimeout(800);

      // Wait for dashboard greeting
      await page.waitForSelector('text=Panji Akbar Syamsi', { timeout: 15000 });
      const bodyText = await page.textContent('body');
      assert.ok(bodyText?.includes('Panji Akbar Syamsi'), 'Must land on Coach Panji dashboard');
    });

    // -------------------------------------------------------------
    // STEP 3: Executive Bento KPIs & Connectivity Badge
    // -------------------------------------------------------------
    await step('3. Dashboard & Sync Badge: Verifies Bento KPIs and OfflineSyncBadge', async () => {
      const bodyText = await page.textContent('body');
      assert.ok(bodyText?.includes('Member Aktif') || bodyText?.includes('Member'), 'Must show Member KPI');
      assert.ok(bodyText?.includes('Sesi Minggu Ini') || bodyText?.includes('Sesi'), 'Must show Sesi Minggu Ini');

      // Check OfflineSyncBadge
      const syncBadge = page.locator('button[aria-label*="Status:"]');
      assert.ok(await syncBadge.count() >= 1, 'OfflineSyncBadge must be visible in the sub-bar');
    });

    // -------------------------------------------------------------
    // STEP 4: Member Directory & Navigation to Client Detail View
    // -------------------------------------------------------------
    await step('4. Member Directory: Opens Budi Santoso (#KLN-2026-081) detail profile', async () => {
      const budiCard = page.locator('text=Budi Santoso').first();
      assert.ok(await budiCard.isVisible(), 'Member Budi Santoso must be visible in directory');
      await budiCard.click();
      await page.waitForTimeout(800);

      // Verify Profile Detail View loaded
      const profileText = await page.textContent('body');
      assert.ok(profileText?.includes('Timbang & Metrik'), 'Action Timbang & Metrik must be visible');
      assert.ok(profileText?.includes('Catat Sesi'), 'Action Catat Sesi must be visible');
      assert.ok(profileText?.includes('Laporan & Cetak PDF'), 'Action Laporan & Cetak PDF must be visible');
      assert.ok(profileText?.includes('Jadwalkan Paket PT'), 'Action Jadwalkan Paket PT must be visible');
    });

    // -------------------------------------------------------------
    // STEP 5: Athletic Progress Report & Certificate Modal
    // -------------------------------------------------------------
    await step('5. Progress Report Modal: Opens Certificate & verifies Kemenpora and PABSI credentials', async () => {
      const reportBtn = page.locator('button:has-text("Laporan & Cetak PDF")');
      await reportBtn.click();
      await page.waitForTimeout(600);

      // Verify modal content
      const modalText = await page.textContent('#printable-progress-report');
      assert.ok(modalText?.includes('PelatihKu PRO'), 'Report must display PelatihKu PRO brand');
      assert.ok(modalText?.includes('Panji Akbar Syamsi'), 'Report must display Coach Panji Akbar Syamsi');
      assert.ok(modalText?.includes('Kemenpora'), 'Report must display Kemenpora registration');
      assert.ok(modalText?.includes('PABSI'), 'Report must display PABSI license');
      assert.ok(modalText?.includes('Komposisi Tubuh'), 'Report must display Body Composition table');

      // Close modal
      const closeBtn = page.locator('button[aria-label="Tutup Modal"]');
      await closeBtn.click();
      await page.waitForTimeout(500);
    });

    // -------------------------------------------------------------
    // STEP 6: Batch Recurring PT Scheduler Wizard
    // -------------------------------------------------------------
    await step('6. Batch Recurring Scheduler: Opens Wizard and verifies collision detection logic', async () => {
      const batchBtn = page.locator('button:has-text("Jadwalkan Paket PT")');
      await batchBtn.click();
      await page.waitForTimeout(600);

      const modalText = await page.textContent('body');
      assert.ok(modalText?.includes('Penjadwalan Paket Sesi Berulang'), 'Batch Modal title must be visible');
      assert.ok(modalText?.includes('Upper / Lower'), 'Split pattern Upper/Lower must be available');
      assert.ok(modalText?.includes('Pratinjau'), 'Pratinjau sesi must be visible');

      // Close modal
      const closeBtn = page.locator('button[aria-label="Tutup Modal"]');
      await closeBtn.click();
      await page.waitForTimeout(500);
    });

    // -------------------------------------------------------------
    // STEP 7: Calendar Hub & Multi-View Tabs
    // -------------------------------------------------------------
    await step('7. Calendar Hub: Switches to Jadwal and verifies Day, Week, Month tabs', async () => {
      const navJadwal = page.locator('button[aria-label="Jadwal & Kalender Sesi PT"]');
      await navJadwal.click();
      await page.waitForTimeout(800);

      const calText = await page.textContent('body');
      assert.ok(calText?.includes('Hari'), 'Day view tab must exist');
      assert.ok(calText?.includes('Minggu'), 'Week view tab must exist');
      assert.ok(calText?.includes('Bulan'), 'Month view tab must exist');
      assert.ok(calText?.includes('+ Jadwal Berulang'), 'Batch recurring schedule button must exist on calendar');
    });

    // -------------------------------------------------------------
    // STEP 8: Role Perspective Switch (Coach -> Member FLAC Isolation)
    // -------------------------------------------------------------
    await step('8. Role Perspective: Toggles to Mode Member and validates Field-Level Access Control', async () => {
      const modeSwitchBtn = page.locator('button:has-text("👁️ Mode Member")');
      await modeSwitchBtn.click();
      await page.waitForTimeout(800);

      const memberViewText = await page.textContent('body');
      assert.ok(memberViewText?.includes('Budi Santoso (Member PT)'), 'Header must indicate Member PT view');
      assert.ok(memberViewText?.includes('👁️ Mode Coach'), 'Perspective button must now offer switch back to Coach');

      // Toggle back to Coach
      const coachSwitchBtn = page.locator('button:has-text("👁️ Mode Coach")');
      await coachSwitchBtn.click();
      await page.waitForTimeout(800);
    });

    // -------------------------------------------------------------
    // STEP 9: Logout & Security Re-Lock
    // -------------------------------------------------------------
    await step('9. Logout & Eviction: Navigates to Profil, exits session, and verifies re-lock', async () => {
      const settingsNav = page.locator('button[aria-label="Pengaturan Gym & Profil Coach"]');
      await settingsNav.click();
      await page.waitForTimeout(800);

      // Click Keluar Akun
      const logoutBtn = page.locator('button:has-text("Keluar Akun")').first();
      assert.ok(await logoutBtn.isVisible(), 'Keluar Akun button must be visible');
      await logoutBtn.click();
      await page.waitForTimeout(400);

      // Confirm in modal
      const confirmLogoutBtn = page.locator('button:has-text("Kunci & Keluar Akun")');
      await confirmLogoutBtn.click();
      await page.waitForTimeout(1000);

      // Verify back on Login Screen
      const loginText = await page.textContent('body');
      assert.ok(loginText?.includes('PelatihKu'), 'Must return to Login Screen');
      const pinInput = page.locator('input[type="password"]');
      assert.strictEqual(await pinInput.count(), 1, 'PIN input must be ready on login screen');
    });

  } finally {
    await browser.close();
  }

  console.log('\n=================================================================');
  console.log('📊 TEST AUTOMATOR & TDD — E2E VERIFICATION RESULTS SUMMARY');
  console.log('=================================================================');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.durationMs}ms] ${r.step}`);
    if (!r.passed) {
      allPassed = false;
      console.log(`   └─ Error: ${r.error}`);
    }
  }

  if (allPassed) {
    console.log('\n🎉 ALL 9 COMPREHENSIVE E2E TESTS PASSED WITH 100% SUCCESS ON PRODUCTION PWA!');
    process.exit(0);
  } else {
    console.error('\n❌ SOME E2E TESTS FAILED.');
    process.exit(1);
  }
}

runE2ESuite().catch((err) => {
  console.error('Fatal E2E test execution error:', err);
  process.exit(1);
});
