import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

console.log('Step 1: Login via API...');

// Login
const loginResponse = await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: { username: 'admin', password: 'admin' }
});

console.log('Login status:', loginResponse.status());

// Get cookies from response
const cookies = await context.cookies();
console.log('\nCookies after login:');
cookies.forEach(c => {
  console.log(`  ${c.name}: ${c.value.substring(0, 20)}... (httpOnly: ${c.httpOnly}, sameSite: ${c.sameSite})`);
});

// Check if access_token cookie exists
const accessTokenCookie = cookies.find(c => c.name === 'access_token');
if (!accessTokenCookie) {
  console.error('❌ No access_token cookie found!');
}

console.log('\nStep 2: Testing API call with cookies...');

// Navigate to app
await page.goto('http://localhost:5173/', { timeout: 60000 });

// Listen to network requests
page.on('request', request => {
  if (request.url().includes('api')) {
    const headers = request.headers();
    console.log(`\nRequest: ${request.method()} ${request.url()}`);
    console.log(`  Has cookie header: ${!!headers['cookie']}`);
    if (headers['cookie']) {
      console.log(`  Cookie: ${headers['cookie'].substring(0, 100)}...`);
    }
  }
});

page.on('response', response => {
  if (response.url().includes('api')) {
    console.log(`Response: ${response.status()} ${response.url()}`);
  }
});

// Wait and click on Customers
await page.waitForTimeout(3000);
console.log('\nStep 3: Clicking on Клиенты...');
await page.getByText('Клиенты').click();
await page.waitForTimeout(5000);

// Get final cookies
const finalCookies = await context.cookies();
console.log('\nFinal cookies:');
finalCookies.forEach(c => {
  console.log(`  ${c.name}: domain=${c.domain}, path=${c.path}`);
});

await browser.close();
