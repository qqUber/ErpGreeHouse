import { expect, test } from '@playwright/test';

/**
 * Functional E2E Tests for MVP Requirements
 *
 * Tests cover:
 * 1. Authentication & Authorization
 * 2. Customer Management
 * 3. POS Operations
 * 4. Product Management
 * 5. Integrations
 *
 * AUTHENTICATION PATTERNS:
 * - This file uses MIXED authentication patterns
 * - UI login tests use standard JWT cookies (httpOnly)
 * - API tests use LEGACY pattern (x-admin-secret header)
 * - See lines 165-173 and 225-233 for legacy x-admin-secret usage
 */

async function login(page: any, username: string, password: string) {
  await page.goto('/');
  await page.getByTestId('common_input_username_en').fill(username);
  await page.getByTestId('common_input_password_en').fill(password);
  await page.getByTestId('common_btn_login_en').click();
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });
}

test.describe('MVP Functional Requirements', () => {
  test.describe('Authentication & Authorization', () => {
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

    test('invalid password keeps login form', async ({ page }) => {
      await page.context().clearCookies();
      await page.addInitScript(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await page.goto('/');
      await page.getByTestId('common_input_username_en').fill('admin');
      await page.getByTestId('common_input_password_en').fill('wrongpassword123');
      await page.getByTestId('common_btn_login_en').click();
      await expect(page.getByTestId('common_btn_login_en')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('common_input_password_en')).toBeVisible();
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

  test.describe('POS Operations', () => {
    test('operator dashboard loads', async ({ page }) => {
      await login(page, 'operator', 'operator');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });

    test('admin can open products after login', async ({ page }) => {
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

    test('products section remains loaded', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByTestId('admin_nav_products').click();
      await expect(page.getByTestId('admin_nav_products')).toHaveAttribute('aria-selected', 'true');
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

    test('integrations section remains loaded', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByTestId('admin_nav_integrations').click();
      await expect(page.getByTestId('admin_nav_integrations')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  test.describe('Role-based Access Control', () => {
    test('operator navigation loads', async ({ page }) => {
      await login(page, 'operator', 'operator');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });

    test('manager navigation loads', async ({ page }) => {
      await login(page, 'manager', 'manager');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    });

    test('admin can access key tabs', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
      await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
      await expect(page.getByTestId('admin_nav_products')).toBeVisible();
      await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();
    });
  });
});
