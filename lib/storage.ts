interface KVNamespaceLike {
  get(key: string, type?: 'text'): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface CloudflareWorkersModule {
  env?: {
    APP_SETTINGS_KV?: KVNamespaceLike
  }
}

interface LegacyRateLimitStorageLike {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  ttl(key: string): Promise<number>
}

interface StoredEnvelope<T> {
  value: T
  expiry?: number
}

interface RecentWriteCacheEntry {
  envelope: StoredEnvelope<unknown>
  cachedAt: number
}

const RECENT_WRITE_CACHE_WINDOW_MS = 2 * 60 * 1000

let kvNamespaceCache: KVNamespaceLike | undefined
let workersEnvLookupAttempted = false
const recentWriteCache = new Map<string, RecentWriteCacheEntry>()

function getGlobalKVNamespace(): KVNamespaceLike | null {
  return (globalThis as { APP_SETTINGS_KV?: KVNamespaceLike }).APP_SETTINGS_KV ?? null
}

function cacheRecentWrite<T>(key: string, envelope: StoredEnvelope<T>): void {
  recentWriteCache.set(key, {
    envelope: envelope as StoredEnvelope<unknown>,
    cachedAt: Date.now(),
  })
}

function deleteRecentWrite(key: string): void {
  recentWriteCache.delete(key)
}

function getRecentWrite<T>(key: string): StoredEnvelope<T> | null {
  const cached = recentWriteCache.get(key)
  if (!cached) {
    return null
  }

  if (Date.now() - cached.cachedAt > RECENT_WRITE_CACHE_WINDOW_MS) {
    recentWriteCache.delete(key)
    return null
  }

  const envelope = cached.envelope as StoredEnvelope<T>
  if (envelope.expiry && Date.now() > envelope.expiry) {
    recentWriteCache.delete(key)
    return null
  }

  return envelope
}

async function getKVNamespace(): Promise<KVNamespaceLike | null> {
  const globalKV = getGlobalKVNamespace()
  if (globalKV) {
    kvNamespaceCache = globalKV
    return kvNamespaceCache
  }

  if (kvNamespaceCache) {
    return kvNamespaceCache
  }

  if (!workersEnvLookupAttempted) {
    workersEnvLookupAttempted = true
    try {
      const workersModuleId = 'cloudflare:workers'
      const cloudflareModule = (await import(
        /* @vite-ignore */ workersModuleId
      )) as CloudflareWorkersModule

      if (cloudflareModule?.env?.APP_SETTINGS_KV) {
        kvNamespaceCache = cloudflareModule.env.APP_SETTINGS_KV
        return kvNamespaceCache
      }
    } catch {
      // Ignore import failures in non-Cloudflare environments.
    }
  }

  const lateGlobalKV = getGlobalKVNamespace()
  if (lateGlobalKV) {
    kvNamespaceCache = lateGlobalKV
    return kvNamespaceCache
  }

  return null
}

function parseEnvelope<T>(raw: string): StoredEnvelope<T> | null {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
      const envelope = parsed as StoredEnvelope<T>
      return envelope
    }

    return { value: parsed as T }
  } catch {
    return null
  }
}

async function readKVEnvelope<T>(
  kv: KVNamespaceLike,
  key: string
): Promise<StoredEnvelope<T> | null> {
  const raw = await kv.get(key, 'text')
  if (!raw) {
    return null
  }

  const envelope = parseEnvelope<T>(raw)
  if (!envelope) {
    return null
  }

  if (envelope.expiry && Date.now() > envelope.expiry) {
    await kv.delete(key)
    return null
  }

  return envelope
}

async function writeKVValue<T>(
  kv: KVNamespaceLike,
  key: string,
  value: T,
  expirationSeconds?: number
): Promise<StoredEnvelope<T>> {
  const expiry =
    typeof expirationSeconds === 'number' && expirationSeconds > 0
      ? Date.now() + expirationSeconds * 1000
      : undefined

  const payload: StoredEnvelope<T> = {
    value,
    ...(expiry ? { expiry } : {}),
  }

  if (typeof expirationSeconds === 'number' && expirationSeconds > 0) {
    await kv.put(key, JSON.stringify(payload), { expirationTtl: expirationSeconds })
    return payload
  }

  await kv.put(key, JSON.stringify(payload))
  return payload
}

// Kept for backward compatibility with existing rate-limit branch logic.
export const storage: LegacyRateLimitStorageLike | null = null

export async function getStorageItem<T>(key: string): Promise<T | null> {
  try {
    const recent = getRecentWrite<T>(key)
    if (recent) {
      return recent.value
    }

    const kv = await getKVNamespace()
    if (!kv) {
      throw new Error('APP_SETTINGS_KV is not available')
    }
    const envelope = await readKVEnvelope<T>(kv, key)
    return envelope ? envelope.value : null
  } catch (error) {
    console.error(`Failed to get storage item: ${key}`, error)
    return null
  }
}

export async function setStorageItem<T>(
  key: string,
  value: T,
  expirationSeconds?: number
): Promise<void> {
  try {
    const kv = await getKVNamespace()
    if (!kv) {
      throw new Error('APP_SETTINGS_KV is not available')
    }
    const envelope = await writeKVValue(kv, key, value, expirationSeconds)
    cacheRecentWrite(key, envelope)
  } catch (error) {
    console.error(`Failed to set storage item: ${key}`, error)
    throw error
  }
}

export async function deleteStorageItem(key: string): Promise<void> {
  try {
    const kv = await getKVNamespace()
    if (!kv) {
      throw new Error('APP_SETTINGS_KV is not available')
    }
    await kv.delete(key)
    deleteRecentWrite(key)
  } catch (error) {
    console.error(`Failed to delete storage item: ${key}`, error)
    throw error
  }
}

export async function getMultipleStorageItems(keys: string[]): Promise<unknown[]> {
  try {
    const kv = await getKVNamespace()
    if (!kv) {
      throw new Error('APP_SETTINGS_KV is not available')
    }
    const values = await Promise.all(
      keys.map(async (key) => {
        const recent = getRecentWrite<unknown>(key)
        if (recent) {
          return recent.value
        }

        const envelope = await readKVEnvelope<unknown>(kv, key)
        return envelope ? envelope.value : null
      })
    )
    return values
  } catch (error) {
    console.error('Failed to get multiple storage items', error)
    return keys.map(() => null)
  }
}

export async function getTTL(key: string): Promise<number> {
  try {
    const recent = getRecentWrite<unknown>(key)
    if (recent?.expiry) {
      const remaining = Math.floor((recent.expiry - Date.now()) / 1000)
      return remaining > 0 ? remaining : -2
    }

    const kv = await getKVNamespace()
    if (!kv) {
      throw new Error('APP_SETTINGS_KV is not available')
    }
    const envelope = await readKVEnvelope<unknown>(kv, key)
    if (!envelope?.expiry) {
      return -1
    }

    const remaining = Math.floor((envelope.expiry - Date.now()) / 1000)
    return remaining > 0 ? remaining : -2
  } catch (error) {
    console.error(`Failed to get TTL for key: ${key}`, error)
    return -1
  }
}

export async function setStorageItemWithOptions<T>(
  key: string,
  value: T,
  options?: { ex?: number; keepTtl?: boolean }
): Promise<void> {
  try {
    const kv = await getKVNamespace()
    if (!kv) {
      throw new Error('APP_SETTINGS_KV is not available')
    }
    if (options?.keepTtl) {
      const existing = await readKVEnvelope<unknown>(kv, key)
      const remaining = existing?.expiry
        ? Math.floor((existing.expiry - Date.now()) / 1000)
        : undefined
      const expirationSeconds = remaining && remaining > 0 ? remaining : undefined
      const envelope = await writeKVValue(kv, key, value, expirationSeconds)
      cacheRecentWrite(key, envelope)
      return
    }
    if (options?.ex) {
      const envelope = await writeKVValue(kv, key, value, options.ex)
      cacheRecentWrite(key, envelope)
      return
    }
    const envelope = await writeKVValue(kv, key, value)
    cacheRecentWrite(key, envelope)
  } catch (error) {
    console.error(`Failed to set storage item: ${key}`, error)
    throw error
  }
}

export const StorageKeys = {
  userSettings: (userId: string) => `user:${userId}:settings`,
  userStats: (userId: string, date: string) => `user:${userId}:stats:${date}`,
  userRSSSources: (userId: string) => `user:${userId}:rss-sources`,
  rateLimit: (identifier: string) => `rate-limit:${identifier}`,
}
