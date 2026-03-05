import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Step 1: Logging in via API...');

// Login via API (this sets httpOnly cookies automatically)
const loginResponse = await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: {
    username: 'admin',
    password: 'admin',
  },
});

if (!loginResponse.ok()) {
  console.error('Login failed:', await loginResponse.text());
  process.exit(1);
}

console.log('✓ Login successful');

// Set language preference
await page.addInitScript(() => {
  window.localStorage.setItem('language', 'ru');
});

console.log('Step 2: Capturing authenticated pages...');

// Capture function
async function capturePage(url, name) {
  console.log(`\nCapturing ${name}...`);
  await page.goto(url, { timeout: 60000 });
  
  // Wait for network idle
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  
  // Additional wait for data
  await page.waitForTimeout(4000);
  
  await page.screenshot({ fullPage: true, path: `screenshots/DATA-${name}.png` });
  
  // Check if data loaded
  const text = await page.locator('body').textContent();
  const hasData = text.includes('₽') || text.includes('Эспрессо') || text.includes('Петров') || text.includes('0') || text.includes('1') || text.includes('2');
  console.log(`  ✓ Saved: DATA-${name}.png (has data: ${hasData})`);
}

// Capture all pages
await capturePage('http://localhost:5173/dashboard', '01-dashboard');
await capturePage('http://localhost:5173/customers', '02-customers');
await capturePage('http://localhost:5173/products', '03-products');
await capturePage('http://localhost:5173/analytics', '04-analytics');
await capturePage('http://localhost:5173/loyalty', '05-loyalty');
await capturePage('http://localhost:5173/integrations', '06-integrations');
await capturePage('http://localhost:5173/settings', '07-settings');

await browser.close();
console.log('\n✅ All screenshots captured with authentication!');
