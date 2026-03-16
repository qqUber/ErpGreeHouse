import { expect, login, test } from '../_shared';

test.describe('Language Support', () => {
  test('should display login form in English by default', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'en');
    });

    await page.goto('/admin/login');

    // Use correct data-testid locators matching the app
    const usernameInput = page.getByTestId('common_input_username_en');
    const passwordInput = page.getByTestId('common_input_password_en');
    const loginButton = page.getByTestId('common_btn_password_login_en');

    // Verify all elements are visible with correct locators
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Verify localized content for English
    await expect(usernameInput).toHaveAttribute('placeholder', 'Username');
    await expect(passwordInput).toHaveAttribute('placeholder', 'Password');
    await expect(loginButton).toContainText('By Password');
  });

  test('should translate login form to Russian', async ({ page }) => {
    // Set language to Russian
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'ru');
    });

    await page.goto('/admin/login');

    // Verify correct locators still work
    const usernameInput = page.getByTestId('common_input_username_en');
    const passwordInput = page.getByTestId('common_input_password_en');
    const loginButton = page.getByTestId('common_btn_password_login_en');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Verify localized content for Russian
    await expect(usernameInput).toHaveAttribute('placeholder', 'Логин');
    await expect(passwordInput).toHaveAttribute('placeholder', 'Пароль');
    await expect(loginButton).toContainText('По паролю');
  });

  test('should translate login form to Serbian', async ({ page }) => {
    // Set language to Serbian
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'srb');
    });

    await page.goto('/admin/login');

    // Verify correct locators still work
    const usernameInput = page.getByTestId('common_input_username_en');
    const passwordInput = page.getByTestId('common_input_password_en');
    const loginButton = page.getByTestId('common_btn_password_login_en');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Verify localized content for Serbian
    await expect(usernameInput).toHaveAttribute('placeholder', 'Корисничко име');
    await expect(passwordInput).toHaveAttribute('placeholder', 'Лозинка');
    await expect(loginButton).toContainText('Лозинком');
  });

  test('should maintain navigation in all languages', async ({ page }) => {
    // Login with shared helper to avoid UI login flow timing issues
    await login(page, 'admin');

    // Verify authenticated navigation shell is visible in English
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('.language-switcher-button')).toBeVisible();

    // Change to Russian
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'ru');
    });

    // Refresh page to apply language change
    await page.reload();

    // Verify authenticated navigation shell remains available after language change
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('.language-switcher-button')).toBeVisible();
  });
});
