import { test } from '../_shared';

test.describe('Language Support', () => {
  test('should display login form in English by default', async ({ page }) => {
    await page.goto('/admin/login');

    // Use clean data-testid locators for functional testing
    const usernameInput = page.getByTestId('login_input_username');
    const passwordInput = page.getByTestId('login_input_password');
    const loginButton = page.getByTestId('login_btn_submit');

    // Verify all elements are visible with clean locators
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Verify text content for English (localization test)
    await expect(page.getByText('Username')).toBeVisible();
    await expect(page.getByText('Password')).toBeVisible();
    await expect(page.getByText('Login')).toBeVisible();
  });

  test('should translate login form to Russian', async ({ page }) => {
    // Set language to Russian
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'ru');
    });

    await page.goto('/admin/login');

    // Verify Russian text is displayed (using text selectors for localization)
    await expect(page.getByText('Имя пользователя')).toBeVisible();
    await expect(page.getByText('Пароль')).toBeVisible();
    await expect(page.getByText('Войти')).toBeVisible();

    // Verify clean locators still work
    const usernameInput = page.getByTestId('login_input_username');
    const passwordInput = page.getByTestId('login_input_password');
    const loginButton = page.getByTestId('login_btn_submit');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should translate login form to Serbian', async ({ page }) => {
    // Set language to Serbian
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'srb');
    });

    await page.goto('/admin/login');

    // Verify Serbian text is displayed (using text selectors for localization)
    await expect(page.getByText('Корисничко име')).toBeVisible();
    await expect(page.getByText('Лозинка')).toBeVisible();
    await expect(page.getByText('Пријави се')).toBeVisible();

    // Verify clean locators still work
    const usernameInput = page.getByTestId('login_input_username');
    const passwordInput = page.getByTestId('login_input_password');
    const loginButton = page.getByTestId('login_btn_submit');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should maintain navigation in all languages', async ({ page }) => {
    // Login first with default language
    await page.goto('/admin/login');
    await page.getByTestId('login_input_username').fill('admin');
    await page.getByTestId('login_input_password').fill('admin');
    await page.getByTestId('login_btn_submit').click();

    // Wait for dashboard to load
    await page.waitForURL('/admin/dashboard');

    // Test navigation in English
    await expect(page.getByTestId('nav_item_dashboard')).toBeVisible();
    await expect(page.getByTestId('nav_item_customers')).toBeVisible();
    await expect(page.getByTestId('nav_item_products')).toBeVisible();
    await expect(page.getByTestId('nav_item_pos')).toBeVisible();
    await expect(page.getByTestId('nav_item_marketing')).toBeVisible();
    await expect(page.getByTestId('nav_item_integrations')).toBeVisible();
    await expect(page.getByTestId('nav_item_settings')).toBeVisible();

    // Change to Russian
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'ru');
    });

    // Refresh page to apply language change
    await page.reload();

    // Verify navigation items are still visible (they have clean locators)
    await expect(page.getByTestId('nav_item_dashboard')).toBeVisible();
    await expect(page.getByTestId('nav_item_customers')).toBeVisible();
    await expect(page.getByTestId('nav_item_products')).toBeVisible();
    await expect(page.getByTestId('nav_item_pos')).toBeVisible();
    await expect(page.getByTestId('nav_item_marketing')).toBeVisible();
    await expect(page.getByTestId('nav_item_integrations')).toBeVisible();
    await expect(page.getByTestId('nav_item_settings')).toBeVisible();
  });
});
