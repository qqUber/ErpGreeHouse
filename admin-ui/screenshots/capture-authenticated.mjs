import { chromium } from '@playwright/test';

console.log('Step 1: Logging in via API...');

// Login via Node.js fetch
const loginResponse = await fetch('http://localhost:8000/api/v1/public/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin' })
});

const loginData = await loginResponse.json();
console.log('Login response:', loginData);

if (!loginData.token) {
  console.error('Login failed!');
  process.exit(1);
}

console.log('Step 2: Launching browser with auth...');

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Set the token as a cookie BEFORE navigating
await context.addCookies([{
  name: 'access_token',
  value: loginData.token,
  domain: 'localhost',
  path: '/',
  httpOnly: false,  // Allow JS to see it for debugging
  secure: false,
  sameSite: 'Lax'
}]);

console.log('Step 3: Verifying auth...');

// Navigate to dashboard first to verify auth works
await page.goto('http://localhost:5173/dashboard', { timeout: 60000 });
await page.waitForTimeout(3000);

// Check if we're logged in
const bodyText = await page.locator('body').textContent();
console.log('Body contains "Выйти":', bodyText.includes('Выйти'));
console.log('Body contains "admin":', bodyText.includes('admin'));

// Save debug screenshot
await page.screenshot({ path: 'screenshots/debug-auth-check.png' });

console.log('Step 4: Capturing all pages...');

// Capture function
async function capturePage(url, name) {
  console.log(`\nCapturing ${name}...`);
  await page.goto(url, { timeout: 60000 });
  
  // Wait for network idle
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  
  // Additional wait for data to load
  await page.waitForTimeout(5000);
  
  await page.screenshot({ fullPage: true, path: `screenshots/FINAL-${name}.png` });
  console.log(`✓ Saved: FINAL-${name}.png`);
  
  // Get page info
  const text = await page.locator('body').textContent();
  const hasData = text.includes('Петров') || text.includes('Эспрессо') || text.includes('₽') || text.includes('Загрузка') === false;
  console.log(`  Has data indicators: ${hasData}`);
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
console.log('\n✅ All screenshots captured!');
