import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Capture function with better waiting
async function capturePage(url, name) {
  console.log(`Capturing ${name}...`);
  await page.goto(url, { timeout: 60000 });
  
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  
  // Additional wait for React to render data
  await page.waitForTimeout(5000);
  
  await page.screenshot({ fullPage: true, path: `screenshots/${name}.png` });
  console.log(`✓ Saved: ${name}`);
}

// Capture all pages
await capturePage('http://localhost:5173/', '01-home');
await capturePage('http://localhost:5173/dashboard', '02-dashboard');
await capturePage('http://localhost:5173/customers', '03-customers');
await capturePage('http://localhost:5173/products', '04-products');
await capturePage('http://localhost:5173/analytics', '05-analytics');
await capturePage('http://localhost:5173/loyalty', '06-loyalty');
await capturePage('http://localhost:5173/integrations', '07-integrations');
await capturePage('http://localhost:5173/settings', '08-settings');

await browser.close();
console.log('All screenshots captured!');
