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

console.log('Step 2: Load dashboard and wait for data...');
await page.goto('http://localhost:5173/dashboard');
await page.waitForTimeout(5000);

// Wait for chart to appear
await page.waitForSelector('canvas', { timeout: 10000 }).catch(() => {});
await page.screenshot({ fullPage: true, path: 'screenshots/PROD-01-dashboard.png' });
console.log('✓ Dashboard captured');

console.log('Step 3: Customers - click and wait for data load...');
await page.getByText('Клиенты', { exact: true }).click();

// Wait longer for data to load from API
await page.waitForTimeout(6000);

// Try to find any customer data in the page
const customersText = await page.locator('body').textContent();
const hasCustomerData = customersText.includes('Петров') || customersText.includes('Иван') || customersText.includes('79');
console.log(`  Has customer data in page: ${hasCustomerData}`);

await page.screenshot({ fullPage: true, path: 'screenshots/PROD-02-customers.png' });
console.log('✓ Customers captured');

console.log('Step 4: Products...');
await page.getByText('Товары', { exact: true }).click();
await page.waitForTimeout(6000);

const productsText = await page.locator('body').textContent();
const hasProductData = productsText.includes('Эспрессо') || productsText.includes('Капучино');
console.log(`  Has product data in page: ${hasProductData}`);

await page.screenshot({ fullPage: true, path: 'screenshots/PROD-03-products.png' });
console.log('✓ Products captured');

console.log('Step 5: Sales...');
await page.getByText('Продажи', { exact: true }).click();
await page.waitForTimeout(6000);
await page.screenshot({ fullPage: true, path: 'screenshots/PROD-04-sales.png' });
console.log('✓ Sales captured');

console.log('Step 6: Analytics...');
await page.getByText('Аналитика', { exact: true }).click().catch(() => {
  // Try Analytics in English or click Главная
  return page.getByText('Главная', { exact: true }).click();
});
await page.waitForTimeout(6000);
await page.screenshot({ fullPage: true, path: 'screenshots/PROD-05-analytics.png' });
console.log('✓ Analytics captured');

console.log('Step 7: Integrations...');
await page.getByText('Интеграции', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/PROD-06-integrations.png' });
console.log('✓ Integrations captured');

console.log('Step 8: Settings...');
await page.getByText('Настройки', { exact: true }).click();
await page.waitForTimeout(5000);
await page.screenshot({ fullPage: true, path: 'screenshots/PROD-07-settings.png' });
console.log('✓ Settings captured');

await browser.close();
console.log('\n✅ All PRODUCTION screenshots captured!');
