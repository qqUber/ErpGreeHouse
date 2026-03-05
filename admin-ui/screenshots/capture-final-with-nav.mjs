import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Step 1: Logging in via API...');

// Login via API
const loginResponse = await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: { username: 'admin', password: 'admin' },
});

if (!loginResponse.ok()) {
  console.error('Login failed:', await loginResponse.text());
  process.exit(1);
}

console.log('✓ Login successful');

// Set language
await page.addInitScript(() => {
  window.localStorage.setItem('language', 'ru');
});

console.log('Step 2: Capturing pages with navigation...');

// Navigate to dashboard first
await page.goto('http://localhost:5173/dashboard', { timeout: 60000 });
await page.waitForTimeout(3000);
await page.screenshot({ fullPage: true, path: 'screenshots/DASHBOARD-01-dashboard.png' });
console.log('✓ Dashboard captured');

// Function to navigate via tab click
async function captureViaTab(tabName, fileName) {
  console.log(`\nCapturing ${fileName}...`);
  
  // Click on the tab
  await page.getByText(tabName, { exact: false }).first().click();
  
  // Wait for navigation and data load
  await page.waitForTimeout(4000);
  
  await page.screenshot({ fullPage: true, path: `screenshots/DASHBOARD-${fileName}.png` });
  console.log(`  ✓ Saved: DASHBOARD-${fileName}.png`);
}

// Capture each page by clicking tabs
await captureViaTab('Клиенты', '02-customers');
await captureViaTab('Товары', '03-products');
await captureViaTab('Продажи', '04-sales');
await captureViaTab('Интеграции', '05-integrations');
await captureViaTab('Настройки', '06-settings');
await captureViaTab('Маркетинг', '07-marketing');

await browser.close();
console.log('\n✅ All screenshots captured!');
