import { DurableObject } from 'cloudflare:workers'

interface StoredRow extends Record<string, SqlStorageValue> {
  value: string
  expiry: number | null
  version: number
}

export interface CoordinatedReadResult {
  value: unknown
  version: number
}

export interface CoordinatedWriteResult {
  written: boolean
  version: number
}

export interface CoordinatedRateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

interface CoordinationEnv {
  APP_SETTINGS_KV: KVNamespace
}

function parseLegacyValue(raw: string | null): unknown {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
      return (parsed as { value: unknown }).value
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Per-user/per-key coordination backed by Durable Object SQLite storage.
 * Existing KV application data is imported lazily on its first coordinated read.
 */
export class UserCoordination extends DurableObject<CoordinationEnv> {
  constructor(ctx: DurableObjectState, env: CoordinationEnv) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS values_store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expiry INTEGER,
          version INTEGER NOT NULL DEFAULT 0
        )
      `)
    })
  }

  private getRow(key: string): StoredRow | null {
    const row = this.ctx.storage.sql
      .exec<StoredRow>('SELECT value, expiry, version FROM values_store WHERE key = ?', key)
      .toArray()[0]
    if (!row) return null
    if (row.expiry !== null && row.expiry <= Date.now()) {
      this.ctx.storage.sql.exec('DELETE FROM values_store WHERE key = ?', key)
      return null
    }
    return row
  }

  private putRow(key: string, value: unknown, expiry: number | null, version: number): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO values_store (key, value, expiry, version) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, expiry = excluded.expiry, version = excluded.version`,
      key,
      JSON.stringify(value),
      expiry,
      version
    )
  }

  async read(key: string): Promise<CoordinatedReadResult> {
    const existing = this.getRow(key)
    if (existing) {
      return { value: JSON.parse(existing.value) as unknown, version: existing.version }
    }

    const legacyValue = parseLegacyValue(await this.env.APP_SETTINGS_KV.get(key, 'text'))
    if (legacyValue !== null) this.putRow(key, legacyValue, null, 0)
    return { value: legacyValue, version: 0 }
  }

  write(
    key: string,
    expectedVersion: number,
    value: unknown,
    expirationSeconds?: number
  ): CoordinatedWriteResult {
    const existing = this.getRow(key)
    const currentVersion = existing?.version ?? 0
    if (currentVersion !== expectedVersion) return { written: false, version: currentVersion }

    const expiry = expirationSeconds ? Date.now() + expirationSeconds * 1000 : null
    const version = currentVersion + 1
    this.putRow(key, value, expiry, version)
    return { written: true, version }
  }

  get(key: string): string | null {
    return this.getRow(key)?.value ?? null
  }

  set(key: string, value: string, ttl?: number): void {
    const version = (this.getRow(key)?.version ?? 0) + 1
    this.putRow(key, value, ttl ? Date.now() + ttl * 1000 : null, version)
  }

  delete(key: string): void {
    this.ctx.storage.sql.exec('DELETE FROM values_store WHERE key = ?', key)
  }

  getAndDelete(key: string): string | null {
    const value = this.get(key)
    this.delete(key)
    return value
  }

  increment(key: string, ttl: number): number {
    if (!Number.isInteger(ttl) || ttl <= 0) throw new TypeError('TTL must be a positive integer')
    const existing = this.getRow(key)
    const next = Number.parseInt(existing?.value ?? '0', 10) + 1
    this.putRow(
      key,
      String(next),
      existing?.expiry ?? Date.now() + ttl * 1000,
      (existing?.version ?? 0) + 1
    )
    return next
  }

  rateLimit(key: string, limit: number, window: number): CoordinatedRateLimitResult {
    const now = Date.now()
    const existing = this.getRow(key)
    const count = Number.parseInt(existing?.value ?? '0', 10)
    const reset = existing?.expiry ?? now + window * 1000
    if (count >= limit) return { success: false, remaining: 0, reset }

    const next = count + 1
    this.putRow(key, String(next), reset, (existing?.version ?? 0) + 1)
    return { success: true, remaining: limit - next, reset }
  }
}
