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

let kvNamespaceCache: KVNamespaceLike | null | undefined

async function getKVNamespace(): Promise<KVNamespaceLike | null> {
  if (kvNamespaceCache !== undefined) {
    return kvNamespaceCache
  }

  const globalKV = (globalThis as { APP_SETTINGS_KV?: KVNamespaceLike }).APP_SETTINGS_KV
  if (globalKV) {
    kvNamespaceCache = globalKV
    return kvNamespaceCache
  }

  try {
    const workersModuleId = 'cloudflare:workers'
    const cloudflareModule = (await import(
      /* @vite-ignore */ workersModuleId
    )) as CloudflareWorkersModule
    kvNamespaceCache = cloudflareModule?.env?.APP_SETTINGS_KV ?? null
  } catch {
    kvNamespaceCache = null
  }

  return kvNamespaceCache
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
): Promise<void> {
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
    return
  }

  await kv.put(key, JSON.stringify(payload))
}

// Kept for backward compatibility with existing rate-limit branch logic.
export const storage: LegacyRateLimitStorageLike | null = null

export async function getStorageItem<T>(key: string): Promise<T | null> {
  try {
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
    await writeKVValue(kv, key, value, expirationSeconds)
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
      await writeKVValue(kv, key, value, expirationSeconds)
      return
    }
    if (options?.ex) {
      await writeKVValue(kv, key, value, options.ex)
      return
    }
    await writeKVValue(kv, key, value)
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
