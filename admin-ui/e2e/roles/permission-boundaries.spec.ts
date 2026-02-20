import { test, expect } from '@playwright/test'

/**
 * Cross-Role Permission Boundaries E2E Test
 * 
 * Покрытие:
 * - Operator не видит Integrations/Settings
 * - Manager не видит POS/Settings
 * - Admin видит всё
 * - Попытки несанкционированного доступа
 */

test.describe('Permission Boundaries', () => {
  
  test.describe('Role-based Tab Visibility', () => {
    
    test('admin sees all tabs', async ({ page }) => {
      // Login as admin
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('admin')
      await page.getByPlaceholder('Пароль').fill('admin')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 })
      
      // Verify all tabs are visible
      await expect(page.getByText('Сводка')).toBeVisible()
      await expect(page.getByText('Клиенты')).toBeVisible()
      await expect(page.getByText('Операции')).toBeVisible()
      await expect(page.getByText('Товары')).toBeVisible()
      await expect(page.getByText('Интеграции')).toBeVisible()
      await expect(page.getByText('Настройки', { exact: true })).toBeVisible()
      
      console.log('[Boundaries] Admin sees all tabs ✓')
    })

    test('operator sees only POS and Customers', async ({ page }) => {
      // Login as operator
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('operator')
      await page.getByPlaceholder('Пароль').fill('operator')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Операции')).toBeVisible({ timeout: 10000 })
      
      // Verify visible tabs
      await expect(page.getByText('Операции')).toBeVisible()
      await expect(page.getByText('Клиенты')).toBeVisible()
      
      // Verify hidden tabs
      await expect(page.getByText('Интеграции')).not.toBeVisible()
      await expect(page.getByText('Настройки', { exact: true })).not.toBeVisible()
      
      console.log('[Boundaries] Operator has limited access ✓')
    })

    test('manager sees Marketing and Integrations', async ({ page }) => {
      // Login as manager
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('manager')
      await page.getByPlaceholder('Пароль').fill('manager')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Интеграции')).toBeVisible({ timeout: 10000 })
      
      // Verify visible tabs
      await expect(page.getByText('Сводка')).toBeVisible()
      await expect(page.getByText('Клиенты')).toBeVisible()
      await expect(page.getByText('Товары')).toBeVisible()
      await expect(page.getByText('Интеграции')).toBeVisible()
      
      // Verify hidden tabs
      await expect(page.getByText('Операции')).not.toBeVisible()
      await expect(page.getByText('Настройки', { exact: true })).not.toBeVisible()
      
      console.log('[Boundaries] Manager has marketing access ✓')
    })
  })

  test.describe('Direct URL Access Protection', () => {
    
    test('operator cannot access integrations via URL', async ({ page, browserName }) => {
      // Login as operator
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('operator')
      await page.getByPlaceholder('Пароль').fill('operator')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Операции')).toBeVisible({ timeout: 10000 })
      
      // Try direct URL access
      await page.goto('/admin/#integrations')
      await page.waitForTimeout(2000)
      
      // Should redirect or show access denied
      const integrationsVisible = await page.getByText('Интеграции').isVisible()
      expect(integrationsVisible).toBeFalsy()
      
      console.log(`[Boundaries] Operator URL access blocked (${browserName}) ✓`)
    })

    test('manager cannot access pos via URL', async ({ page, browserName }) => {
      // Login as manager
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('manager')
      await page.getByPlaceholder('Пароль').fill('manager')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Интеграции')).toBeVisible({ timeout: 10000 })
      
      // Try direct URL access
      await page.goto('/admin/#pos')
      await page.waitForTimeout(2000)
      
      // Should redirect or show access denied
      const posVisible = await page.getByText('Операция продажи').isVisible()
      expect(posVisible).toBeFalsy()
      
      console.log(`[Boundaries] Manager POS URL blocked (${browserName}) ✓`)
    })

    test('unauthorized user cannot access admin panel', async ({ page }) => {
      // Try direct access without login
      await page.goto('/admin/')
      await page.waitForTimeout(2000)
      
      // Should show login screen
      await expect(page.getByPlaceholder('Логин')).toBeVisible({ timeout: 5000 })
      await expect(page.getByPlaceholder('Пароль')).toBeVisible()
      
      console.log('[Boundaries] Admin panel protected ✓')
    })
  })

  test.describe('API Permission Enforcement', () => {
    
    test('operator gets 403 on integrations API', async ({ page, request }) => {
      // Login as operator to get token
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('operator')
      await page.getByPlaceholder('Пароль').fill('operator')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Операции')).toBeVisible({ timeout: 10000 })
      
      // Get token from localStorage
      const token = await page.evaluate(() => localStorage.getItem('admin_session_token'))
      
      // Try to access integrations API
      const response = await request.get('/api/v1/integrations', {
        headers: { 'x-admin-secret': token || '' }
      })
      
      // Should get 403 Forbidden
      expect([403, 401]).toContain(response.status())
      
      console.log('[Boundaries] Operator API access denied (403/401) ✓')
    })

    test('manager gets 403 on POS sale API', async ({ page, request }) => {
      // Login as manager
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('manager')
      await page.getByPlaceholder('Пароль').fill('manager')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Интеграции')).toBeVisible({ timeout: 10000 })
      
      // Get token
      const token = await page.evaluate(() => localStorage.getItem('admin_session_token'))
      
      // Try to access POS sale API
      const response = await request.post('/api/v1/pos/sale', {
        headers: { 'x-admin-secret': token || 'test' },
        data: { customer_id: 1, items: [], requested_bonus: 0 }
      })
      
      // Should get 403 or 401 Forbidden
      expect([403, 401]).toContain(response.status())
      
      console.log('[Boundaries] Manager POS API denied (403/401) ✓')
    })

    test('admin can access all APIs', async ({ page, request }) => {
      // Login as admin
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('admin')
      await page.getByPlaceholder('Пароль').fill('admin')
      await page.getByRole('button', { name: 'Войти' }).click()
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 })
      
      // Get token
      const token = await page.evaluate(() => localStorage.getItem('admin_session_token'))
      
      // Test dashboard API
      const dashboardRes = await request.get('/api/v1/dashboard', {
        headers: { 'x-admin-secret': token || 'test' }
      })
      expect([200, 201]).toContain(dashboardRes.status())
      
      // Test customers API
      const customersRes = await request.get('/api/v1/customers', {
        headers: { 'x-admin-secret': token || 'test' }
      })
      expect([200, 201]).toContain(customersRes.status())
      
      console.log('[Boundaries] Admin has API access ✓')
    })
  })
})
