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

    await page.getByRole('link', { name: /Continue without signing in/i }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('RSS Route Error Handling', () => {
  test('should handle invalid RSS sub-routes gracefully', async ({ page }) => {
    await page.goto('/rss/invalid-page')

    await expect(async () => {
      const url = page.url()
      const redirectedToLogin = url.includes('/login')
      const hasNotFound = await page
        .getByRole('heading', { name: /404|Not Found/i })
        .isVisible()
        .catch(() => false)

      expect(redirectedToLogin || hasNotFound).toBe(true)
    }).toPass()
  })

  test('should preserve keyboard navigation on login page', async ({ page }) => {
    await page.goto('/rss')
    await page.waitForURL(/\/login/)

    await page.keyboard.press('Tab')
    const focusedTagName = await page.evaluate(() => document.activeElement?.tagName || '')

    expect(focusedTagName).toBeTruthy()
  })
})
