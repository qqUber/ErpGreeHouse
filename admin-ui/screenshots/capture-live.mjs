import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

console.log('Step 1: Navigate to production app...');
await page.goto('http://localhost:8000/admin/', { timeout: 60000 });

// Wait for app to stabilize
console.log('Step 2: Waiting for app to load...');
await page.waitForTimeout(3000);

console.log('Step 3: Filling login form...');

// Use JavaScript to fill the form directly (more reliable with React)
await page.evaluate(() => {
  // Find inputs by placeholder
  const inputs = document.querySelectorAll('input');
  let usernameInput = null;
  let passwordInput = null;

  inputs.forEach(input => {
    const placeholder = input.getAttribute('placeholder');
    if (placeholder === 'Логин') usernameInput = input;
    if (placeholder === 'Пароль') passwordInput = input;
  });

  if (usernameInput) {
    usernameInput.value = 'admin';
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (passwordInput) {
    passwordInput.value = 'admin';
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Click login button
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    if (btn.textContent?.includes('Войти')) {
      btn.click();
    }
  });
});

console.log('Step 4: Waiting for login to complete...');
await page.waitForTimeout(5000);

// Check if we're logged in
const url = page.url();
console.log(`Current URL: ${url}`);

// Helper to capture page
async function capturePage(tabText, fileName) {
  console.log(`\nCapturing ${tabText}...`);

  try {
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
  } catch (e) {
    console.log(`  ✗ Failed: ${e.message}`);
    // Take screenshot anyway
    await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });
  }
}

// Capture all pages
await capturePage('Главная', 'LIVE-01-dashboard.png');
await capturePage('Клиенты', 'LIVE-02-customers.png');
await capturePage('Товары', 'LIVE-03-products.png');
await capturePage('Продажи', 'LIVE-04-sales.png');
await capturePage('Маркетинг', 'LIVE-05-marketing.png');
await capturePage('Интеграции', 'LIVE-06-integrations.png');
await capturePage('Настройки', 'LIVE-07-settings.png');
await capturePage('Комплаенс', 'LIVE-08-compliance.png');

await browser.close();
console.log('\n✅ All screenshots captured!');
