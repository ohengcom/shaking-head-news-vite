import type { UserCoordination } from '@/worker/user-coordination'

export type KVNamespaceLike = CloudflareEnv['APP_SETTINGS_KV']
export type AssetsBindingLike = CloudflareEnv['ASSETS']
export type CoordinationNamespaceLike = DurableObjectNamespace<UserCoordination>

export interface AppWorkerEnv extends Partial<CloudflareEnv> {
  APP_SETTINGS_KV: KVNamespaceLike
  ASSETS?: AssetsBindingLike
  USER_COORDINATION?: CoordinationNamespaceLike
}
