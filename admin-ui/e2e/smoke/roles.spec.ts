import { attachConsole, expect, retryBackoff, test } from '../_shared'
import type { Page } from '@playwright/test'
import * as fs from 'fs'

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`))
  page.on('pageerror', err => console.error(`[Browser] Uncaught exception: ${err.message}`))
})

async function login(page: Page, username: string, password: string) {
  await page.goto('/')
  await page.getByPlaceholder('Логин').fill(username)
  await page.getByPlaceholder('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()

  // Wait for auth overlay to detach to ensure UI is interactive and loaded
  const authOverlay = page.locator('.overlay')
  if (await authOverlay.isVisible()) {
    console.log('[Test] Auth overlay visible, waiting for detach...')
    try {
      await authOverlay.waitFor({ state: 'detached', timeout: 10000 })
    } catch (e) {
      console.error('[Test] Auth overlay did not detach, using fallback timeout...')
      await page.waitForTimeout(5000)
    }
  }

  // Debug page content if role is not found
  try {
    await expect(page.getByText(/Роль:/)).toBeVisible({ timeout: 10000 })
  } catch (e) {
    console.error('[Test] Role element check failed')
    const content = await page.content()
    console.error('[Test] Page content length:', content.length)
    console.error('[Test] Page content (first 2000 chars):', content.slice(0, 2000))
    
    // Check for error notices
    const errorNotices = await page.locator('.statusBarErr').allTextContents()
    console.error('[Test] Error notices:', errorNotices)

    // Save page content to file for debugging
    fs.writeFileSync('debug_page.html', content)
    console.error('[Test] Page content saved to debug_page.html')
    
    throw e
  }
}

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

test('owner sees all tabs', async ({ page }) => {
  await login(page, 'admin', 'admin')
  await expect(page.getByText('Сводка')).toBeVisible()
  await expect(page.getByText('Клиенты')).toBeVisible()
  await expect(page.getByText('Операции')).toBeVisible()
  await expect(page.getByText('Интеграции')).toBeVisible()
  await expect(page.getByText('Товары')).toBeVisible()
  // Use exact match for Settings tab (not "Settings access")
  await expect(page.getByText('Настройки', { exact: true })).toBeVisible()
  await expect(page.getByText(/Роль:\s*Админ/)).toBeVisible()
})

test('operator cannot see integrations', async ({ page }) => {
  await login(page, 'operator', 'operator')
  await expect(page.getByText('Операции')).toBeVisible()
  await expect(page.getByText('Интеграции')).toHaveCount(0)
  await expect(page.getByText(/Роль:\s*Оператор/)).toBeVisible()

  const resp = await page.request.get('/api/v1/integrations')
  expect(resp.status()).toBe(403)
})

test('manager cannot see pos operations', async ({ page }) => {
  await login(page, 'manager', 'manager')
  await expect(page.getByText('Интеграции')).toBeVisible()
  await expect(page.getByText('Операции')).toHaveCount(0)
  await expect(page.getByText(/Роль:\s*Менеджер/)).toBeVisible()

  const resp = await page.request.post('/api/v1/pos/sale', { data: { customer_id: 1, items: [{ code: 'X', name: 'X', price: 1, qty: 1 }], requested_bonus: 0 } })
  expect(resp.status()).toBe(403)
})
