/**
 * Rate Limiting Utility
 *
 * Implements best-effort rate limiting on top of the shared storage layer.
 *
 * In production the app uses Cloudflare KV-backed helpers from `lib/storage.ts`.
 * This is sufficient for low-volume protections, but it is not a strict
 * strongly-consistent counter implementation.
 */

import { getStorageItem, setStorageItemWithOptions, getTTL } from './storage'

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed within the window
   * @default 10
   */
  limit?: number

  /**
   * Time window in seconds
   * @default 60
   */
  window?: number

  /**
   * Prefix for the rate limit key
   * @default 'rate-limit'
   */
  prefix?: string
}

/**
 * Rate limit a specific identifier (e.g., user ID, IP address)
 *
 * @param identifier - Unique identifier for the rate limit (user ID, IP, etc.)
 * @param options - Rate limit configuration options
 * @returns Rate limit result with success status and remaining requests
 *
 * @example
 * ```typescript
 * const result = await rateLimit('user-123', { limit: 10, window: 60 })
 * if (!result.success) {
 *   throw new Error('Rate limit exceeded')
 * }
 * ```
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { limit = 10, window = 60, prefix = 'rate-limit' } = options

  const key = `${prefix}:${identifier}`

  try {
    // KV-backed read-modify-write, acceptable for current low-volume usage.
    const current = await getStorageItem<number>(key)
    const count = current || 0

    if (count >= limit) {
      const ttl = await getTTL(key)
      return {
        success: false,
        remaining: 0,
        reset: Date.now() + (ttl > 0 ? ttl * 1000 : window * 1000),
      }
    }

    const newCount = count + 1
    if (count === 0) {
      await setStorageItemWithOptions(key, newCount, { ex: window })
    } else {
      await setStorageItemWithOptions(key, newCount, { keepTtl: true })
    }

    return {
      success: true,
      remaining: limit - newCount,
      reset: Date.now() + window * 1000,
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // On error, allow the request but log the issue
    return {
      success: true,
      remaining: limit,
      reset: Date.now() + window * 1000,
    }
  }
}

/**
 * Rate limit for API routes with different tiers
 */
export const RateLimitTiers = {
  /**
   * Strict rate limit for sensitive operations (e.g., login, password reset)
   * 50 requests per 15 minutes
   */
  STRICT: { limit: 50, window: 900 },

  /**
   * Standard rate limit for authenticated operations
   * 600 requests per minute
   */
  STANDARD: { limit: 600, window: 60 },

  /**
   * Relaxed rate limit for read operations
   * 1000 requests per minute
   */
  RELAXED: { limit: 1000, window: 60 },

  /**
   * Very relaxed rate limit for public endpoints
   * 3000 requests per 5 minutes
   */
  PUBLIC: { limit: 3000, window: 300 },
} as const

const MEMORY_BUCKET_MAX_KEYS = 10_000
const memoryBuckets = new Map<string, number[]>()

/**
 * Reset in-memory rate limit state (test helper).
 */
export function resetMemoryRateLimits(): void {
  memoryBuckets.clear()
}

/**
 * In-memory sliding-window rate limiter.
 *
 * Approximate and per-isolate by design: it protects high-frequency,
 * low-risk paths (rotation reporting, stats reads) from spam without
 * consuming the tiny free-tier KV write quota. Every KV-backed rate limit
 * check costs one KV write, so the rotation beacon alone could exhaust the
 * 1,000 writes/day free quota. For strict cross-request limits, keep using
 * the KV-backed helpers above.
 */
export function memoryRateLimit(
  identifier: string,
  options: { limit: number; window: number }
): RateLimitResult {
  const { limit, window } = options
  const windowMs = window * 1000
  const now = Date.now()
  const cutoff = now - windowMs

  const timestamps = (memoryBuckets.get(identifier) || []).filter((ts) => ts > cutoff)

  if (timestamps.length >= limit) {
    memoryBuckets.set(identifier, timestamps)
    return {
      success: false,
      remaining: 0,
      reset: timestamps[0] + windowMs,
    }
  }

  timestamps.push(now)
  memoryBuckets.set(identifier, timestamps)

  if (memoryBuckets.size > MEMORY_BUCKET_MAX_KEYS) {
    for (const [key, bucket] of memoryBuckets) {
      if (bucket.length === 0 || bucket[bucket.length - 1] <= cutoff) {
        memoryBuckets.delete(key)
      }
    }
  }

  return {
    success: true,
    remaining: limit - timestamps.length,
    reset: now + windowMs,
  }
}

/**
 * Rate limit by user ID
 * Useful for protecting authenticated endpoints
 */
export async function rateLimitByUser(
  userId: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}`, {
    ...RateLimitTiers.STANDARD,
    ...options,
    prefix: 'rate-limit-user',
  })
}

/**
 * Rate limit by action type
 * Useful for protecting specific operations
 */
export async function rateLimitByAction(
  userId: string,
  action: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}:action:${action}`, {
    ...RateLimitTiers.STANDARD,
    ...options,
    prefix: 'rate-limit-action',
  })
}
