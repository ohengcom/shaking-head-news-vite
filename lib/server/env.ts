export interface KVNamespaceLike {
  get(key: string, type?: 'text'): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export interface AssetsBindingLike {
  fetch(request: Request): Promise<Response>
}

export interface AppWorkerEnv {
  APP_SETTINGS_KV: KVNamespaceLike
  ASSETS?: AssetsBindingLike
}

declare global {
  var APP_SETTINGS_KV: KVNamespaceLike | undefined
  var __APP_ENV: AppWorkerEnv | undefined
}

export function setGlobalWorkerEnv(env: AppWorkerEnv) {
  globalThis.APP_SETTINGS_KV = env.APP_SETTINGS_KV
  globalThis.__APP_ENV = env
}

export function getGlobalWorkerEnv(): AppWorkerEnv | null {
  return globalThis.__APP_ENV ?? null
}
