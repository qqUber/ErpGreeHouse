import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

console.log('Step 1: Login via API (proper cookie handling)...');

// Use Playwright's request API which properly handles cookies
const loginResponse = await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: {
    username: 'admin',
    password: 'admin'
  }
});

if (!loginResponse.ok()) {
  console.error('Login failed:', await loginResponse.text());
  process.exit(1);
}

console.log('✓ Login successful, cookies should be set');

// Give cookies time to be processed
await page.waitForTimeout(1000);

console.log('Step 2: Navigate to dashboard and capture...');
await page.goto('http://localhost:5173/dashboard');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/REAL-01-dashboard.png' });
console.log('✓ Dashboard captured');

console.log('Step 3: Navigate to customers...');
await page.goto('http://localhost:5173/customers');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/REAL-02-customers.png' });
console.log('✓ Customers captured');

console.log('Step 4: Navigate to products...');
await page.goto('http://localhost:5173/products');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/REAL-03-products.png' });
console.log('✓ Products captured');

console.log('Step 5: Navigate to sales...');
await page.goto('http://localhost:5173/sales');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/REAL-04-sales.png' });
console.log('✓ Sales captured');

console.log('Step 6: Navigate to analytics...');
await page.goto('http://localhost:5173/analytics');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/REAL-05-analytics.png' });
console.log('✓ Analytics captured');

console.log('Step 7: Navigate to integrations...');
await page.goto('http://localhost:5173/integrations');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/REAL-06-integrations.png' });
console.log('✓ Integrations captured');

console.log('Step 8: Navigate to settings...');
await page.goto('http://localhost:5173/settings');
await page.waitForTimeout(4000);
await page.screenshot({ fullPage: true, path: 'screenshots/REAL-07-settings.png' });
console.log('✓ Settings captured');

await browser.close();
console.log('\n✅ All screenshots captured with proper authentication!');
console.log('Check screenshots/REAL-*.png files');
