export type KVNamespaceLike = CloudflareEnv['APP_SETTINGS_KV']
export type AssetsBindingLike = CloudflareEnv['ASSETS']

export interface AppWorkerEnv extends Partial<CloudflareEnv> {
  APP_SETTINGS_KV: KVNamespaceLike
  ASSETS?: AssetsBindingLike
}
