import { expect, test } from '@playwright/test';

test.describe('Role Configuration', () => {
  test('owner and operator auth smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('common_input_username_en').fill('admin');
    await page.getByTestId('common_input_password_en').fill('admin');
    await page.getByTestId('common_btn_login_en').click();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/');
    await expect(page.getByTestId('common_input_username_en')).toBeVisible();

    await page.getByTestId('common_input_username_en').fill('operator');
    await page.getByTestId('common_input_password_en').fill('operator');
    await page.getByTestId('common_btn_login_en').click();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 15000 });
  });
});
