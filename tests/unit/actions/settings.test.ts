import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getUserSettings, updateSettings, resetSettings } from '@/lib/actions/settings'
import { mockUserSettings } from '@/tests/utils/test-utils'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  getStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
  StorageKeys: {
    userSettings: (userId: string) => `user:${userId}:settings`,
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitByUser: vi.fn().mockResolvedValue({
    success: true,
    remaining: 10,
    reset: Date.now() + 60000,
  }),
  RateLimitTiers: {
    STANDARD: { limit: 30, window: 60 },
    STRICT: { limit: 5, window: 900 },
  },
}))

vi.mock('@/lib/utils/input-validation', () => ({
  sanitizeObject: vi.fn((obj) => obj),
}))

import { auth } from '@/lib/auth'
import { getStorageItem, setStorageItem } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { rateLimitByUser } from '@/lib/rate-limit'

describe('Settings Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ENABLE_SETTINGS_REVALIDATE = 'false'
    // Reset rateLimitByUser mock to return success by default
    vi.mocked(rateLimitByUser).mockResolvedValue({
      success: true,
      remaining: 10,
      reset: Date.now() + 60000,
    })
    // Suppress console.error for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getUserSettings', () => {
    it('should return default settings for unauthenticated users', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const settings = await getUserSettings()

      expect(settings.userId).toBe('')
      expect(settings.language).toBe('zh')
      expect(settings.theme).toBe('system')
      expect(settings.adsEnabled).toBe(true)
    })

    it('should return default settings when persistent storage is unavailable', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockResolvedValue(null)

      const settings = await getUserSettings()

      expect(settings.userId).toBe('test-user-id')
      expect(settings.language).toBe('zh')
      expect(settings.adsEnabled).toBe(true)
    })

    it('should return stored settings for authenticated users', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockResolvedValue(mockUserSettings)

      const settings = await getUserSettings()

      expect(settings).toEqual(mockUserSettings)
      expect(getStorageItem).toHaveBeenCalledWith('user:test-user-id:settings')
    })

    it('should merge defaults for legacy settings payloads', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      const legacySettings = { ...mockUserSettings }
      delete (legacySettings as Partial<typeof legacySettings>).adsEnabled
      vi.mocked(getStorageItem).mockResolvedValue(legacySettings)

      const settings = await getUserSettings()

      expect(settings.adsEnabled).toBe(true)
      expect(settings.language).toBe(mockUserSettings.language)
    })

    it('should return default settings when no stored settings exist', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockResolvedValue(null)

      const settings = await getUserSettings()

      expect(settings.userId).toBe('test-user-id')
      expect(settings.language).toBe('zh')
    })

    it('should migrate legacy provider-id settings to stable user id', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'test@example.com',
          providerUserId: 'legacy-provider-id',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockUserSettings, userId: 'legacy-provider-id' })
      vi.mocked(setStorageItem).mockResolvedValue(undefined)

      const settings = await getUserSettings()

      expect(getStorageItem).toHaveBeenNthCalledWith(1, 'user:test@example.com:settings')
      expect(getStorageItem).toHaveBeenNthCalledWith(2, 'user:legacy-provider-id:settings')
      expect(setStorageItem).toHaveBeenCalledWith(
        'user:test@example.com:settings',
        expect.objectContaining({ userId: 'test@example.com' })
      )
      expect(settings.userId).toBe('test@example.com')
    })

    it('should migrate legacy mixed-case email key to normalized user id', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'test@example.com',
          providerUserId: 'legacy-provider-id',
          name: 'Test User',
          email: 'Test@Example.com',
        },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockUserSettings, userId: 'Test@Example.com' })
      vi.mocked(setStorageItem).mockResolvedValue(undefined)

      const settings = await getUserSettings()

      expect(getStorageItem).toHaveBeenNthCalledWith(1, 'user:test@example.com:settings')
      expect(getStorageItem).toHaveBeenNthCalledWith(2, 'user:legacy-provider-id:settings')
      expect(getStorageItem).toHaveBeenNthCalledWith(3, 'user:Test@Example.com:settings')
      expect(setStorageItem).toHaveBeenCalledWith(
        'user:test@example.com:settings',
        expect.objectContaining({ userId: 'test@example.com' })
      )
      expect(settings.userId).toBe('test@example.com')
    })

    it('should return default settings on storage error', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockRejectedValue(new Error('Storage error'))

      const settings = await getUserSettings()

      expect(settings.userId).toBe('test-user-id')
      expect(settings.language).toBe('zh')
    })
  })

  describe('updateSettings', () => {
    it('should return error for unauthenticated users', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const result = await updateSettings({ language: 'en' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('sign in')
    })

    it('should update settings for authenticated users', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockResolvedValue(mockUserSettings)
      vi.mocked(setStorageItem).mockResolvedValue(undefined)

      const result = await updateSettings({ language: 'en' })

      expect(result.success).toBe(true)
      expect(result.settings?.language).toBe('en')
      expect(setStorageItem).toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should respect rate limits', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(rateLimitByUser).mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      const result = await updateSettings({ language: 'en' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Too many requests')
    })

    it('should preserve userId when updating settings', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockResolvedValue(mockUserSettings)
      vi.mocked(setStorageItem).mockResolvedValue(undefined)

      const result = await updateSettings({ userId: 'malicious-id', language: 'en' })

      expect(result.success).toBe(true)
      expect(result.settings?.userId).toBe('test-user-id')
    })

    it('should handle storage errors gracefully', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockResolvedValue(mockUserSettings)
      vi.mocked(setStorageItem).mockRejectedValue(new Error('Storage error'))

      const result = await updateSettings({ language: 'en' })

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should return success even when revalidatePath throws', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(getStorageItem).mockResolvedValue(mockUserSettings)
      vi.mocked(setStorageItem).mockResolvedValue(undefined)
      vi.mocked(revalidatePath).mockImplementation(() => {
        throw new Error('revalidate failed')
      })

      const result = await updateSettings({ language: 'en' })

      expect(result.success).toBe(true)
      expect(result.settings?.language).toBe('en')
    })
  })

  describe('resetSettings', () => {
    it('should return error for unauthenticated users', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const result = await resetSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('sign in')
    })

    it('should reset settings to defaults for authenticated users', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(setStorageItem).mockResolvedValue(undefined)

      const result = await resetSettings()

      expect(result.success).toBe(true)
      expect(result.settings?.language).toBe('zh')
      expect(result.settings?.theme).toBe('system')
      expect(setStorageItem).toHaveBeenCalled()
    })

    it('should respect rate limits', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(rateLimitByUser).mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      const result = await resetSettings()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Too many')
    })

    it('should return success even when revalidatePath throws', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
        expires: new Date().toISOString(),
      })
      vi.mocked(setStorageItem).mockResolvedValue(undefined)
      vi.mocked(revalidatePath).mockImplementation(() => {
        throw new Error('revalidate failed')
      })

      const result = await resetSettings()

      expect(result.success).toBe(true)
      expect(result.settings?.language).toBe('zh')
    })
  })
})
