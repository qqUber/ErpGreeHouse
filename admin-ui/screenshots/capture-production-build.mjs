import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

// Enable console logging
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('Auth') || text.includes('authenticated') || text.includes('Login') || text.includes('error')) {
    console.log(`[Console] ${text.substring(0, 120)}`);
  }
});

console.log('Step 1: Navigate to production app on port 8000...');
await page.goto('http://localhost:8000/admin/', { timeout: 60000 });
console.log('Page loaded');

// Wait for login form
console.log('Step 2: Waiting for login form...');
await page.waitForSelector('input[placeholder="Логин"]', { timeout: 30000 });
console.log('Form found');

// Fill credentials
console.log('Step 3: Filling credentials...');
await page.fill('input[placeholder="Логин"]', 'admin');
await page.fill('input[placeholder="Пароль"]', 'admin');

// Click login
console.log('Step 4: Clicking login...');
await page.click('button:has-text("Войти")');

// Wait for dashboard
console.log('Step 5: Waiting for dashboard...');
try {
  await page.waitForSelector('text=Панель управления', { timeout: 30000 });
  console.log('✓ Successfully logged in!');
} catch (e) {
  console.log('⚠ Dashboard not detected, checking...');
  const url = page.url();
  console.log(`Current URL: ${url}`);
}

await page.waitForTimeout(3000);

// Helper to capture page
async function capturePage(tabText, fileName) {
  console.log(`\nCapturing ${tabText}...`);

  const tab = page.getByText(tabText, { exact: true });
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(3000);

  // Click refresh if present
  try {
    const refreshBtn = page.getByText('Обновить', { exact: true });
    if (await refreshBtn.count() > 0) {
      await refreshBtn.first().click();
      await page.waitForTimeout(3000);
    }
  } catch (e) {}

  // For customers, try search
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
}

// Capture all pages
await capturePage('Главная', 'FINAL-01-dashboard.png');
await capturePage('Клиенты', 'FINAL-02-customers.png');
await capturePage('Товары', 'FINAL-03-products.png');
await capturePage('Продажи', 'FINAL-04-sales.png');
await capturePage('Маркетинг', 'FINAL-05-marketing.png');
await capturePage('Интеграции', 'FINAL-06-integrations.png');
await capturePage('Настройки', 'FINAL-07-settings.png');
await capturePage('Комплаенс', 'FINAL-08-compliance.png');

await browser.close();
console.log('\n✅ All screenshots captured from production build!');
