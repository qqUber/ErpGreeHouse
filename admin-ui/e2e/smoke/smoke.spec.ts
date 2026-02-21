import { attachConsole, expect, login, retryBackoff, test, TEST_CREDENTIALS } from '../_shared'

const consoleFlush = new Map<string, () => Promise<void>>()

test.beforeEach(async ({ page }, testInfo) => {
  consoleFlush.set(testInfo.testId, attachConsole(page, testInfo))
  await retryBackoff(testInfo)
})

test.afterEach(async ({}, testInfo) => {
  const flush = consoleFlush.get(testInfo.testId)
  if (flush) await flush()
  consoleFlush.delete(testInfo.testId)
})

test('auth rejects invalid password', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`))
  page.on('pageerror', err => console.log(`[Browser] Page Error: ${err.message}`))
  await page.goto('/?t=' + Date.now())
  await page.getByPlaceholder('Логин').fill('admin')
  await page.getByPlaceholder('Пароль').fill('wrongpassword')

  console.log('[Test] Clicking login button...')
  await page.getByRole('button', { name: 'Войти' }).click()
  console.log('[Test] Clicked login button')

  await page.waitForTimeout(2000)

  // Check if error message contains expected text
  const statusElement = page.getByTestId('status-bar')

  // Wait for auth modal to disappear if present
  const authModal = page.getByRole('dialog')
  if (await authModal.isVisible()) {
    console.log('[Test] Auth modal is visible, waiting for it to detach...')
    await authModal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => console.log('[Test] Auth modal did not detach'))
  }

  // Wait for it to be visible with a longer timeout
  try {
    console.log('[Test] Waiting for status-bar to be attached...')
    await statusElement.waitFor({ state: 'attached', timeout: 10000 })
    console.log('[Test] Status bar attached. Waiting for visibility...')
    await expect(statusElement).toBeVisible({ timeout: 10000 })
  } catch (e) {
    console.log('[Test] Status element check failed')
    // Safe way to log content without require('fs')
    const content = await page.content()
    console.log('[Test] Page content length:', content.length)
    console.log('[Test] Page content (first 2000 chars):', content.slice(0, 2000))
    console.log('[Test] Page content (last 2000 chars):', content.slice(-2000))

    throw e
  }

  const text = await statusElement.textContent()
          console.log(`[Test] Status text: "${text}"`)

          await expect(statusElement).toContainText(/Invalid credentials|Доступ запрещён/i)
        })

test('pos sale creates transaction visible in customer card', async ({ page }) => {
  const phone = `+7999${String(Date.now()).slice(-7)}`

  // Use login helper instead of manual login
  await login(page, 'admin')
  await page.waitForTimeout(1000)

  await page.getByText('Операции').click()
  await page.waitForTimeout(1000)

  // Fill phone and identify customer
  await page.getByPlaceholder('+79991234567').fill(phone)
  await page.getByRole('button', { name: 'Идентифицировать' }).click()

  // Wait for customer identification
  await page.waitForTimeout(2000)
  await expect(page.getByText(/Клиент:/)).toBeVisible()

  // Process sale
  await page.getByRole('button', { name: 'Провести' }).click()

  // Wait for sale to complete
  await page.waitForTimeout(2000)
  await expect(page.getByText(/Операция выполнена/)).toBeVisible()

  // Navigate to customers
  await page.getByText('Клиенты').click()
  await page.waitForTimeout(1000)

  await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone)
  await page.getByRole('button', { name: 'Поиск' }).click()

  await page.waitForTimeout(2000)
  await page.getByRole('cell', { name: phone }).click()
  
  await expect(page.getByText('История операций')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Чек (PDF)' }).first()).toBeVisible()
})
