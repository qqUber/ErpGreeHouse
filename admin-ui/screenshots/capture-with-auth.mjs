import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Navigating to app...');
await page.goto('http://localhost:5173/', { timeout: 60000 });
await page.waitForTimeout(3000);

// Debug: save initial state
await page.screenshot({ path: 'screenshots/debug-01-initial.png' });

// Try to find login form with multiple selectors
console.log('Looking for login form...');
const usernameSelectors = [
  'input[type="text"]',
  'input[name="username"]',
  'input[placeholder*="login" i]',
  'input' // fallback
];

let usernameField = null;
for (const selector of usernameSelectors) {
  try {
    usernameField = await page.locator(selector).first();
    if (await usernameField.isVisible({ timeout: 1000 })) {
      console.log(`Found username field: ${selector}`);
      break;
    }
  } catch (e) {
    continue;
  }
}

if (usernameField) {
  // Find password field
  const passwordField = await page.locator('input[type="password"]').first();
  const submitButton = await page.locator('button').first();
  
  await usernameField.fill('admin');
  await passwordField.fill('admin');
  await submitButton.click();
  
  console.log('Login submitted, waiting...');
  await page.waitForTimeout(5000);
  
  // Save post-login state
  await page.screenshot({ path: 'screenshots/debug-02-after-login.png' });
} else {
  console.log('No login form found');
}

// Capture all pages with data
const pages = [
  { url: '/dashboard', name: '01-dashboard', waitForData: true },
  { url: '/customers', name: '02-customers', waitForData: true },
  { url: '/products', name: '03-products', waitForData: true },
  { url: '/analytics', name: '04-analytics', waitForData: true },
  { url: '/loyalty', name: '05-loyalty', waitForData: true },
  { url: '/integrations', name: '06-integrations', waitForData: true },
  { url: '/settings', name: '07-settings', waitForData: true }
];

for (const p of pages) {
  try {
    await page.goto(`http://localhost:5173${p.url}`, { timeout: 30000 });
    
    // Wait for data to load
    if (p.waitForData) {
      await page.waitForTimeout(4000);
    }
    
    await page.screenshot({ fullPage: true, path: `screenshots/${p.name}-data.png` });
    console.log(`✓ Captured: ${p.name}`);
  } catch (e) {
    console.log(`✗ Failed ${p.name}: ${e.message}`);
  }
}

await browser.close();
console.log('Done!');
