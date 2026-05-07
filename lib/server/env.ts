export type KVNamespaceLike = CloudflareEnv['APP_SETTINGS_KV']
export type AssetsBindingLike = CloudflareEnv['ASSETS']

export interface AppWorkerEnv extends Partial<CloudflareEnv> {
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
