import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { runWithRequestContext } from '@/lib/server/request-context'
import { deleteStorageItem, getStorageItem, setStorageItem } from '@/lib/storage'

describe('storage in Workers runtime', () => {
  it('uses the request context env binding for KV access', async () => {
    const key = `worker-test:${crypto.randomUUID()}`

    await runWithRequestContext(
      {
        request: new Request('https://example.test/'),
        env,
      },
      async () => {
        await setStorageItem(key, { status: 'ok' }, 60)

        await expect(getStorageItem<{ status: string }>(key)).resolves.toEqual({
          status: 'ok',
        })

        await deleteStorageItem(key)
        await expect(getStorageItem(key)).resolves.toBeNull()
      }
    )
  })
})
