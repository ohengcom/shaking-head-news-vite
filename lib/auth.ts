import { betterAuth } from 'better-auth'
import { headers } from 'next/headers'
import { getStorageItem, setStorageItem, StorageKeys } from './storage'
import { defaultSettings } from '@/types/settings'

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
    ? {
        microsoft: {
          clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
          clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
          tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || 'common',
        },
      }
    : {}),
}

export const authServer = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  socialProviders,
})

export interface AppSession {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

async function ensureUserSettings(userId: string) {
  const key = StorageKeys.userSettings(userId)
  const existingSettings = await getStorageItem(key)

  if (!existingSettings) {
    await setStorageItem(key, {
      ...defaultSettings,
      userId,
    })
  }
}

export async function auth(): Promise<AppSession | null> {
  const session = await authServer.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return null
  }

  const userId = session.user.id || session.user.email
  if (!userId) {
    return null
  }

  await ensureUserSettings(userId)

  return {
    user: {
      id: userId,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
  }
}
