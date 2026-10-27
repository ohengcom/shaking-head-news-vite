import { getCurrentEnv } from '@/lib/server/request-context'

/**
 * RPC surface of the `UserCoordination` Durable Object.
 *
 * The stub is typed structurally instead of via the class type: the class
 * extends `DurableObject` from the `cloudflare:workers` module while global
 * `DurableObjectNamespace` comes from `@cloudflare/workers-types`, and mixing
 * the two collapses the RPC surface to `never`. The methods below are the
 * contract the object implements in `worker/user-coordination.ts`.
 */
export interface CoordinationStubLike {
  read(key: string): Promise<{ value: unknown; version: number }>
  write(
    key: string,
    expectedVersion: number,
    value: unknown,
    expirationSeconds?: number
  ): Promise<{ written: boolean; version: number }>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  getAndDelete(key: string): Promise<string | null>
  increment(key: string, ttl: number): Promise<number>
  rateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<{ success: boolean; remaining: number; reset: number }>
}

const MAX_UPDATE_ATTEMPTS = 5

function getNamespace(): DurableObjectNamespace | null {
  return (getCurrentEnv()?.USER_COORDINATION as unknown as DurableObjectNamespace) ?? null
}

function getStub(name: string): CoordinationStubLike | null {
  const namespace = getNamespace()
  if (!namespace) return null
  return namespace.getByName(name) as unknown as CoordinationStubLike
}

function sanitizeObjectName(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 256) || 'default'
}

export function hasCoordination(): boolean {
  return getNamespace() !== null
}

export async function coordinatedRead(
  key: string
): Promise<{ value: unknown; version: number } | null> {
  const stub = getStub(sanitizeObjectName(key))
  if (!stub) return null
  return stub.read(key)
}

export async function coordinatedWrite(
  key: string,
  expectedVersion: number,
  value: unknown,
  expirationSeconds?: number
): Promise<{ written: boolean; version: number } | null> {
  const stub = getStub(sanitizeObjectName(key))
  if (!stub) return null
  return stub.write(key, expectedVersion, value, expirationSeconds)
}

export interface CoordinatedUpdateResult<T> {
  supported: boolean
  updated: boolean
  value: T | null
  /** True when every retry lost the version race (not a no-op). */
  conflicted?: boolean
}

export async function coordinatedUpdate<T>(
  key: string,
  updater: (current: T | null) => T | null,
  options?: { expirationSeconds?: number; attempts?: number }
): Promise<CoordinatedUpdateResult<T>> {
  const stub = getStub(sanitizeObjectName(key))
  if (!stub) return { supported: false, updated: false, value: null }

  const attempts = options?.attempts ?? MAX_UPDATE_ATTEMPTS

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = await stub.read(key)
    const next = updater(current.value === null ? null : (current.value as T))
    if (next === null) return { supported: true, updated: false, value: current.value as T | null }

    const result = await stub.write(key, current.version, next, options?.expirationSeconds)
    if (result.written) return { supported: true, updated: true, value: next }
  }

  return { supported: true, updated: false, value: null, conflicted: true }
}

export async function coordinatedRateLimit(
  identifier: string,
  limit: number,
  window: number
): Promise<{ success: boolean; remaining: number; reset: number } | null> {
  const stub = getStub(sanitizeObjectName(identifier))
  if (!stub) return null
  return stub.rateLimit(identifier, limit, window)
}

export function createCoordinatedAuthStorage(prefix: string) {
  const nameFor = (key: string) => sanitizeObjectName(`${prefix}${key}`)

  return {
    get: async (key: string) => {
      const stub = getStub(nameFor(key))
      if (!stub) return null
      return stub.get(`${prefix}${key}`)
    },
    set: async (key: string, value: string, ttl?: number) => {
      const stub = getStub(nameFor(key))
      if (!stub) throw new Error('USER_COORDINATION is not available')
      await stub.set(`${prefix}${key}`, value, ttl)
    },
    delete: async (key: string) => {
      const stub = getStub(nameFor(key))
      if (!stub) throw new Error('USER_COORDINATION is not available')
      await stub.delete(`${prefix}${key}`)
    },
    getAndDelete: async (key: string) => {
      const stub = getStub(nameFor(key))
      if (!stub) return null
      return stub.getAndDelete(`${prefix}${key}`)
    },
    increment: async (key: string, ttl: number) => {
      const stub = getStub(nameFor(key))
      if (!stub) throw new Error('USER_COORDINATION is not available')
      return stub.increment(`${prefix}${key}`, ttl)
    },
  }
}
