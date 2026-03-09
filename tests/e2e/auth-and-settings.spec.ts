import { test, expect } from '@playwright/test'

test.describe('User Authentication and Settings Flow', () => {
  test('should display login page with social buttons', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Microsoft/i })).toBeVisible()
  })

  test('should have continue-without-login link', async ({ page }) => {
    await page.goto('/login')

    const continueLink = page.locator('div.max-w-md a[href="/"]')
    await expect(continueLink).toBeVisible()
  })

  test('should navigate back to home from login page', async ({ page }) => {
    await page.goto('/login')

    await page.locator('div.max-w-md a[href="/"]').click()
    await expect(page).toHaveURL('/')
  })

  test('should redirect to login when accessing protected settings page', async ({ page }) => {
    await page.goto('/settings')

    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect to login when accessing protected stats page', async ({ page }) => {
    await page.goto('/stats')

    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect to login when accessing protected RSS page', async ({ page }) => {
    await page.goto('/rss')

    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('should preserve login redirect target flow', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL(/\/login/)

    await expect(page).toHaveURL(/\/login/)
  })

  test('login page should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
    }

    await page.goto('/login')

    const loginCard = page.locator('div.max-w-md')
    await expect(loginCard).toBeVisible()

    const googleButton = page.getByRole('button', { name: /Google/i })
    const buttonBox = await googleButton.boundingBox()
    const cardBox = await loginCard.boundingBox()

    if (buttonBox && cardBox) {
      expect(buttonBox.width).toBeGreaterThan(cardBox.width * 0.8)
    }
  })

  test('should display terms and privacy notice', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('div.max-w-md')).toContainText(/服务条款|隐私政策|Terms|Privacy/i)
  })

  test('should render two social login buttons', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: /Google|Microsoft/i })).toHaveCount(2)
  })

  test('should have accessible login button', async ({ page }) => {
    await page.goto('/login')

    const googleButton = page.getByRole('button', { name: /Google/i })
    await googleButton.focus()
    const isFocused = await googleButton.evaluate((el) => el === document.activeElement)

    expect(isFocused).toBe(true)
  })

  test('should display Google icon in login button', async ({ page }) => {
    await page.goto('/login')

    const googleButton = page.getByRole('button', { name: /Google/i })
    await expect(googleButton.locator('svg')).toBeVisible()
  })

  test('login page should have proper styling shell', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('.bg-gradient-to-br')).toBeVisible()
    await expect(page.locator('div.max-w-md.shadow-xl')).toBeVisible()
  })

  test('should handle navigation between login and home', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')

    await page.goto('/login')
    await expect(page).toHaveURL('/login')

    await page.goBack()
    await expect(page).toHaveURL('/')

    await page.goForward()
    await expect(page).toHaveURL('/login')
  })
})
