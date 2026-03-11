import { test } from '../_shared';

test.describe('Language Support', () => {
  test('should display login form in English by default', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Use correct data-testid locators matching the app
    const usernameInput = page.getByTestId('common_input_username_en');
    const passwordInput = page.getByTestId('common_input_password_en');
    const loginButton = page.getByTestId('common_btn_password_login_en');
    
    // Verify all elements are visible with correct locators
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    // Verify text content for English (localization test)
    await expect(page.getByText('Username', { exact: true })).toBeVisible();
    await expect(page.getByText('Password', { exact: true })).toBeVisible();
    await expect(page.getByText('Login', { exact: true })).toBeVisible();
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
    
    // Verify correct locators still work
    const usernameInput = page.getByTestId('common_input_username_en');
    const passwordInput = page.getByTestId('common_input_password_en');
    const loginButton = page.getByTestId('common_btn_password_login_en');
    
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
    
    // Verify correct locators still work
    const usernameInput = page.getByTestId('common_input_username_en');
    const passwordInput = page.getByTestId('common_input_password_en');
    const loginButton = page.getByTestId('common_btn_password_login_en');
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should maintain navigation in all languages', async ({ page }) => {
    // Login first with default language
    await page.goto('/admin/login');
    await page.getByTestId('common_input_username_en').fill('admin');
    await page.getByTestId('common_input_password_en').fill('admin');
    await page.getByTestId('common_btn_password_login_en').click();
    
    // Wait for dashboard to load
    await page.waitForURL('/admin/dashboard');
    
    // Test navigation in English using correct test IDs
    await expect(page.getByTestId('admin_nav_dashboard_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_customers_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_products_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_pos_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_marketing_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_integrations_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_settings_en')).toBeVisible();
    
    // Change to Russian
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'ru');
    });
    
    // Refresh page to apply language change
    await page.reload();
    
    // Verify navigation items are still visible (they have test IDs)
    await expect(page.getByTestId('admin_nav_dashboard_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_customers_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_products_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_pos_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_marketing_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_integrations_en')).toBeVisible();
    await expect(page.getByTestId('admin_nav_settings_en')).toBeVisible();
  });
});
