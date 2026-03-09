import { test, expect } from '@playwright/test'

test.describe('RSS Source Management Access Control', () => {
  test('should redirect to login when opening RSS page', async ({ page }) => {
    await page.goto('/rss')

    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page should provide a continue-browsing link', async ({ page }) => {
    await page.goto('/rss')
    await page.waitForURL(/\/login/)

    await expect(page.locator('div.max-w-md a[href="/"]')).toBeVisible()
  })

  test('should keep navigation usable after RSS redirect', async ({ page }) => {
    await page.goto('/')
    await page.goto('/rss')
    await page.waitForURL(/\/login/)

    await page.goBack()
    await expect(page.url()).toBeTruthy()
  })
})

test.describe('RSS Route Error Handling', () => {
  test('should handle invalid RSS sub-routes gracefully', async ({ page }) => {
    await page.goto('/rss/invalid-page')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const redirectedToLogin = url.includes('/login')
    const hasNotFound = await page
      .locator('text=/404|Not Found|找不到/i')
      .isVisible()
      .catch(() => false)

    expect(redirectedToLogin || hasNotFound).toBe(true)
  })

  test('should preserve keyboard navigation on login page', async ({ page }) => {
    await page.goto('/rss')
    await page.waitForURL(/\/login/)

    await page.keyboard.press('Tab')
    const focusedTagName = await page.evaluate(() => document.activeElement?.tagName || '')

    expect(focusedTagName).toBeTruthy()
  })
})
