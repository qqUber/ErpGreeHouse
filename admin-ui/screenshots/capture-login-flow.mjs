import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Step 1: Navigate to login page...');
await page.goto('http://localhost:5173/', { timeout: 60000 });
await page.waitForTimeout(3000);

console.log('Step 2: Taking screenshot of initial state...');
await page.screenshot({ path: 'screenshots/STEP-01-login-page.png' });

console.log('Step 3: Filling login form...');

// Find all inputs
const inputs = await page.locator('input').all();
console.log(`Found ${inputs.length} input(s)`);

// Try to find username/password inputs by placeholder or type
const allInputs = await page.locator('input').all();
for (let i = 0; i < allInputs.length; i++) {
  const placeholder = await allInputs[i].getAttribute('placeholder').catch(() => '');
  const type = await allInputs[i].getAttribute('type');
  console.log(`  Input ${i}: type=${type}, placeholder=${placeholder}`);
}

// Fill the form - try multiple selectors
console.log('Filling username...');
await page.locator('input').first().fill('admin');

console.log('Filling password...');
const passwordInput = page.locator('input[type="password"]').first();
await passwordInput.fill('admin');

console.log('Clicking submit...');
await page.locator('button').first().click();

console.log('Step 4: Waiting for navigation...');
await page.waitForTimeout(5000);

console.log('Step 5: Taking screenshot after login...');
await page.screenshot({ path: 'screenshots/STEP-02-after-login.png' });

// Check current URL
const url = page.url();
console.log(`Current URL: ${url}`);

// Check if logged in
const bodyText = await page.locator('body').textContent();
console.log('Contains "Выйти":', bodyText.includes('Выйти'));
console.log('Contains "admin":', bodyText.includes('admin'));

console.log('Step 6: Capturing all pages...');

const pages = [
  { url: '/dashboard', name: '03-dashboard' },
  { url: '/customers', name: '04-customers' },
  { url: '/products', name: '05-products' },
  { url: '/analytics', name: '06-analytics' },
  { url: '/loyalty', name: '07-loyalty' },
  { url: '/integrations', name: '08-integrations' },
  { url: '/settings', name: '09-settings' }
];

for (const p of pages) {
  console.log(`\nCapturing ${p.name}...`);
  await page.goto(`http://localhost:5173${p.url}`, { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ fullPage: true, path: `screenshots/STEP-${p.name}.png` });
  console.log(`✓ Saved`);
}

await browser.close();
console.log('\n✅ All screenshots captured!');
