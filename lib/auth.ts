import { betterAuth } from 'better-auth'
import { headers } from 'next/headers'

const authBaseURL = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL
const authSecret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET

const microsoftClientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID || process.env.MICROSOFT_CLIENT_ID
const microsoftClientSecret =
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET || process.env.MICROSOFT_CLIENT_SECRET
const microsoftTenantId =
  process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || process.env.MICROSOFT_TENANT_ID || 'common'
const microsoftRedirectPath =
  process.env.AUTH_MICROSOFT_REDIRECT_PATH || '/api/auth/callback/microsoft-entra-id'

function toAbsoluteURL(baseURL: string | undefined, pathOrURL: string): string | undefined {
  if (!baseURL || !pathOrURL) {
    return undefined
  }

  try {
    return new URL(pathOrURL).toString()
  } catch {
    const normalizedPath = pathOrURL.startsWith('/') ? pathOrURL : `/${pathOrURL}`
    try {
      return new URL(normalizedPath, baseURL).toString()
    } catch {
      return undefined
    }
  }
}

const microsoftRedirectURI = toAbsoluteURL(authBaseURL, microsoftRedirectPath)

function createAuthServer() {
  return betterAuth({
    baseURL: authBaseURL!,
    secret: authSecret!,
    socialProviders,
  })
}

const socialProviders = {
  ...(googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : {}),
  ...(microsoftClientId && microsoftClientSecret
    ? {
        microsoft: {
          clientId: microsoftClientId,
          clientSecret: microsoftClientSecret,
          tenantId: microsoftTenantId,
          disableDefaultScope: true,
          disableProfilePhoto: false,
          scope: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
          ...(microsoftRedirectURI ? { redirectURI: microsoftRedirectURI } : {}),
        },
      }
    : {}),
}

type AuthServer = ReturnType<typeof createAuthServer>
let authServerInstance: AuthServer | null = null
let authServerInitialized = false

export function getAuthServer(): AuthServer | null {
  if (authServerInitialized) {
    return authServerInstance
  }

  authServerInitialized = true

  if (!authBaseURL || !authSecret) {
    console.warn(
      '[Auth] BETTER_AUTH_URL/NEXTAUTH_URL or BETTER_AUTH_SECRET/NEXTAUTH_SECRET is missing'
    )
    authServerInstance = null
    return null
  }

  try {
    authServerInstance = createAuthServer()
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
    providerUserId?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires?: string
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

  const providerUserId = session.user.id
  const normalizedEmail = session.user.email?.trim().toLowerCase()
  const stableUserId = normalizedEmail || providerUserId

  if (!stableUserId) {
    return null
  }

  return {
    user: {
      id: stableUserId,
      providerUserId,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    expires: session.session?.expiresAt
      ? new Date(session.session.expiresAt).toISOString()
      : undefined,
  }
}
