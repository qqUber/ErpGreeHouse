import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:5173/', { timeout: 60000 });
await page.waitForTimeout(5000);

// Get page content
const html = await page.content();
console.log('Page HTML (first 3000 chars):');
console.log(html.substring(0, 3000));

// Count inputs
const inputs = await page.locator('input').count();
console.log(`\nNumber of inputs: ${inputs}`);

// Check if logged in
const bodyText = await page.locator('body').textContent();
console.log('\nBody contains "Выйти":', bodyText.includes('Выйти'));
console.log('Body contains "Войти":', bodyText.includes('Войти'));
console.log('Body contains "Login":', bodyText.includes('Login'));

await browser.close();
