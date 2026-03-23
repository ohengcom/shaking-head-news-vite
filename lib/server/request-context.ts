import { AsyncLocalStorage } from 'node:async_hooks'
import type { AppWorkerEnv } from '@/lib/server/env'

interface RequestContextValue {
  request: Request
  env: AppWorkerEnv
}

const requestContextStorage = new AsyncLocalStorage<RequestContextValue>()

export function runWithRequestContext<T>(
  context: RequestContextValue,
  callback: () => Promise<T>
): Promise<T> {
  return requestContextStorage.run(context, callback)
}

export function getRequestContext(): RequestContextValue | null {
  return requestContextStorage.getStore() ?? null
}

export function getCurrentRequest(): Request | null {
  return getRequestContext()?.request ?? null
}
