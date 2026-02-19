import { attachConsole, expect, retryBackoff, test } from '../_shared'
import type { Page } from '@playwright/test'

async function login(page: Page, username: string, password: string) {
  await page.goto('/')
  await page.getByPlaceholder('Логин').fill(username)
  await page.getByPlaceholder('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(/Роль:/)).toBeVisible()
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
  await expect(page.getByText('Настройки')).toBeVisible()
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
