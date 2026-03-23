import { test, expect } from '@playwright/test'

test.describe('Complete User Journey (Guest)', () => {
  test('should complete guest browsing flow', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/摇头看新闻|Shaking Head News/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto('/settings')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)

    await page.locator('div.max-w-md a[href="/"]').click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('should redirect protected routes to login', async ({ page }) => {
    for (const path of ['/settings', '/stats', '/rss']) {
      await page.goto(path)
      await page.waitForURL(/\/login/)
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('should handle browser back and forward navigation', async ({ page }) => {
    await page.goto('/')
    await page.goto('/login')
    await page.goto('/')

    await page.goBack()
    await expect(page).toHaveURL('/login')

    await page.goBack()
    await expect(page).toHaveURL('/')

    await page.goForward({ waitUntil: 'commit' })
    await expect(page).toHaveURL('/login')
  })

  test('should handle page reload gracefully', async ({ page }) => {
    await page.goto('/')
    await page.reload()

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('should keep header and footer visible on home', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    await expect(page.getByRole('heading', { name: /404|Not Found/i })).toBeVisible()
  })
})

test.describe('User Journey - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should complete mobile guest flow', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto('/settings')
    await page.waitForURL(/\/login/)
    await expect(page.locator('div.max-w-md')).toBeVisible()

    await page.locator('div.max-w-md a[href="/"]').click()
    await expect(page).toHaveURL('/')
  })
})
