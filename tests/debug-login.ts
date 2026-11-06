import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('https://pelatihku-pro.web.app', { waitUntil: 'domcontentloaded' });
  
  console.log('Filling wrong PIN...');
  await page.locator('#coach-pin').fill('000000');
  await page.waitForTimeout(500);
  console.log('Error text:', await page.locator('text=PIN salah!').textContent());

  console.log('Filling correct PIN...');
  await page.locator('#coach-pin').fill('');
  await page.locator('#coach-pin').fill('123456');
  await page.waitForTimeout(1500);

  const bodyText = await page.textContent('body');
  console.log('Body includes Coach Panji:', bodyText?.includes('Coach Panji'));
  console.log('Body includes Coach Panji Akbar Syamsi:', bodyText?.includes('Coach Panji Akbar Syamsi'));
  console.log('Body includes Panji:', bodyText?.includes('Panji'));
  console.log('Body snippet (first 500 chars):', bodyText?.slice(0, 500));

  await browser.close();
}

main().catch(console.error);
