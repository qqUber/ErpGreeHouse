import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Using built app at localhost:8000/admin/');

console.log('Step 1: Navigate to admin...');
await page.goto('http://localhost:8000/admin/', { timeout: 60000 });
await page.waitForTimeout(3000);

console.log('Step 2: Login...');
// Find and fill login form
await page.locator('input').first().fill('admin');
await page.locator('input[type="password"]').fill('admin');
await page.locator('button').click();

await page.waitForTimeout(5000);

console.log('Step 3: Capture dashboard...');
await page.screenshot({ fullPage: true, path: 'screenshots/BUILT-01-dashboard.png' });

console.log('Step 4: Navigate and capture all pages...');

const pages = [
  { tab: 'Клиенты', name: '02-customers' },
  { tab: 'Товары', name: '03-products' },
  { tab: 'Продажи', name: '04-sales' },
  { tab: 'Интеграции', name: '05-integrations' },
  { tab: 'Настройки', name: '06-settings' },
];

for (const p of pages) {
  console.log(`\nCapturing ${p.name}...`);
  await page.getByText(p.tab, { exact: true }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({ fullPage: true, path: `screenshots/BUILT-${p.name}.png` });
  
  // Check for data
  const text = await page.locator('body').textContent();
  const hasData = text.includes('Петров') || text.includes('Эспрессо') || text.includes('₽');
  console.log(`  Has data: ${hasData}`);
}

await browser.close();
console.log('\n✅ Built app screenshots captured!');
