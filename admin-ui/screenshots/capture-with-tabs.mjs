import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

console.log('Step 1: Login via API...');
const loginResponse = await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: { username: 'admin', password: 'admin' }
});

if (!loginResponse.ok()) {
  console.error('Login failed:', await loginResponse.text());
  process.exit(1);
}
console.log('✓ Login successful');
await page.waitForTimeout(1000);

console.log('Step 2: Navigate to dashboard...');
await page.goto('http://localhost:5173/dashboard');
await page.waitForTimeout(3000);

// Helper function to click nav and wait for data
async function capturePage(tabText, fileName, waitForSelector = null) {
  console.log(`Capturing ${tabText}...`);

  // Click the navigation tab
  const tab = page.getByText(tabText, { exact: true });
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();

  // Wait for page to load
  await page.waitForTimeout(4000);

  // Optionally wait for specific data element
  if (waitForSelector) {
    try {
      await page.waitForSelector(waitForSelector, { timeout: 5000 });
      console.log(`  ✓ Data loaded: ${waitForSelector}`);
    } catch (e) {
      console.log(`  ⚠ Data not found: ${waitForSelector}`);
    }
  }

  // Take screenshot
  await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });
  console.log(`  ✓ Screenshot saved: ${fileName}`);
}

// Capture each page
await capturePage('Главная', 'DATA-01-dashboard.png');
await capturePage('Клиенты', 'DATA-02-customers.png', 'table tbody tr, .customer-row, [data-customer]');
await capturePage('Товары', 'DATA-03-products.png', 'table tbody tr, .product-row, [data-product]');
await capturePage('Продажи', 'DATA-04-sales.png', 'table tbody tr, .sale-row, [data-sale]');
await capturePage('Аналитика', 'DATA-05-analytics.png');
await capturePage('Интеграции', 'DATA-06-integrations.png');
await capturePage('Настройки', 'DATA-07-settings.png');

await browser.close();
console.log('\n✅ All screenshots captured!');
