/**
 * Authoritative accessor for per-user documents (settings, RSS sources, daily
 * stats).
 *
 * These documents used to be written with an unversioned KV
 * read-modify-write, so two concurrent writers (multiple tabs, a settings save
 * racing a stats upload) could silently drop each other's changes. KV also has
 * no atomic increment, which made the rate limiter miscount.
 *
 * When the `USER_COORDINATION` Durable Object binding is available, every read
 * and write for these keys goes through the per-key object, which serialises
 * writes and checks an expected version. When it is not available (unit tests,
 * preview environments without the binding) the KV helpers are used as a
 * best-effort fallback so the app still works.
 *
 * The Durable Object lazily imports existing KV data on the first read, and
 * every successful DO write is mirrored back to KV so a future read that falls
 * back to KV still sees current data.
 */
import { getStorageItem, getStorageItemStrict, setStorageItem } from '@/lib/storage'
import { getCurrentCtx } from '@/lib/server/request-context'
import { coordinatedRead, coordinatedUpdate, hasCoordination } from '@/lib/server/user-coordination'
import { APIError } from '@/lib/utils/error-handler'

export interface UpdateOptions {
  expirationSeconds?: number
}

function mirrorToKV<T>(key: string, value: T, expirationSeconds?: number): void {
  const write = (
    expirationSeconds ? setStorageItem(key, value, expirationSeconds) : setStorageItem(key, value)
  ).catch((error) => {
    console.error(`[user-doc] Failed to mirror ${key} into KV`, error)
  })

  const ctx = getCurrentCtx()
  if (ctx) {
    ctx.waitUntil(write)
    return
  }

  void write
}

/**
 * Read a user document. Returns null when nothing has been stored yet.
 */
export async function readUserDoc<T>(
  key: string,
  options: { strict?: boolean } = {}
): Promise<T | null> {
  if (hasCoordination()) {
    const result = await coordinatedRead(key)
    const value = result ? (result.value as T | null) : null
    if (value !== null) {
      return value
    }
  }

  return options.strict ? getStorageItemStrict<T>(key) : getStorageItem<T>(key)
}

/**
 * Read-modify-write a user document.
 *
 * `updater` receives the current value and returns the next value, or null when
 * the document should not change. When a strict store is in use, the updater
 * may be invoked more than once (optimistic retry), so it must not have side
 * effects.
 */
export async function updateUserDoc<T>(
  key: string,
  updater: (current: T | null) => T | null,
  options: UpdateOptions = {}
): Promise<{ updated: boolean; value: T | null }> {
  const result = await coordinatedUpdate<T>(key, updater, options)

  if (result.supported) {
    if (!result.updated) {
      // Either the updater returned null (no change) or every retry lost the
      // version race. Distinguish by re-reading instead of reporting a bogus
      // success to the caller.
      const current = await coordinatedRead(key)
      const value = current ? (current.value as T | null) : null
      if (value !== null && result.conflicted) {
        throw new APIError('The document was modified concurrently, please retry', 409, 'CONFLICT')
      }
      return { updated: false, value }
    }

    if (result.value !== null) {
      mirrorToKV(key, result.value, options.expirationSeconds)
    }

    return { updated: true, value: result.value }
  }

  // KV fallback: strict read so a transient failure cannot wipe stored data.
  const current = await getStorageItemStrict<T>(key)
  const next = updater(current)
  if (next === null) {
    return { updated: false, value: current }
  }

  await (options.expirationSeconds
    ? setStorageItem(key, next, options.expirationSeconds)
    : setStorageItem(key, next))
  return { updated: true, value: next }
}

/**
 * Read many user documents at once (used by date-range stats reads).
 */
export async function readUserDocs(keys: string[]): Promise<(unknown | null)[]> {
  return Promise.all(
    keys.map(async (key) => {
      try {
        return await readUserDoc<unknown>(key)
      } catch (error) {
        console.error(`[user-doc] Failed to read ${key}`, error)
        return null
      }
    })
  )
}
