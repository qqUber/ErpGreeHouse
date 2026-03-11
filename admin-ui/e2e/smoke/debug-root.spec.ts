import { login, test } from '../_shared';

test('debug: check root path', async ({ page }) => {
  // Don't login yet - just check if the app loads
  await page.goto('/admin/');

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ fullPage: true, path: 'screenshots/debug-root.png' });

  // Log URL and title
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  // Log HTML
  const bodyHtml = await page.locator('body').innerHTML();
  console.log('Body HTML:', bodyHtml.substring(0, 2000));

  // Check if React app rendered anything inside #root
  const rootContent = await page.locator('#root').innerHTML();
  console.log('#root content:', rootContent.substring(0, 500));

  // Log data-testid elements
  const testIdElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-testid]');
    return Array.from(elements).map((el) => ({
      tagName: el.tagName,
      testId: el.getAttribute('data-testid'),
      text: el.textContent?.trim(),
      className: el.className,
    }));
  });
  console.log('Data-testid elements:', testIdElements);

  // Check for any content
  if (!rootContent || rootContent.trim() === '') {
    console.error('#root is empty - React app did not render');
  }

  // Check if there are any errors in console
  page.on('console', (msg) => console.log(`[Browser console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => console.log(`[Page error] ${err}`));

  await page.waitForTimeout(2000);
});
