import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Navigating to login...');
await page.goto('http://localhost:5173/', { timeout: 60000 });

// Wait for React to render
console.log('Waiting for page to load...');
await page.waitForTimeout(5000);

// Take debug screenshot
await page.screenshot({ path: 'screenshots/debug-login.png' });
console.log('Debug screenshot saved');

// Find and fill login form
const usernameInput = await page.locator('input').first();
const passwordInput = await page.locator('input[type="password"]').first();
const submitButton = await page.locator('button').first();

if (await usernameInput.isVisible()) {
  await usernameInput.fill('admin');
  await passwordInput.fill('admin');
  await submitButton.click();
  console.log('Login submitted');
} else {
  console.log('Login form not found');
}

// Wait for navigation
await page.waitForTimeout(5000);

// Capture all pages
const pages = [
  { url: '/dashboard', name: '01-dashboard-real' },
  { url: '/customers', name: '02-customers-real' },
  { url: '/products', name: '03-products-real' },
  { url: '/analytics', name: '04-analytics-real' },
  { url: '/loyalty', name: '05-loyalty-real' },
  { url: '/integrations', name: '06-integrations-real' },
  { url: '/settings', name: '07-settings-real' }
];

for (const p of pages) {
  try {
    await page.goto(`http://localhost:5173${p.url}`, { timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ fullPage: true, path: `screenshots/${p.name}.png` });
    console.log(`Captured: ${p.name}`);
  } catch (e) {
    console.log(`Failed ${p.name}: ${e.message}`);
  }
}

await browser.close();
console.log('Done!');
