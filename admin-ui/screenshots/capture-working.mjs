import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

console.log('Step 1: Login via API to set cookies for port 8000...');

// Login via API - this sets cookies for localhost:8000
const loginResponse = await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: { username: 'admin', password: 'admin' }
});

if (!loginResponse.ok()) {
  console.error('Login failed:', await loginResponse.text());
  process.exit(1);
}

console.log('✓ API Login successful');

// Check cookies
const cookies = await context.cookies();
console.log('Cookies set:', cookies.map(c => `${c.name} (${c.domain})`).join(', '));

console.log('\nStep 2: Navigate to production app on port 8000...');
await page.goto('http://localhost:8000/admin/', { timeout: 60000 });

// Wait for app to load
console.log('Step 3: Waiting for app to load...');
await page.waitForTimeout(5000);

// Check current URL
console.log(`Current URL: ${page.url()}`);

// Check if we're on dashboard
const pageTitle = await page.title();
console.log(`Page title: ${pageTitle}`);

// Take first screenshot
console.log('Step 4: Taking dashboard screenshot...');
await page.screenshot({ fullPage: true, path: 'screenshots/WORKING-01-dashboard.png' });
console.log('✓ Dashboard captured');

// Helper to capture pages
async function capturePage(tabText, fileName) {
  console.log(`\nCapturing ${tabText}...`);

  try {
    const tab = page.getByText(tabText, { exact: true });
    await tab.waitFor({ state: 'visible', timeout: 10000 });
    await tab.click();
    await page.waitForTimeout(4000);

    // Refresh for data pages
    if (['Клиенты', 'Товары'].includes(tabText)) {
      try {
        const refreshBtn = page.getByText('Обновить', { exact: true });
        if (await refreshBtn.count() > 0) {
          await refreshBtn.first().click();
          await page.waitForTimeout(4000);
        }
      } catch (e) {}
    }

    // Search for customers
    if (tabText === 'Клиенты') {
      try {
        const searchBtn = page.getByText('Поиск', { exact: true });
        if (await searchBtn.count() > 0) {
          await searchBtn.click();
          await page.waitForTimeout(4000);
        }
      } catch (e) {}
    }

    await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });

    // Check for data
    const hasData = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Петров') || text.includes('Иванов') || text.includes('Сидоров') ||
             text.includes('Эспрессо') || text.includes('Капучино') || text.includes('Латте');
    });
    console.log(`  ✓ ${fileName} (has data: ${hasData})`);
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
}

// Capture all pages
await capturePage('Клиенты', 'WORKING-02-customers.png');
await capturePage('Товары', 'WORKING-03-products.png');
await capturePage('Продажи', 'WORKING-04-sales.png');
await capturePage('Маркетинг', 'WORKING-05-marketing.png');
await capturePage('Интеграции', 'WORKING-06-integrations.png');
await capturePage('Настройки', 'WORKING-07-settings.png');
await capturePage('Комплаенс', 'WORKING-08-compliance.png');

await browser.close();
console.log('\n✅ All screenshots captured!');
