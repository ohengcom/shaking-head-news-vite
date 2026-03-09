import { test, expect } from '@playwright/test'

test.describe('News Browsing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display homepage title and header content', async ({ page }) => {
    await expect(page).toHaveTitle(/摇头看新闻|Shaking Head News/i)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/摇头看新闻|Shaking Head News/i)

    await expect(page.locator('main .mb-6 p').first()).toBeVisible()
  })

  test('should display news content area or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const newsList = page.getByTestId('news-list')
    if ((await newsList.count()) > 0) {
      await expect(newsList).toBeVisible()
      return
    }

    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test('should have visible header navigation and footer', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(header.locator('nav')).toBeVisible()

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })

  test('should render rotation wrapper container', async ({ page }) => {
    await expect(page.getByTestId('tilt-wrapper')).toBeVisible()
  })

  test('should navigate to settings page and redirect to login', async ({ page }) => {
    await page.locator('header a[href="/settings"]').first().click()
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('should navigate to stats page and redirect to login', async ({ page }) => {
    await page.locator('header a[href="/stats"]').first().click()
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect to login when opening RSS route', async ({ page }) => {
    await page.goto('/rss')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('should have basic accessible heading structure', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
    }

    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
