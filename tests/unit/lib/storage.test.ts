import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface MockKVNamespaceLike {
  get(key: string, type?: 'text'): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

function createMockKV(initialData?: Record<string, string>): MockKVNamespaceLike {
  const store = new Map<string, string>(Object.entries(initialData ?? {}))

  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async put(key, value) {
      store.set(key, value)
    },
    async delete(key) {
      store.delete(key)
    },
  }
}

describe('storage', () => {
  beforeEach(() => {
    vi.resetModules()
    delete (globalThis as { APP_SETTINGS_KV?: MockKVNamespaceLike }).APP_SETTINGS_KV
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    delete (globalThis as { APP_SETTINGS_KV?: MockKVNamespaceLike }).APP_SETTINGS_KV
    vi.restoreAllMocks()
  })

  it('should recover when KV binding appears after initial miss', async () => {
    const storage = await import('@/lib/storage')

    const firstRead = await storage.getStorageItem('user:test:settings')
    expect(firstRead).toBeNull()
    ;(globalThis as { APP_SETTINGS_KV?: MockKVNamespaceLike }).APP_SETTINGS_KV = createMockKV()

    await storage.setStorageItem('user:test:settings', { theme: 'dark' })
    const value = await storage.getStorageItem<{ theme: string }>('user:test:settings')

    expect(value?.theme).toBe('dark')
  })

  it('should return recent write before KV propagation', async () => {
    const staleKV = createMockKV({
      'user:test:settings': JSON.stringify({ value: { theme: 'light' } }),
    })

    staleKV.put = vi.fn(async () => {
      // Simulate eventual consistency: keep serving stale data for a while.
    })
    ;(globalThis as { APP_SETTINGS_KV?: MockKVNamespaceLike }).APP_SETTINGS_KV = staleKV

    const storage = await import('@/lib/storage')

    await storage.setStorageItem('user:test:settings', { theme: 'dark' })
    const value = await storage.getStorageItem<{ theme: string }>('user:test:settings')

    expect(value?.theme).toBe('dark')
  })
})
