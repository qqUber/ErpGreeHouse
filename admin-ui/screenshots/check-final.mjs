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

// Navigate to products
console.log('Navigating to products...');
await page.goto('http://localhost:5173/products', { timeout: 60000 });
await page.waitForTimeout(5000);

// Get page content
const html = await page.content();
console.log('\nPage HTML contains:');
console.log('- "Товары":', html.includes('Товары'));
console.log('- "Эспрессо":', html.includes('Эспрессо'));
console.log('- "Капучино":', html.includes('Капучино'));
console.log('- "table":', html.includes('table'));
console.log('- "tr":', html.includes('<tr'));

const text = await page.locator('body').textContent();
console.log('\nBody text contains:');
console.log('- "Продаж":', text.includes('Продаж'));
console.log('- "Клиент":', text.includes('Клиент'));
console.log('- "товар":', text.toLowerCase().includes('товар'));
console.log('- "Настройки":', text.includes('Настройки'));

await page.screenshot({ fullPage: true, path: 'screenshots/verify-products.png' });
console.log('\nScreenshot saved: verify-products.png');

await browser.close();
