import { expect, test } from '@playwright/test';

/**
 * MVP Core Functional Tests - Verified Working Tests
 *
 * These tests verify the core MVP functionality that is actually
 * implemented and working in the current UI.
 */

async function login(page: any, username: string, password: string) {
  await page.goto('/');
  await page.getByTestId('common_input_username_en').fill(username);
  await page.getByTestId('common_input_password_en').fill(password);
  await page.getByTestId('common_btn_login_en').click();
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });
}

test.describe('MVP Core Tests', () => {
  test.describe('Authentication', () => {
    test('admin login smoke', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await expect(page.getByTestId('admin_nav_dashboard')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    test('operator login smoke', async ({ page }) => {
      await login(page, 'operator', 'operator');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });

    test('manager login smoke', async ({ page }) => {
      await login(page, 'manager', 'manager');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });

    test('reject invalid password', async ({ page }) => {
      await page.context().clearCookies();
      await page.addInitScript(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await page.goto('/');
      await page.getByTestId('common_input_username_en').fill('admin');
      await page.getByTestId('common_input_password_en').fill('wrongpassword');
      await page.getByTestId('common_btn_login_en').click();
      await expect(page.getByTestId('common_btn_login_en')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('common_input_password_en')).toBeVisible();
    });
  });

  test.describe('Role-based Access', () => {
    test('operator navigation loads', async ({ page }) => {
      await login(page, 'operator', 'operator');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });

    test('manager navigation loads', async ({ page }) => {
      await login(page, 'manager', 'manager');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });

    test('admin sees all main tabs', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
      await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
      await expect(page.getByTestId('admin_nav_products')).toBeVisible();
      await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();
    });

    test('admin dashboard loads', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await expect(page.getByTestId('admin_nav_dashboard')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  test.describe('POS Operations', () => {
    test('operator dashboard route loads', async ({ page }) => {
      await login(page, 'operator', 'operator');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });
  });

  test.describe('Product Management', () => {
    test('products tab is accessible', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByTestId('admin_nav_products').click();
      await expect(page.getByTestId('admin_nav_products')).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Customer Management', () => {
    test('customers tab is accessible', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByTestId('admin_nav_customers').click();
      await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    test('customers section remains loaded', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByTestId('admin_nav_customers').click();
      await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  test.describe('Integrations', () => {
    test('integrations tab is accessible', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByTestId('admin_nav_integrations').click();
      await expect(page.getByTestId('admin_nav_integrations')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });
});
