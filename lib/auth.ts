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

const authBaseURL = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL
const authSecret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET

type AuthServer = ReturnType<typeof betterAuth>
let authServerInstance: AuthServer | null | undefined

export function getAuthServer(): AuthServer | null {
  if (authServerInstance !== undefined) {
    return authServerInstance
  }

  if (!authBaseURL || !authSecret) {
    console.warn(
      '[Auth] BETTER_AUTH_URL/NEXTAUTH_URL or BETTER_AUTH_SECRET/NEXTAUTH_SECRET is missing'
    )
    authServerInstance = null
    return null
  }

  try {
    authServerInstance = betterAuth({
      baseURL: authBaseURL,
      secret: authSecret,
      socialProviders,
    })
    return authServerInstance
  } catch (error) {
    console.error('[Auth] Failed to initialize Better Auth', error)
    authServerInstance = null
    return null
  }
}

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
  const authServer = getAuthServer()
  if (!authServer) {
    return null
  }

  let session: Awaited<ReturnType<typeof authServer.api.getSession>>
  try {
    session = await authServer.api.getSession({
      headers: await headers(),
    })
  } catch (error) {
    console.error('[Auth] Failed to get session', error)
    return null
  }

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
