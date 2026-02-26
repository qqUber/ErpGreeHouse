import { expect, test } from '@playwright/test';

test.describe('Login Flow Test', () => {
  test('should login successfully with test credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/admin/login');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if we're on the login page
    const url = page.url();
    console.log('Current URL:', url);

    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'login-page.png', fullPage: true });

    // Try to find login form elements with different selectors
    const selectors = [
      'input[name="username"]',
      'input[name="user"]',
      'input[type="text"]',
      'input[placeholder*="user"]',
      'input[placeholder*="login"]',
      'form input[type="text"]',
      'form input:first-of-type',
    ];

    let usernameInput;
    for (const selector of selectors) {
      try {
        usernameInput = page.locator(selector);
        await usernameInput.waitFor({ timeout: 5000 });
        console.log('Found username input with selector:', selector);
        break;
      } catch (e) {
        console.log('Selector not found:', selector);
      }
    }

    if (!usernameInput) {
      // If we can't find the form, let's see what's on the page
      const bodyText = await page.textContent('body');
      console.log('Page body text:', bodyText?.substring(0, 500));

      // Check if there's a redirect happening
      await page.waitForTimeout(2000);
      const finalUrl = page.url();
      console.log('Final URL after wait:', finalUrl);

      throw new Error('Could not find login form elements');
    }

    // Fill in the form
    await usernameInput.fill('admin');

    // Find password input
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'form input[type="password"]',
    ];

    let passwordInput;
    for (const selector of passwordSelectors) {
      try {
        passwordInput = page.locator(selector);
        await passwordInput.waitFor({ timeout: 5000 });
        console.log('Found password input with selector:', selector);
        break;
      } catch (e) {
        console.log('Password selector not found:', selector);
      }
    }

    if (!passwordInput) {
      throw new Error('Could not find password input');
    }

    await passwordInput.fill('TestPass123!');

    // Find and click login button
    const loginButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'input[type="submit"]',
      'button',
    ];

    let loginButton;
    for (const selector of loginButtonSelectors) {
      try {
        loginButton = page.locator(selector);
        await loginButton.waitFor({ timeout: 5000 });
        console.log('Found login button with selector:', selector);
        break;
      } catch (e) {
        console.log('Login button selector not found:', selector);
      }
    }

    if (!loginButton) {
      throw new Error('Could not find login button');
    }

    await loginButton.click();

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Check if we're logged in by looking at the URL
    const finalUrl = page.url();
    console.log('Final URL after login:', finalUrl);

    // Check if we're on the dashboard
    expect(finalUrl).toContain('/admin');
    expect(finalUrl).not.toContain('/login');

    // Take a screenshot of the result
    await page.screenshot({ path: 'after-login.png', fullPage: true });
  });
});
