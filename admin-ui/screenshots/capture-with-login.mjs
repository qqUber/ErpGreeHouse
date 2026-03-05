import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

// Enable console logging for auth debugging
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('Auth') || text.includes('authenticated') || text.includes('Login')) {
    console.log(`[Console] ${text.substring(0, 120)}`);
  }
});

console.log('Step 1: Navigating to app...');
await page.goto('http://localhost:5173/', { timeout: 60000 });
console.log('Page loaded');

// Wait for login form to appear (using placeholder text)
console.log('Step 2: Waiting for login form...');
await page.waitForSelector('input[placeholder="Логин"]', { timeout: 30000 });
console.log('Form found');

// Fill in credentials using placeholders
console.log('Step 3: Filling credentials...');
await page.fill('input[placeholder="Логин"]', 'admin');
await page.fill('input[placeholder="Пароль"]', 'admin');

// Click login button (not submit type, it's a button with click handler)
console.log('Step 4: Clicking login...');
await page.click('button:has-text("Войти")');

// Wait for dashboard to appear
console.log('Step 5: Waiting for dashboard...');
try {
  await page.waitForSelector('text=Панель управления', { timeout: 30000 });
  console.log('✓ Successfully logged in!');
} catch (e) {
  console.log('⚠ Timeout waiting for dashboard, checking current state...');
}

// Wait for data to load
await page.waitForTimeout(3000);

// Helper to capture page with refresh
async function capturePage(tabText, fileName) {
  console.log(`\nCapturing ${tabText}...`);

  // Click navigation tab
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

  // For customers, try search to load data
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
await capturePage('Главная', 'DEMO-01-dashboard.png');
await capturePage('Клиенты', 'DEMO-02-customers.png');
await capturePage('Товары', 'DEMO-03-products.png');
await capturePage('Продажи', 'DEMO-04-sales.png');
await capturePage('Маркетинг', 'DEMO-05-marketing.png');
await capturePage('Интеграции', 'DEMO-06-integrations.png');
await capturePage('Настройки', 'DEMO-07-settings.png');
await capturePage('Комплаенс', 'DEMO-08-compliance.png');

await browser.close();
console.log('\n✅ All screenshots captured!');
