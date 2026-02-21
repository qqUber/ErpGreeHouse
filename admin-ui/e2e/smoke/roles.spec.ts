import { attachConsole, expect, login, retryBackoff, test, TEST_CREDENTIALS } from '../_shared'
import type { Page } from '@playwright/test'
import * as fs from 'fs'

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`))
  page.on('pageerror', err => console.error(`[Browser] Uncaught exception: ${err.message}`))
})

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
  // Use TEST_CREDENTIALS instead of hardcoded passwords
  await login(page, 'admin')
  await page.waitForTimeout(2000)
  await expect(page.getByText('Клиенты')).toBeVisible()
  await expect(page.getByText('Операции')).toBeVisible()
  await expect(page.getByText('Интеграции')).toBeVisible()
  await expect(page.getByText('Товары')).toBeVisible()
  // Use exact match for Settings tab (not "Settings access")
  await expect(page.getByText('Настройки', { exact: true })).toBeVisible()
})

test('operator cannot see integrations', async ({ page }) => {
  await login(page, 'operator')
  await page.waitForTimeout(2000)
  await expect(page.getByText('Операции')).toBeVisible()
  await expect(page.getByText('Интеграции')).toHaveCount(0)

  const resp = await page.request.get('/api/v1/integrations')
  expect(resp.status()).toBe(403)
})

test('manager cannot see pos operations', async ({ page }) => {
  await login(page, 'manager')
  await page.waitForTimeout(2000)
  await expect(page.getByText('Интеграции')).toBeVisible()
  await expect(page.getByText('Операции')).toHaveCount(0)

  const resp = await page.request.post('/api/v1/pos/sale', { data: { customer_id: 1, items: [{ code: 'X', name: 'X', price: 1, qty: 1 }], requested_bonus: 0 } })
  expect(resp.status()).toBe(403)
})
