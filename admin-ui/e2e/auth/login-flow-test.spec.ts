import { expect, test } from '@playwright/test';

test.describe('Login Flow Test', () => {
  test('should login successfully with test credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/admin/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if we're on the login page
    const url = page.url();
    console.log('Current URL:', url);

    // Use data-testid selectors (as per E2E_TEST_FIX_PLAN)
    const usernameInput = page.getByTestId('common_input_username_en');
    const passwordInput = page.getByTestId('common_input_password_en');
    const loginButton = page.getByTestId('common_btn_password_login_en');

    // Verify elements are visible
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Fill in the form
    await usernameInput.fill('admin');
    await passwordInput.fill('admin');

    // Click login button
    await loginButton.click();

    // Wait for navigation
    await page.waitForLoadState('domcontentloaded');

    // Check if we're logged in by looking at the URL
    const finalUrl = page.url();
    console.log('Final URL after login:', finalUrl);

    // Check if we're on the dashboard
    expect(finalUrl).toContain('/admin');
    expect(finalUrl).not.toContain('/login');
  });
});
