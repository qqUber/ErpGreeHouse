import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

// First, check if API is returning data
console.log('Testing API...');
const apiResponse = await page.evaluate(async () => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/public/products?page=1&page_size=5');
    return { status: response.status, text: await response.text() };
  } catch (e) {
    return { error: e.message };
  }
});
console.log('API Response:', apiResponse);

// Now try to navigate to products page
console.log('\nNavigating to products...');
await page.goto('http://localhost:5173/products', { timeout: 60000 });
await page.waitForTimeout(5000);

// Check if products are visible
const productsText = await page.locator('body').textContent();
console.log('\nPage contains "Эспрессо":', productsText.includes('Эспрессо'));
console.log('Page contains "Товар":', productsText.includes('Товар'));
console.log('Page contains "Products":', productsText.includes('Products'));

await page.screenshot({ fullPage: true, path: 'screenshots/test-products-api.png' });
console.log('Screenshot saved');

await browser.close();
