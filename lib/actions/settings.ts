import { auth } from '@/lib/auth'
import { StorageKeys } from '@/lib/storage'
import { readUserDoc, updateUserDoc } from '@/lib/server/user-doc'
import {
  UserSettingsSchema,
  UserSettingsInputSchema,
  defaultSettings,
  UserSettings,
} from '@/types/settings'
import { getEnvValue, isNonProductionRuntime } from '@/lib/config/runtime-env'
import {
  APIError,
  AuthError,
  RateLimitError,
  logError,
  validateOrThrow,
} from '@/lib/utils/error-handler'
import { rateLimitByUser, RateLimitTiers } from '@/lib/rate-limit'

function getLegacySettingsKeys(sessionUser: {
  id: string
  providerUserId?: string
  email?: string | null
}): string[] {
  const candidates = [sessionUser.providerUserId?.trim(), sessionUser.email?.trim()]
  const seen = new Set<string>()
  const keys: string[] = []

  for (const candidate of candidates) {
    if (!candidate || candidate === sessionUser.id || seen.has(candidate)) {
      continue
    }

    seen.add(candidate)
    keys.push(StorageKeys.userSettings(candidate))
  }

  return keys
}

/**
 * 获取用户设置
 * 如果用户未登录，返回默认设置
 * 如果用户已登录但没有保存的设置，返回带用户ID的默认设置
 */
export async function getUserSettings(): Promise<UserSettings> {
  const session = await auth()

  if (!session?.user?.id) {
    // 未登录用户返回默认设置（不含userId）
    return { ...defaultSettings, userId: '' }
  }

  try {
    const primaryKey = StorageKeys.userSettings(session.user.id)
    let settings = await readUserDoc<Partial<UserSettings>>(primaryKey)

    if (!settings) {
      const legacyKeys = getLegacySettingsKeys(session.user)

      for (const legacyKey of legacyKeys) {
        const legacySettings = await readUserDoc<Partial<UserSettings>>(legacyKey)

        if (!legacySettings) {
          continue
        }

        settings = legacySettings

        try {
          // Only migrate when the primary key is still empty, so a concurrent
          // write is never overwritten by a stale legacy record.
          await updateUserDoc<Partial<UserSettings>>(primaryKey, (current) =>
            current
              ? null
              : {
                  ...defaultSettings,
                  ...legacySettings,
                  userId: session.user.id,
                }
          )
        } catch (migrationError) {
          logError(migrationError, {
            action: 'getUserSettings:migrateLegacyKey',
            legacyKey,
            primaryKey,
            userId: session.user.id,
          })
        }

        break
      }
    }

    if (!settings) {
      // 用户首次访问，返回默认设置
      return { ...defaultSettings, userId: session.user.id }
    }

    // 合并默认值，确保新增字段向后兼容
    const mergedSettings = {
      ...defaultSettings,
      ...settings,
      userId: session.user.id,
    }

    // 验证并返回存储的设置
    return validateOrThrow(UserSettingsSchema, mergedSettings)
  } catch (error) {
    logError(error, {
      action: 'getUserSettings',
      userId: session.user.id,
    })
    // 出错时返回默认设置
    return { ...defaultSettings, userId: session.user.id }
  }
}

/**
 * 更新用户设置
 * 只有登录用户可以保存设置
 * 包含速率限制和输入验证
 */
export async function updateSettings(
  settings: Partial<UserSettings>
): Promise<{ success: boolean; error?: string; settings?: UserSettings }> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to save settings')
    }

    // 速率限制：每分钟最多300次更新（非常宽松，支持滑块频繁调整）
    const rateLimitResult = await rateLimitByUser(session.user.id, {
      limit: 300,
      window: 60,
    })

    if (!rateLimitResult.success) {
      throw new RateLimitError('Too many requests. Please try again later.')
    }

    // 只接受用户偏好字段；userId 与 isPro 属于服务端保留字段。
    const input = validateOrThrow(UserSettingsInputSchema, settings)

    const key = StorageKeys.userSettings(session.user.id)
    const result = await updateUserDoc<UserSettings>(key, (current) =>
      validateOrThrow(UserSettingsSchema, {
        ...defaultSettings,
        ...current,
        ...input,
        userId: session.user.id,
        // Entitlement is server-owned: never take isPro from the request body.
        isPro: current?.isPro ?? false,
      })
    )

    if (!result.value) {
      throw new APIError('Failed to save settings', 500, 'SETTINGS_WRITE_FAILED')
    }

    return { success: true, settings: result.value }
  } catch (error) {
    // Typed API errors (auth, rate limit, validation) keep their status code
    // so the Worker route can respond with 401/429/400 instead of a flat 400.
    if (error instanceof APIError) {
      throw error
    }

    logError(error, {
      action: 'updateSettings',
      settings,
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    }
  }
}

/**
 * 重置用户设置为默认值
 * 包含速率限制和权限验证
 */
export async function resetSettings(): Promise<{
  success: boolean
  error?: string
  settings?: UserSettings
}> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to reset settings')
    }

    // 速率限制：每15分钟最多5次重置
    const rateLimitResult = await rateLimitByUser(session.user.id, {
      ...RateLimitTiers.STRICT,
    })

    if (!rateLimitResult.success) {
      throw new RateLimitError('Too many reset attempts. Please try again later.')
    }

    const key = StorageKeys.userSettings(session.user.id)
    const result = await updateUserDoc<UserSettings>(key, (current) =>
      validateOrThrow(UserSettingsSchema, {
        ...defaultSettings,
        userId: session.user.id,
        isPro: current?.isPro ?? false,
      })
    )

    if (!result.value) {
      throw new APIError('Failed to reset settings', 500, 'SETTINGS_WRITE_FAILED')
    }

    return { success: true, settings: result.value }
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    logError(error, {
      action: 'resetSettings',
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset settings',
    }
  }
}

/**
 * Toggle the self-hosted Pro preview flag.
 *
 * This repository does not include billing. Deployers can keep this preview enabled,
 * replace it with their own entitlement logic, or remove the route entirely.
 */
export function isProPreviewEnabled(): boolean {
  return isNonProductionRuntime() || getEnvValue('PRO_PREVIEW_ENABLED') === 'true'
}

/**
 * Toggle the self-hosted Pro preview flag.
 *
 * Disabled in production unless PRO_PREVIEW_ENABLED is explicitly set to
 * `true`; production entitlements must come from a trusted billing provider.
 */
export async function toggleProStatus(): Promise<{
  success: boolean
  error?: string
  isPro?: boolean
}> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to toggle Pro status')
    }

    if (!isProPreviewEnabled()) {
      throw new APIError('Pro preview toggling is disabled in production', 403, 'FORBIDDEN')
    }

    const key = StorageKeys.userSettings(session.user.id)
    const result = await updateUserDoc<UserSettings>(key, (current) =>
      validateOrThrow(UserSettingsSchema, {
        ...defaultSettings,
        ...current,
        userId: session.user.id,
        isPro: !(current?.isPro ?? false),
      })
    )

    if (!result.value) {
      throw new APIError('Failed to toggle Pro status', 500, 'SETTINGS_WRITE_FAILED')
    }

    return { success: true, isPro: result.value.isPro === true }
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    logError(error, {
      action: 'toggleProStatus',
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle Pro status',
    }
  }
}
