import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 }
});
const page = await context.newPage();

console.log('Navigating to app...');
await page.goto('http://localhost:8000/admin/', { timeout: 60000 });

// Wait and take a debug screenshot
await page.waitForTimeout(5000);

console.log('Taking debug screenshot...');
await page.screenshot({ fullPage: true, path: 'screenshots/DEBUG-app-state.png' });

// Get page HTML
const html = await page.content();
console.log('Page HTML length:', html.length);
console.log('HTML snippet (first 2000 chars):');
console.log(html.substring(0, 2000));

// Check for inputs
const inputs = await page.locator('input').count();
console.log(`\nFound ${inputs} input elements`);

// Check for buttons
const buttons = await page.locator('button').count();
console.log(`Found ${buttons} button elements`);

// List all button texts
const buttonTexts = await page.locator('button').allTextContents();
console.log('Button texts:', buttonTexts);

await browser.close();
