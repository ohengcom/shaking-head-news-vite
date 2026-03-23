import { betterAuth } from 'better-auth'
import { getCurrentRequest } from '@/lib/server/request-context'
import type { KVNamespaceLike } from '@/lib/server/env'

const authBaseURL = process.env.BETTER_AUTH_URL
const authSecret = process.env.BETTER_AUTH_SECRET

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const microsoftClientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID
const microsoftClientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
const microsoftTenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || 'common'
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

function getSecondaryKV(): KVNamespaceLike | null {
  return globalThis.APP_SETTINGS_KV ?? null
}

function createSecondaryStorage(kv: KVNamespaceLike) {
  const prefix = 'better-auth:'

  return {
    get: async (key: string) => {
      return kv.get(`${prefix}${key}`, 'text')
    },
    set: async (key: string, value: string, ttl?: number) => {
      if (typeof ttl === 'number' && ttl > 0) {
        await kv.put(`${prefix}${key}`, value, { expirationTtl: ttl })
        return
      }

      await kv.put(`${prefix}${key}`, value)
    },
    delete: async (key: string) => {
      await kv.delete(`${prefix}${key}`)
    },
  }
}

function resolveBaseURL(request?: Request): string | null {
  if (authBaseURL?.trim()) {
    return authBaseURL
  }

  if (!request) {
    return null
  }

  return new URL(request.url).origin
}

function createAuthServer(baseURL: string) {
  const kv = getSecondaryKV()
  return betterAuth({
    baseURL,
    secret: authSecret!,
    socialProviders,
    ...(kv ? { secondaryStorage: createSecondaryStorage(kv) } : {}),
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
let authServerBaseURL: string | null = null

export function getAuthServer(request?: Request): AuthServer | null {
  const resolvedBaseURL = resolveBaseURL(request)

  if (authServerInitialized && authServerBaseURL === resolvedBaseURL) {
    return authServerInstance
  }

  authServerInitialized = true

  if (!resolvedBaseURL || !authSecret) {
    console.warn('[Auth] BETTER_AUTH_URL/BETTER_AUTH_SECRET is missing or unresolved')
    authServerInstance = null
    authServerBaseURL = resolvedBaseURL
    return null
  }

  try {
    authServerInstance = createAuthServer(resolvedBaseURL)
    authServerBaseURL = resolvedBaseURL
    return authServerInstance
  } catch (error) {
    console.error('[Auth] Failed to initialize Better Auth', error)
    authServerInstance = null
    authServerBaseURL = resolvedBaseURL
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

export async function auth(request?: Request): Promise<AppSession | null> {
  const resolvedRequest = request ?? getCurrentRequest()
  const authServer = getAuthServer(resolvedRequest ?? undefined)
  if (!authServer) {
    return null
  }

  let session: Awaited<ReturnType<typeof authServer.api.getSession>>
  try {
    session = await authServer.api.getSession({
      headers: resolvedRequest?.headers ?? new Headers(),
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

export async function handleAuthRequest(request: Request): Promise<Response> {
  const authServer = getAuthServer(request)
  if (!authServer) {
    return Response.json({ error: 'Auth is not configured' }, { status: 503 })
  }

  return authServer.handler(request)
}
