import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppWorkerEnv } from '@/lib/server/env'

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

async function runWithKV<T>(kv: MockKVNamespaceLike, callback: () => Promise<T>): Promise<T> {
  const { runWithRequestContext } = await import('@/lib/server/request-context')

  return runWithRequestContext(
    {
      request: new Request('https://example.test/'),
      env: {
        APP_SETTINGS_KV: kv as AppWorkerEnv['APP_SETTINGS_KV'],
      },
    },
    callback
  )
}

describe('storage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should recover when a request context with KV appears after initial miss', async () => {
    const storage = await import('@/lib/storage')

    const firstRead = await storage.getStorageItem('user:test:settings')
    expect(firstRead).toBeNull()

    const kv = createMockKV()
    const value = await runWithKV(kv, async () => {
      await storage.setStorageItem('user:test:settings', { theme: 'dark' })
      return storage.getStorageItem<{ theme: string }>('user:test:settings')
    })

    expect(value?.theme).toBe('dark')
  })

  it('should return recent write before KV propagation', async () => {
    const staleKV = createMockKV({
      'user:test:settings': JSON.stringify({ value: { theme: 'light' } }),
    })

    staleKV.put = vi.fn(async () => {
      // Simulate eventual consistency: keep serving stale data for a while.
    })

    const storage = await import('@/lib/storage')

    const value = await runWithKV(staleKV, async () => {
      await storage.setStorageItem('user:test:settings', { theme: 'dark' })
      return storage.getStorageItem<{ theme: string }>('user:test:settings')
    })

    expect(value?.theme).toBe('dark')
  })
})
