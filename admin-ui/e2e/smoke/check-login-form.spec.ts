import { test } from '@playwright/test';

test('check: login form elements', async ({ page }) => {
  await page.goto('/admin/');

  await page.waitForTimeout(2000);

  console.log('Current URL:', page.url());

  // Check if login form elements are present with CSS selectors as fallback
  const usernameInput = page.getByTestId('common_input_username_en');
  try {
    await usernameInput.waitFor({ timeout: 3000 });
    console.log('Username input found with data-testid');
  } catch (error) {
    console.error('Username input not found with data-testid');
    // Fallback to CSS selector
    const cssInput = page.locator('input[type="text"]');
    try {
      await cssInput.waitFor({ timeout: 2000 });
      console.log('Username input found with CSS selector');
    } catch (cssError) {
      console.error('Username input not found at all');
    }
  }

  const passwordInput = page.getByTestId('common_input_password_en');
  try {
    await passwordInput.waitFor({ timeout: 3000 });
    console.log('Password input found with data-testid');
  } catch (error) {
    console.error('Password input not found with data-testid');
    const cssInput = page.locator('input[type="password"]');
    try {
      await cssInput.waitFor({ timeout: 2000 });
      console.log('Password input found with CSS selector');
    } catch (cssError) {
      console.error('Password input not found at all');
    }
  }

  const loginButton = page.getByTestId('common_btn_login_en');
  try {
    await loginButton.waitFor({ timeout: 3000 });
    console.log('Login button found with data-testid');
  } catch (error) {
    console.error('Login button not found with data-testid');
    const cssButton = page.locator('button[type="submit"]');
    try {
      await cssButton.waitFor({ timeout: 2000 });
      console.log('Login button found with CSS selector');
    } catch (cssError) {
      console.error('Login button not found at all');
    }
  }

  // Check all data-testids on page
  const allTestIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid')
    );
  });

  console.log('All data-testids on page:', allTestIds);
});
