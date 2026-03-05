import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

// Enable console logging for debugging
page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
page.on('pageerror', err => console.log(`[Page Error] ${err.message}`));

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

// Helper function to click nav, refresh data, and capture
async function capturePage(tabText, fileName) {
  console.log(`\nCapturing ${tabText}...`);

  // Click the navigation tab
  const tab = page.getByText(tabText, { exact: true });
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(3000);

  // Try to click "Обновить" (Refresh) button if present to load data
  try {
    const refreshBtn = page.getByText('Обновить', { exact: true });
    if (await refreshBtn.count() > 0) {
      await refreshBtn.click();
      console.log('  Clicked Обновить button');
      await page.waitForTimeout(3000);
    }
  } catch (e) {
    // No refresh button
  }

  // For customers page, try searching to trigger data load
  if (tabText === 'Клиенты') {
    try {
      // Click search without entering anything to get all customers
      const searchBtn = page.getByText('Поиск', { exact: true });
      if (await searchBtn.count() > 0) {
        await searchBtn.click();
        console.log('  Clicked Поиск button');
        await page.waitForTimeout(3000);
      }
    } catch (e) {}
  }

  // Take screenshot
  await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });
  console.log(`  ✓ Screenshot: ${fileName}`);
}

// Capture each page - using correct tab names from navigation
await capturePage('Главная', 'PROD-01-dashboard.png');
await capturePage('Клиенты', 'PROD-02-customers.png');
await capturePage('Товары', 'PROD-03-products.png');
await capturePage('Продажи', 'PROD-04-sales.png');
await capturePage('Маркетинг', 'PROD-05-marketing.png');
await capturePage('Интеграции', 'PROD-06-integrations.png');
await capturePage('Настройки', 'PROD-07-settings.png');
await capturePage('Комплаенс', 'PROD-08-compliance.png');

await browser.close();
console.log('\n✅ All screenshots captured!');
