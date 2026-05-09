/**
 * Authentication data access helpers for Worker-side actions.
 */

import { auth } from '@/lib/auth'
import { getStorageItem, StorageKeys } from '@/lib/storage'

export interface CurrentUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  subscription?: 'free' | 'pro'
}

/**
 * 获取当前用户。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await auth()
    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id || session.user.email || '',
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      // 订阅状态（未来从数据库获取）
      subscription: 'free',
    }
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

/**
 * 验证用户是否已认证
 * 如果未认证则抛出错误
 */
export async function verifyAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * 检查用户是否已认证（不抛出错误）
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * 检查用户是否有 Pro 订阅
 * 从用户设置中读取 isPro 状态
 */
export async function hasProSubscription(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  // 从用户设置中读取 isPro 状态
  const settings = await getStorageItem<{ isPro?: boolean }>(StorageKeys.userSettings(user.id))

  return settings?.isPro === true
}
