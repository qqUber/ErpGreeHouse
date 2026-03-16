import { login, test } from '../_shared';

test('debug: check what page shows after login', async ({ page }) => {
  await login(page, 'operator');

  // Just take a screenshot to see what's there
  await page.screenshot({ fullPage: true, path: 'screenshots/debug-login.png' });

  // Log the URL
  console.log('Current URL:', page.url());

  // Log page title
  console.log('Page title:', await page.title());

  // Get body text
  const bodyText = await page.locator('body').innerText();
  console.log('Body text preview:', bodyText.substring(0, 500));
});
