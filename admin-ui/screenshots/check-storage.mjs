import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Navigating to app...');
await page.goto('http://localhost:5173/', { timeout: 60000 });
await page.waitForTimeout(5000);

// Check localStorage and sessionStorage
const localStorage = await page.evaluate(() => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  return data;
});

const sessionStorage = await page.evaluate(() => {
  const data = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    data[key] = sessionStorage.getItem(key);
  }
  return data;
});

console.log('localStorage:', localStorage);
console.log('sessionStorage:', sessionStorage);

// Get cookies
const cookies = await context.cookies();
console.log('Cookies:', cookies);

// Check current URL
console.log('URL:', page.url());

// Get page HTML
const html = await page.content();
console.log('\nContains "login":', html.toLowerCase().includes('login'));
console.log('Contains "auth":', html.toLowerCase().includes('auth'));
console.log('Contains "войти":', html.includes('войти'));

await page.screenshot({ path: 'screenshots/check-storage.png' });

await browser.close();
