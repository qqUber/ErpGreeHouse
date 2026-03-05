import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

console.log('Step 1: Navigate to production app on port 8000...');
await page.goto('http://localhost:8000/admin/', { timeout: 60000 });

// Wait for app to stabilize
console.log('Step 2: Waiting for app to load...');
await page.waitForTimeout(3000);

console.log('Step 3: Filling login form with React state updates...');

// Use page.fill which properly triggers React events
await page.fill('input[placeholder="Логин"]', 'admin');
await page.waitForTimeout(500);

await page.fill('input[placeholder="Пароль"]', 'admin');
await page.waitForTimeout(500);

console.log('Step 4: Clicking login and waiting for navigation...');

// Click login and wait for navigation
await Promise.all([
  page.waitForNavigation({ timeout: 30000 }),
  page.click('button:has-text("Войти")')
]);

console.log(`Step 5: Navigation complete. Current URL: ${page.url()}`);

// Wait for dashboard to load
await page.waitForTimeout(4000);

// Helper to capture page
async function capturePage(tabText, fileName, extraWait = 0) {
  console.log(`\nCapturing ${tabText}...`);

  try {
    // Click navigation tab
    const tab = page.getByText(tabText, { exact: true });
    await tab.waitFor({ state: 'visible', timeout: 10000 });
    await tab.click();
    await page.waitForTimeout(3000 + extraWait);

    // For customers/products - click refresh to load data
    if (tabText === 'Клиенты' || tabText === 'Товары') {
      try {
        const refreshBtn = page.getByText('Обновить', { exact: true });
        if (await refreshBtn.count() > 0) {
          await refreshBtn.first().click();
          await page.waitForTimeout(4000);
        }
      } catch (e) {}
    }

    // For customers, also trigger search
    if (tabText === 'Клиенты') {
      try {
        const searchBtn = page.getByText('Поиск', { exact: true });
        if (await searchBtn.count() > 0) {
          await searchBtn.click();
          await page.waitForTimeout(3000);
        }
      } catch (e) {}
    }

    await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });
    console.log(`  ✓ Screenshot: ${fileName}`);
  } catch (e) {
    console.log(`  ✗ Failed: ${e.message}`);
    await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });
  }
}

// Capture all pages with extra wait for data loading
await capturePage('Главная', 'SUCCESS-01-dashboard.png', 2000);
await capturePage('Клиенты', 'SUCCESS-02-customers.png', 3000);
await capturePage('Товары', 'SUCCESS-03-products.png', 3000);
await capturePage('Продажи', 'SUCCESS-04-sales.png', 2000);
await capturePage('Маркетинг', 'SUCCESS-05-marketing.png', 2000);
await capturePage('Интеграции', 'SUCCESS-06-integrations.png', 2000);
await capturePage('Настройки', 'SUCCESS-07-settings.png', 2000);
await capturePage('Комплаенс', 'SUCCESS-08-compliance.png', 2000);

await browser.close();
console.log('\n✅ All screenshots captured!');
