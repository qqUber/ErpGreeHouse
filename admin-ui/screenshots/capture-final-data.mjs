import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Step 1: Navigate and login...');
await page.goto('http://localhost:5173/', { timeout: 60000 });
await page.waitForTimeout(2000);

// Login from page context
await page.evaluate(async () => {
  await fetch('http://localhost:8000/api/v1/public/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
    credentials: 'include'
  });
});

await page.waitForTimeout(2000);

console.log('Step 2: Capture dashboard...');
await page.goto('http://localhost:5173/dashboard');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/FINAL-01-dashboard.png' });

console.log('Step 3: Capture customers via tab click...');
// Click on Customers tab
await page.getByText('Клиенты', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/FINAL-02-customers.png' });

console.log('Step 4: Capture products...');
await page.getByText('Товары', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/FINAL-03-products.png' });

console.log('Step 5: Capture sales...');
await page.getByText('Продажи', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/FINAL-04-sales.png' });

console.log('Step 6: Capture analytics...');
await page.getByText('Главная', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/FINAL-05-analytics.png' });

console.log('Step 7: Capture integrations...');
await page.getByText('Интеграции', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/FINAL-06-integrations.png' });

console.log('Step 8: Capture settings...');
await page.getByText('Настройки', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/FINAL-07-settings.png' });

await browser.close();
console.log('\nAll screenshots captured!');
