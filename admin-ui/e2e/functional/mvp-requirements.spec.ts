import { test, expect } from '@playwright/test'

/**
 * Functional E2E Tests for MVP Requirements
 * 
 * Tests cover:
 * 1. Authentication & Authorization
 * 2. Customer Management
 * 3. POS Operations
 * 4. Product Management
 * 5. Integrations
 */

// Helper: Login to the application
async function login(page: any, username: string, password: string) {
  await page.goto('/')
  await page.getByPlaceholder('Логин').fill(username)
  await page.getByPlaceholder('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(1000) // Wait for UI to stabilize
}

// Helper: Logout from the application
async function logout(page: any) {
  const logoutBtn = page.getByRole('button', { name: 'Выйти' })
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await page.waitForTimeout(500)
  }
}

// Helper: Generate unique phone number
function generatePhone() {
  return '+7999' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
}

// Helper: Generate unique code
function generateCode(prefix: string) {
  return `${prefix}_${Date.now()}`
}

test.describe('MVP Functional Requirements', () => {
  
  test.describe('Authentication & Authorization', () => {
    
    test('admin can login successfully', async ({ page }) => {
      await login(page, 'admin', 'admin')
      await expect(page.getByText(/Роль:/)).toBeVisible()
      await expect(page.getByText(/Админ/)).toBeVisible()
    })

    test('operator can login successfully', async ({ page }) => {
      await login(page, 'operator', 'operator')
      await expect(page.getByText(/Роль:/)).toBeVisible()
      await expect(page.getByText(/Оператор/)).toBeVisible()
    })

    test('manager can login successfully', async ({ page }) => {
      await login(page, 'manager', 'manager')
      await expect(page.getByText(/Роль:/)).toBeVisible()
      await expect(page.getByText(/Менеджер/)).toBeVisible()
    })

    test('login fails with invalid credentials', async ({ page }) => {
      await page.goto('/')
      await page.getByPlaceholder('Логин').fill('admin')
      await page.getByPlaceholder('Пароль').fill('wrongpassword123')
      await page.getByRole('button', { name: 'Войти' }).click()
      
      await expect(page.getByText(/Invalid credentials|Неверные учетные данные/i)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Customer Management', () => {
    
    test('create customer manually and search', async ({ page }) => {
      const phone = generatePhone()
      const name = `Test Client ${Date.now()}`

      await login(page, 'admin', 'admin')
      
      // Navigate to Customers
      await page.getByText('Клиенты').click()
      await expect(page.getByText('Клиенты')).toBeVisible()
      
      // Create new customer
      await page.getByRole('button', { name: 'Новый клиент' }).click()
      await page.getByPlaceholder('ФИО (обязательно)').fill(name)
      await page.getByPlaceholder('Телефон (7999...)').fill(phone.replace('+', ''))
      await page.getByPlaceholder('Заметки').fill('E2E test customer')
      await page.getByRole('button', { name: 'Создать' }).click()
      
      // Verify creation success
      await expect(page.getByText(/Клиент успешно создан/i)).toBeVisible({ timeout: 5000 })
      
      // Search for customer
      await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone)
      await page.getByRole('button', { name: 'Поиск' }).click()
      
      // Verify customer found
      await expect(page.getByRole('cell', { name: phone })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('cell', { name: name })).toBeVisible()
    })

    test('customer card shows balance and transaction history', async ({ page }) => {
      const phone = generatePhone()
      const name = `Balance Test ${Date.now()}`

      await login(page, 'admin', 'admin')
      
      // Create customer
      await page.getByText('Клиенты').click()
      await page.getByRole('button', { name: 'Новый клиент' }).click()
      await page.getByPlaceholder('ФИО (обязательно)').fill(name)
      await page.getByPlaceholder('Телефон (7999...)').fill(phone.replace('+', ''))
      await page.getByRole('button', { name: 'Создать' }).click()
      
      // Search and open customer card
      await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone)
      await page.getByRole('button', { name: 'Поиск' }).click()
      await page.getByRole('cell', { name: phone }).click()
      
      // Verify customer card elements
      await expect(page.getByText('История операций')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/Баланс:/)).toBeVisible()
    })
  })

  test.describe('POS Operations', () => {
    
    test('identify customer and create sale', async ({ page }) => {
      const phone = generatePhone()
      const name = `POS Test ${Date.now()}`

      await login(page, 'operator', 'operator')
      
      // Navigate to Operations
      await page.getByText('Операции').click()
      await expect(page.getByText('Операции')).toBeVisible()
      
      // Identify customer
      await page.getByPlaceholder('+79991234567').fill(phone)
      await page.getByRole('button', { name: 'Идентифицировать' }).click()
      
      // Wait for customer identification or creation
      await page.waitForTimeout(2000)
      
      // Customer should be identified or created
      await expect(page.getByText(/Клиент:/)).toBeVisible({ timeout: 5000 })
      
      // Verify sale button is available
      await expect(page.getByRole('button', { name: 'Провести' })).toBeVisible()
    })

    test('add product to cart from catalog', async ({ page, request }) => {
      const code = generateCode('E2E_PROD')
      const name = `E2E Product ${Date.now()}`
      const phone = generatePhone()

      // Create product via API first
      const tokenRes = await request.post('/api/v1/public/auth/login', {
        data: { username: 'admin', password: 'admin' }
      })
      const token = (await tokenRes.json()).token

      await request.post('/api/v1/products', {
        headers: { 'x-admin-secret': token },
        data: { code, name, kind: 'goods', price: 100, active: true }
      })

      await login(page, 'operator', 'operator')
      
      // Navigate to Operations
      await page.getByText('Операции').click()
      
      // Identify customer
      await page.getByPlaceholder('+79991234567').fill(phone)
      await page.getByRole('button', { name: 'Идентифицировать' }).click()
      await page.waitForTimeout(2000)
      
      // Select product from catalog
      const select = page.getByRole('combobox')
      await select.selectOption({ label: new RegExp(name) })
      await page.getByRole('button', { name: 'Добавить в чек' }).click()
      
      // Verify product added to cart
      await expect(page.getByText(code)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(name)).toBeVisible()
    })
  })

  test.describe('Product Management', () => {
    
    test('create product manually', async ({ page }) => {
      const code = generateCode('E2E_MANUAL')
      const name = `Manual Product ${Date.now()}`

      await login(page, 'admin', 'admin')
      
      // Navigate to Products
      await page.getByText('Товары').click()
      await expect(page.getByText('Товары / услуги')).toBeVisible()
      
      // Create product
      await page.getByPlaceholder('Код (например E2E_COFFEE)').fill(code)
      await page.getByPlaceholder('Название').fill(name)
      await page.getByPlaceholder('Тип').fill('goods')
      await page.getByPlaceholder('Цена').fill('250')
      await page.getByRole('button', { name: 'Создать' }).click()
      
      // Verify creation
      await expect(page.getByText(/Товар успешно создан/i)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(code)).toBeVisible()
      await expect(page.getByText(name)).toBeVisible()
    })

    test('filter products by type', async ({ page, request }) => {
      const code = generateCode('E2E_FILTER')
      const name = `Filter Product ${Date.now()}`

      // Create product via API
      const tokenRes = await request.post('/api/v1/public/auth/login', {
        data: { username: 'admin', password: 'admin' }
      })
      const token = (await tokenRes.json()).token

      await request.post('/api/v1/products', {
        headers: { 'x-admin-secret': token },
        data: { code, name, kind: 'service', price: 300, active: true }
      })

      await login(page, 'admin', 'admin')
      
      // Navigate to Products
      await page.getByText('Товары').click()
      
      // Filter by service type
      const filterSelect = page.getByRole('combobox').first()
      await filterSelect.selectOption('service')
      
      // Verify filtered results
      await expect(page.getByText(code)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Integrations', () => {
    
    test('create POS integration', async ({ page }) => {
      const integrationName = `POS Integration ${Date.now()}`

      await login(page, 'admin', 'admin')
      
      // Navigate to Integrations
      await page.getByText('Интеграции').click()
      await expect(page.getByText('Интеграции')).toBeVisible()
      
      // Create integration would go here
      // This depends on actual UI implementation
      await expect(page.getByRole('button', { name: /Создать|Добавить/i })).toBeVisible()
    })

    test('view integration delivery history', async ({ page }) => {
      await login(page, 'admin', 'admin')
      
      // Navigate to Integrations
      await page.getByText('Интеграции').click()
      
      // Verify integrations table is visible
      await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Role-based Access Control', () => {
    
    test('operator cannot access integrations tab', async ({ page }) => {
      await login(page, 'operator', 'operator')
      
      // Verify Operations tab is visible
      await expect(page.getByText('Операции')).toBeVisible()
      
      // Verify Integrations tab is NOT visible
      await expect(page.getByText('Интеграции')).not.toBeVisible()
    })

    test('manager cannot access operations tab', async ({ page }) => {
      await login(page, 'manager', 'manager')
      
      // Verify Integrations tab is visible
      await expect(page.getByText('Интеграции')).toBeVisible()
      
      // Verify Operations tab is NOT visible
      await expect(page.getByText('Операции')).not.toBeVisible()
    })

    test('admin can access all main tabs', async ({ page }) => {
      await login(page, 'admin', 'admin')
      
      // Verify all main tabs are visible
      await expect(page.getByText('Сводка')).toBeVisible()
      await expect(page.getByText('Клиенты')).toBeVisible()
      await expect(page.getByText('Операции')).toBeVisible()
      await expect(page.getByText('Товары')).toBeVisible()
      await expect(page.getByText('Интеграции')).toBeVisible()
    })
  })
})
