import { chromium } from '@playwright/test';

// Login first
const loginResponse = await fetch('http://localhost:8000/api/v1/public/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin' })
});
const loginData = await loginResponse.json();

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Set auth cookie
await context.addCookies([{
  name: 'access_token',
  value: loginData.token,
  domain: 'localhost',
  path: '/',
  httpOnly: false,
  secure: false,
  sameSite: 'Lax'
}]);

// Listen to network requests
const requests = [];
page.on('request', request => {
  if (request.url().includes('api')) {
    requests.push({ url: request.url(), method: request.method() });
  }
});

page.on('response', response => {
  if (response.url().includes('api')) {
    console.log(`API Response: ${response.status()} ${response.url()}`);
  }
});

// Navigate to products
console.log('Navigating to products...');
await page.goto('http://localhost:5173/products', { timeout: 60000 });
await page.waitForTimeout(5000);

console.log('\nNetwork requests:');
requests.forEach(r => console.log(`  ${r.method} ${r.url}`));

// Check if there's any error in console
const consoleLogs = [];
page.on('console', msg => consoleLogs.push(msg.text()));

await page.screenshot({ fullPage: true, path: 'screenshots/debug-network.png' });

await browser.close();
