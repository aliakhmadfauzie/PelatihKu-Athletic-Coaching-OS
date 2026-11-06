import { chromium } from 'playwright';

async function run() {
  console.log('Launching Playwright with msedge channel...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  console.log('Chromium launched successfully!');
  const page = await browser.newPage();
  await page.goto('https://pelatihku-pro.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const title = await page.title();
  console.log('Page Title:', title);
  await browser.close();
  console.log('Browser closed cleanly.');
}

run().catch((err) => {
  console.error('Playwright launch error:', err);
  process.exit(1);
});
