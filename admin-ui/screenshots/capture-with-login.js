const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Login
  console.log('Logging in...');
  await page.goto('http://localhost:5173/');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Logged in');
  
  // Wait for data to load
  await page.waitForTimeout(2000);
  
  // Capture pages
  const pages = [
    { url: '/dashboard', name: 'dashboard' },
    { url: '/customers', name: 'customers' },
    { url: '/products', name: 'products' },
    { url: '/analytics', name: 'analytics' },
    { url: '/loyalty', name: 'loyalty' },
    { url: '/integrations', name: 'integrations' },
    { url: '/settings', name: 'settings' }
  ];
  
  for (const p of pages) {
    await page.goto(`http://localhost:5173${p.url}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ fullPage: true, path: `screenshots/${p.name}-logged-in.png` });
    console.log(`Captured: ${p.name}`);
  }
  
  await browser.close();
  console.log('Done!');
})();
