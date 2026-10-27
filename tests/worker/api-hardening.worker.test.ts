import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

const ORIGIN = 'https://example.com'

describe('worker API hardening', () => {
  it('rejects cross-site state-changing requests to private APIs', async () => {
    const response = await SELF.fetch(`${ORIGIN}/api/settings`, {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'update', payload: { theme: 'dark' } }),
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ success: false })
  })

  it('marks private API responses as no-store', async () => {
    const response = await SELF.fetch(`${ORIGIN}/api/settings`, {
      headers: { accept: 'application/json' },
    })

    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('rejects oversized JSON bodies', async () => {
    const oversized = JSON.stringify({
      action: 'update',
      payload: { theme: 'x'.repeat(70 * 1024) },
    })
    const response = await SELF.fetch(`${ORIGIN}/api/settings`, {
      method: 'POST',
      headers: {
        origin: ORIGIN,
        'content-type': 'application/json',
      },
      body: oversized,
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Request body is too large',
    })
  })

  it('never returns 500 when the home feed is served from cache', { timeout: 30_000 }, async () => {
    // The first request either succeeds (and is cached) or degrades (and is not
    // cached). Either way the second request must not fail while rewriting
    // cache headers — mutating a Cache API response used to throw
    // "Can't modify immutable headers" and surface as a 500 on production.
    const first = await SELF.fetch(`${ORIGIN}/api/feed/home?locale=en`)
    const second = await SELF.fetch(`${ORIGIN}/api/feed/home?locale=en`)

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const body = (await second.json()) as { success: boolean; error?: string }
    expect(typeof body.success).toBe('boolean')
    expect(body.error ?? '').not.toContain('immutable headers')

    // A degraded payload must stay uncacheable.
    if (!body.success) {
      expect(second.headers.get('cache-control')).toBe('no-store')
    } else {
      expect(second.headers.get('cache-control')).toContain('max-age')
    }
  })
})
