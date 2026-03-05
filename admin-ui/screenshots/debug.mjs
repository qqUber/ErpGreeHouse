import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

console.log('Navigating...');
await page.goto('http://localhost:5173/', { timeout: 60000 });

console.log('Waiting 5 seconds for page to load...');
await page.waitForTimeout(5000);

console.log('Taking screenshot...');
await page.screenshot({ path: 'screenshots/debug.png' });

console.log('Getting HTML...');
const html = await page.content();
console.log(html.substring(0, 2000));

await browser.close();
