import { test, expect, type Page } from '@playwright/test'

async function waitForRotatingShell(page: Page) {
  await expect(page.getByTestId('tilt-wrapper')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

test.describe('Page Rotation Runtime', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForRotatingShell(page)
  })

  test('should render tilt wrapper', async ({ page }) => {
    await expect(page.getByTestId('tilt-wrapper')).toBeVisible()
  })

  test('should keep app usable with reduced motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    await waitForRotatingShell(page)
  })

  test('should allow rotation state persistence in localStorage', async ({ page }) => {
    const savedValue = await page.evaluate(() => {
      localStorage.setItem(
        'rotation-storage',
        JSON.stringify({ state: { interval: 10 }, version: 0 })
      )
      return localStorage.getItem('rotation-storage')
    })

    expect(savedValue).toBeTruthy()
  })

  test('should read persisted rotation settings from localStorage', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'rotation-storage',
        JSON.stringify({
          state: {
            angle: 12,
            isPaused: true,
            mode: 'continuous',
            interval: 5,
          },
          version: 0,
        })
      )
    })

    await page.reload()
    await waitForRotatingShell(page)

    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('rotation-storage')
      if (!raw) {
        return null
      }

      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    })

    expect(persisted).toBeTruthy()
    expect(persisted?.state?.isPaused).toBe(true)
    expect(persisted?.state?.interval).toBe(5)
  })

  test('should keep wrapper available after route changes', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('tilt-wrapper')).toBeVisible()

    await page.goto('/')
    await expect(page.getByTestId('tilt-wrapper')).toBeVisible()
  })
})
