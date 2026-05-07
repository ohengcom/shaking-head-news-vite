import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
const mockLogError = vi.fn()
const ORIGINAL_ENV = { ...process.env }

vi.mock('@/lib/utils/error-handler', () => ({
  logError: mockLogError,
}))

describe('daily news upstream logging', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' }
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('deduplicates AI news upstream warnings in non-production', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })

    const { fetchAiNews } = await import('@/lib/api/daily-news')

    await expect(fetchAiNews()).resolves.toBeNull()
    await expect(fetchAiNews()).resolves.toBeNull()

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('using empty AI news fallback')
    expect(mockLogError).not.toHaveBeenCalled()
  })

  it('keeps unexpected errors on the structured logging path', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockFetch.mockRejectedValue(new Error('unexpected failure'))

    const { fetchAiNews } = await import('@/lib/api/daily-news')

    await expect(fetchAiNews()).resolves.toBeNull()

    expect(warnSpy).not.toHaveBeenCalled()
    expect(mockLogError).toHaveBeenCalledTimes(1)
    expect(mockLogError.mock.calls[0]?.[1]).toMatchObject({
      action: 'fetchAiNews',
    })
  })
})
