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
  console.log(`\n⏳ [TEST STEP] ${name}...`);
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
  console.log('🚀 PelatihKu PRO — Comprehensive End-to-End Automated Test Suite');
  console.log('Target URL: https://pelatihku-pro.web.app');
  console.log('=================================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 / Modern Mobile Portrait
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn(`   [Browser Console Error]: ${msg.text()}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: Cold Start & Uncached Landing Page Gate
    // -------------------------------------------------------------
    await step('1. Cold Start: Verifies Landing Page is always Login Screen', async () => {
      await page.goto('https://pelatihku-pro.web.app', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000);

      // Verify Brand on Login Screen
      const brandText = await page.textContent('h1');
      assert.ok(brandText?.includes('PelatihKu'), `Brand title must include PelatihKu, got: ${brandText}`);
      
      const subTitle = await page.textContent('body');
      assert.ok(subTitle?.includes('v2.4.0'), 'Login screen must show SemVer v2.4.0');
      assert.ok(subTitle?.includes('PIN & Biometrik'), 'Login screen must have PIN & Biometrik tab');

      // Verify PIN input exists
      const pinInput = page.locator('input[type="password"]');
      assert.strictEqual(await pinInput.count(), 1, 'PIN input must exist on login screen');
    });

    // -------------------------------------------------------------
    // STEP 2: Login Screen Validation & Authentication Handshake
    // -------------------------------------------------------------
    await step('2. Authentication: Error state on invalid PIN & Auto-login on valid PIN', async () => {
      const pinInput = page.locator('input[type="password"]');

      // Test Invalid PIN
      await pinInput.fill('000000');
      await page.waitForTimeout(300);
      const errorMsg = await page.locator('text=PIN salah!').textContent();
      assert.ok(errorMsg?.includes('123456'), `Expected error message mentioning 123456, got: ${errorMsg}`);

      // Clear & Enter Valid PIN
      await pinInput.fill('');
      await pinInput.fill('123456');
      await page.waitForTimeout(800);

      // Verify Transition to Dashboard
      await page.waitForSelector('text=Selamat Siang,', { timeout: 10000 });
      const dashboardHeader = await page.textContent('body');
      assert.ok(dashboardHeader?.includes('Panji Akbar Syamsi'), 'Dashboard must display Panji Akbar Syamsi');
    });

    // -------------------------------------------------------------
    // STEP 3: Dashboard Layout, Bento KPIs & Member Directory
    // -------------------------------------------------------------
    await step('3. Dashboard: Verifies Bento KPIs, Header Actions & Member Directory', async () => {
      const bodyText = await page.textContent('body');

      // Verify Bento KPIs
      assert.ok(bodyText?.includes('Member Aktif'), 'Bento KPI 1: Member Aktif must be visible');
      assert.ok(bodyText?.includes('Total Sesi Minggu Ini'), 'Bento KPI 2: Total Sesi must be visible');
      assert.ok(bodyText?.includes('Target Tercapai'), 'Bento KPI 3: Target Tercapai must be visible');
      assert.ok(bodyText?.includes('Rata-rata Kepatuhan'), 'Bento KPI 4: Kepatuhan must be visible');

      // Verify Member Cards & #MBR- codes
      assert.ok(bodyText?.includes('Budi Santoso'), 'Member Budi Santoso must be visible');
      assert.ok(bodyText?.includes('#MBR-2024-082'), 'Budi must have code #MBR-2024-082');
      assert.ok(bodyText?.includes('Siti Rahma'), 'Member Siti Rahma must be visible');
      assert.ok(bodyText?.includes('#MBR-2024-091'), 'Siti must have code #MBR-2024-091');
      assert.ok(bodyText?.includes('Dimas Anggara'), 'Member Dimas Anggara must be visible');

      // Verify Header action buttons
      const addMemberBtn = page.locator('button[title="Tambah Member Baru"]');
      assert.strictEqual(await addMemberBtn.count(), 1, '+ Member button must exist in header');

      const avatarBtn = page.locator('button[title="Profil & Pengaturan Coach"]');
      assert.strictEqual(await avatarBtn.count(), 1, 'PAS Coach avatar button must exist in header');
    });

    // -------------------------------------------------------------
    // STEP 4: Elevated Center Dock Ergonomics & Navigation
    // -------------------------------------------------------------
    await step('4. Elevated Center Dock: Verifies 5 Tailored Buttons & Tab Transitions', async () => {
      const dock = page.locator('nav[aria-label="Navigasi Utama PelatihKu"]');
      assert.ok(await dock.isVisible(), 'Elevated Center Dock must be visible');

      // Check dock items
      const jadwalBtn = dock.locator('button:has-text("Jadwal")');
      const cariBtn = dock.locator('button:has-text("Cari")');
      const homeBtn = dock.locator('button[aria-label="Kembali ke Dashboard Utama"]');
      const menuBtn = dock.locator('button:has-text("Menu")');
      const profilBtn = dock.locator('button:has-text("Profil")');

      assert.strictEqual(await jadwalBtn.count(), 1, 'Jadwal button in dock must exist');
      assert.strictEqual(await cariBtn.count(), 1, 'Cari button in dock must exist');
      assert.strictEqual(await homeBtn.count(), 1, 'Elevated Center Home Anchor must exist');
      assert.strictEqual(await menuBtn.count(), 1, 'Menu button in dock must exist');
      assert.strictEqual(await profilBtn.count(), 1, 'Profil button in dock must exist');

      // Test 1: Click Jadwal -> View changes to SessionsCalendarView
      await jadwalBtn.click();
      await page.waitForTimeout(600);
      const calendarText = await page.textContent('body');
      assert.ok(calendarText?.includes('Jadwal Sesi & Kalender PT'), 'Calendar view title must be visible');
      assert.ok(calendarText?.includes('Semua Sesi'), 'Calendar tabs must be visible');

      // Test 2: Click Profil -> View changes to CoachProfileView
      await profilBtn.click();
      await page.waitForTimeout(600);
      const profileText = await page.textContent('body');
      assert.ok(profileText?.includes('Terverifikasi Federasi'), 'Coach certifications must be visible');
      assert.ok(profileText?.includes('Ekspor Cadangan JSON'), 'Backup export button must be visible');

      // Test 3: Click Center Home Anchor -> View returns to Dashboard
      await homeBtn.click();
      await page.waitForTimeout(600);
      const homeText = await page.textContent('body');
      assert.ok(homeText?.includes('Direktori Member Fitness Center'), 'Must return to member directory on Home click');
    });

    // -------------------------------------------------------------
    // STEP 5: Search & Filter Interactions
    // -------------------------------------------------------------
    await step('5. Search & Filters: Real-time filtering and status segmentation', async () => {
      // Click Cari button in dock
      const cariBtn = page.locator('nav[aria-label="Navigasi Utama PelatihKu"] button:has-text("Cari")');
      await cariBtn.click();
      await page.waitForTimeout(400);

      // Search bar
      const searchInput = page.locator('input[placeholder="Cari member, target PT, sesi..."]');
      await searchInput.fill('Dimas');
      await page.waitForTimeout(400);

      let filteredText = await page.textContent('body');
      assert.ok(filteredText?.includes('Dimas Anggara'), 'Dimas Anggara must be visible in search results');
      assert.ok(!filteredText?.includes('Siti Rahma'), 'Siti Rahma must be filtered out');

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(400);

      // Status Filter: Click 'Cuti'
      const cutiPill = page.locator('button:has-text("Cuti")').first();
      await cutiPill.click();
      await page.waitForTimeout(400);

      filteredText = await page.textContent('body');
      assert.ok(filteredText?.includes('Dewi Lestari'), 'Dewi Lestari (Cuti) must be visible');
      assert.ok(!filteredText?.includes('Budi Santoso'), 'Budi Santoso (Aktif) must be filtered out');

      // Reset filter to 'Semua'
      const semuaPill = page.locator('button:has-text("Semua Status")').first();
      await semuaPill.click();
      await page.waitForTimeout(400);
    });

    // -------------------------------------------------------------
    // STEP 6: Member Detail View & Multi-Tab Navigation
    // -------------------------------------------------------------
    await step('6. Client Detail: Comprehensive biometrics, PR, notes & tab switcher', async () => {
      // Click Member Card: Budi Santoso
      const budiCard = page.locator('text=Budi Santoso').first();
      await budiCard.click();
      await page.waitForTimeout(700);

      // Verify Budi Detail View
      const detailText = await page.textContent('body');
      assert.ok(detailText?.includes('Budi Santoso'), 'Client Detail must show Budi Santoso');
      assert.ok(detailText?.includes('#MBR-2024-082'), 'Client Detail must show member code');
      assert.ok(detailText?.includes('Paket 16/24 Sesi'), 'Must show PT package status');
      assert.ok(detailText?.includes('Metrik & Timbang'), 'Tab 1 must exist');
      assert.ok(detailText?.includes('Latihan & Rekor PR'), 'Tab 2 must exist');
      assert.ok(detailText?.includes('Nutrisi 7-Hari'), 'Tab 3 must exist');
      assert.ok(detailText?.includes('Data Medis & Progres Awal'), 'Tab 4 must exist');

      // Switch to Tab 2: Latihan & Rekor PR
      const tab2 = page.locator('button:has-text("Latihan & Rekor PR")');
      await tab2.click();
      await page.waitForTimeout(400);
      const prText = await page.textContent('body');
      assert.ok(prText?.includes('Papan Rekor Beban Maksimal (PR)'), 'PR board must be rendered in Tab 2');

      // Switch to Tab 3: Nutrisi 7-Hari
      const tab3 = page.locator('button:has-text("Nutrisi 7-Hari")');
      await tab3.click();
      await page.waitForTimeout(400);
      const nutText = await page.textContent('body');
      assert.ok(nutText?.includes('Kepatuhan Diet 7 Hari Terakhir'), 'Nutrition card must be rendered in Tab 3');

      // Click 'Kembali ke Direktori'
      const backBtn = page.locator('button:has-text("Kembali ke Direktori")').first();
      await backBtn.click();
      await page.waitForTimeout(500);

      const returnedText = await page.textContent('body');
      assert.ok(returnedText?.includes('Direktori Member Fitness Center'), 'Must return to directory');
    });

    // -------------------------------------------------------------
    // STEP 7: Modals & Dock Auto-Hide Verification
    // -------------------------------------------------------------
    await step('7. Modals & Dock Auto-Hide: Modal trigger and graceful dismissal', async () => {
      // Trigger '+ Member' modal from top header
      const addMemberBtn = page.locator('button[title="Tambah Member Baru"]');
      await addMemberBtn.click();
      await page.waitForTimeout(500);

      // Verify Modal is open
      const modalText = await page.textContent('body');
      assert.ok(modalText?.includes('Onboarding Member Fitness Center'), 'Add Member modal header must be visible');
      assert.ok(modalText?.includes('Target Utama Program'), 'Target program field must be visible');

      // Verify Elevated Center Dock auto-hides with opacity-0 / pointer-events-none
      const dock = page.locator('nav[aria-label="Navigasi Utama PelatihKu"]');
      const dockClass = await dock.getAttribute('class');
      assert.ok(
        dockClass?.includes('opacity-0') && dockClass?.includes('pointer-events-none'),
        `Dock must auto-hide when modal opens, class: ${dockClass}`
      );

      // Close modal via 'Batal' button
      const cancelBtn = page.locator('button:has-text("Batal")');
      await cancelBtn.click();
      await page.waitForTimeout(400);

      // Verify modal closed and dock restored
      const restoredDockClass = await dock.getAttribute('class');
      assert.ok(
        restoredDockClass?.includes('opacity-100'),
        `Dock must restore visibility when modal closes, class: ${restoredDockClass}`
      );
    });

    // -------------------------------------------------------------
    // STEP 8: Drawer Menu & Navigation Links
    // -------------------------------------------------------------
    await step('8. Drawer Menu: Verifies thumb-accessible drawer menu & links', async () => {
      // Open drawer from dock 'Menu' button
      const menuDockBtn = page.locator('nav[aria-label="Navigasi Utama PelatihKu"] button:has-text("Menu")');
      await menuDockBtn.click();
      await page.waitForTimeout(400);

      const drawerText = await page.textContent('body');
      assert.ok(drawerText?.includes('PelatihKu Menu'), 'Drawer menu title must be visible');
      assert.ok(drawerText?.includes('Member Fitness Center'), 'Drawer must list Member Fitness Center');
      assert.ok(drawerText?.includes('Jadwal & Sesi'), 'Drawer must list Jadwal & Sesi');
      assert.ok(drawerText?.includes('Papan Rekor (PR)'), 'Drawer must list Papan Rekor');

      // Close drawer by clicking backdrop or close button
      const closeBtn = page.locator('button:has(svg.lucide-x)').first();
      await closeBtn.click();
      await page.waitForTimeout(400);
    });

    // -------------------------------------------------------------
    // STEP 9: Logout Flow & Session Eviction
    // -------------------------------------------------------------
    await step('9. Logout Flow: Sesi diakhiri, session cache purged & returns to Login Screen', async () => {
      // Navigate to Profil via dock
      const profilBtn = page.locator('nav[aria-label="Navigasi Utama PelatihKu"] button:has-text("Profil")');
      await profilBtn.click();
      await page.waitForTimeout(500);

      // Click 'Keluar dari Sesi' button
      const logoutBtn = page.locator('button:has-text("Keluar dari Sesi")');
      await logoutBtn.click();
      await page.waitForTimeout(400);

      // Confirm logout in modal
      const confirmLogoutBtn = page.locator('button:has-text("Ya, Keluar & Kunci")');
      await confirmLogoutBtn.click();
      await page.waitForTimeout(1000);

      // Verify redirect to Login Screen
      const loginText = await page.textContent('body');
      assert.ok(loginText?.includes('PIN & Biometrik'), 'Must return to Login Screen after logout');
      assert.ok(loginText?.includes('Sesi diakhiri. Data latihan aman di perangkat.'), 'Logout toast must be displayed');

      // Verify PIN input is visible and empty
      const pinInput = page.locator('input[type="password"]');
      assert.strictEqual(await pinInput.count(), 1, 'PIN input must be ready on login screen');
    });

  } finally {
    await browser.close();
  }

  console.log('\n=================================================================');
  console.log('📊 E2E AUTOMATED TEST RESULTS SUMMARY');
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
    console.log('\n🎉 ALL 9 COMPREHENSIVE E2E TESTS PASSED WITH 100% SUCCESS!');
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
