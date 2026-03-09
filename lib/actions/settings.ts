'use server'

import { auth } from '@/lib/auth'
import { getStorageItem, setStorageItem, StorageKeys } from '@/lib/storage'
import { UserSettingsSchema, defaultSettings, UserSettings } from '@/types/settings'
import { revalidatePath } from 'next/cache'
import { AuthError, logError, validateOrThrow } from '@/lib/utils/error-handler'
import { rateLimitByUser, RateLimitTiers } from '@/lib/rate-limit'
import { sanitizeObject } from '@/lib/utils/input-validation'

const ENABLE_SETTINGS_REVALIDATE = process.env.ENABLE_SETTINGS_REVALIDATE === 'true'

function revalidateSettingsPaths() {
  if (!ENABLE_SETTINGS_REVALIDATE) {
    return
  }

  const paths = ['/', '/settings', '/stats', '/rss']

  for (const path of paths) {
    try {
      revalidatePath(path)
    } catch (error) {
      logError(error, {
        action: 'revalidateSettingsPaths',
        path,
      })
    }
  }
}

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
    let settings = await getStorageItem<Partial<UserSettings>>(primaryKey)

    if (!settings) {
      const legacyKeys = getLegacySettingsKeys(session.user)

      for (const legacyKey of legacyKeys) {
        const legacySettings = await getStorageItem<Partial<UserSettings>>(legacyKey)

        if (!legacySettings) {
          continue
        }

        settings = legacySettings

        try {
          await setStorageItem(primaryKey, {
            ...defaultSettings,
            ...legacySettings,
            userId: session.user.id,
          })
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
      throw new Error('Too many requests. Please try again later.')
    }

    // 清理输入数据
    const sanitizedSettings = sanitizeObject(settings, {
      maxLength: 1000,
      allowHtml: false,
    })

    // 获取当前设置
    const currentSettings = await getUserSettings()

    // 合并新设置
    const newSettings = {
      ...currentSettings,
      ...sanitizedSettings,
      userId: session.user.id, // 确保userId不被覆盖
    }

    // 验证数据
    const validatedSettings = validateOrThrow(UserSettingsSchema, newSettings)

    // 存储到 Cloudflare KV
    await setStorageItem(StorageKeys.userSettings(session.user.id), validatedSettings)

    // 重新验证依赖用户设置的页面（失败不影响保存结果）
    revalidateSettingsPaths()

    return {
      success: true,
      settings: validatedSettings,
    }
  } catch (error) {
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
      throw new Error('Too many reset attempts. Please try again later.')
    }

    const currentSettings = await getUserSettings()

    const resetSettings = {
      ...defaultSettings,
      userId: session.user.id,
      isPro: currentSettings.isPro ?? false,
    }

    await setStorageItem(StorageKeys.userSettings(session.user.id), resetSettings)

    // 重新验证依赖用户设置的页面（失败不影响保存结果）
    revalidateSettingsPaths()

    return {
      success: true,
      settings: resetSettings,
    }
  } catch (error) {
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
 * 切换 Pro 状态（临时测试用）
 * 将 Pro 状态存储在云端
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

    // 获取当前设置
    const currentSettings = await getUserSettings()

    // 切换 Pro 状态
    const newIsPro = !currentSettings.isPro

    // 更新设置
    const newSettings = {
      ...currentSettings,
      isPro: newIsPro,
    }

    // 存储到云端
    await setStorageItem(StorageKeys.userSettings(session.user.id), newSettings)

    // 重新验证相关页面（失败不影响保存结果）
    revalidateSettingsPaths()

    return {
      success: true,
      isPro: newIsPro,
    }
  } catch (error) {
    logError(error, {
      action: 'toggleProStatus',
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle Pro status',
    }
  }
}
