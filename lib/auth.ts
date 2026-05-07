import { betterAuth } from 'better-auth'
import { getCurrentRequest } from '@/lib/server/request-context'
import { getGlobalWorkerEnv, type KVNamespaceLike } from '@/lib/server/env'

function getRuntimeEnvValue(key: keyof CloudflareEnv | 'AUTH_MICROSOFT_REDIRECT_PATH') {
  const workerValue = getGlobalWorkerEnv()?.[key as keyof CloudflareEnv]
  if (typeof workerValue === 'string' && workerValue.trim().length > 0) {
    return workerValue.trim()
  }

  const processValue = process.env[key]
  return typeof processValue === 'string' && processValue.trim().length > 0
    ? processValue.trim()
    : undefined
}

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
  const authBaseURL = getRuntimeEnvValue('BETTER_AUTH_URL')

  if (authBaseURL?.trim()) {
    return authBaseURL
  }

  if (!request) {
    return null
  }

  return new URL(request.url).origin
}

function getSocialProviders(baseURL: string) {
  const googleClientId = getRuntimeEnvValue('GOOGLE_CLIENT_ID')
  const googleClientSecret = getRuntimeEnvValue('GOOGLE_CLIENT_SECRET')
  const microsoftClientId = getRuntimeEnvValue('AUTH_MICROSOFT_ENTRA_ID_ID')
  const microsoftClientSecret = getRuntimeEnvValue('AUTH_MICROSOFT_ENTRA_ID_SECRET')
  const microsoftTenantId = getRuntimeEnvValue('AUTH_MICROSOFT_ENTRA_ID_TENANT_ID') || 'common'
  const microsoftRedirectPath =
    getRuntimeEnvValue('AUTH_MICROSOFT_REDIRECT_PATH') || '/api/auth/callback/microsoft-entra-id'
  const microsoftRedirectURI = toAbsoluteURL(baseURL, microsoftRedirectPath)

  return {
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
}

function createAuthServer(baseURL: string) {
  const kv = getSecondaryKV()
  return betterAuth({
    baseURL,
    secret: getRuntimeEnvValue('BETTER_AUTH_SECRET')!,
    socialProviders: getSocialProviders(baseURL),
    ...(kv ? { secondaryStorage: createSecondaryStorage(kv) } : {}),
  })
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

  if (!resolvedBaseURL || !getRuntimeEnvValue('BETTER_AUTH_SECRET')) {
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
    if (new URL(request.url).pathname.endsWith('/get-session')) {
      return Response.json(null, {
        headers: {
          'cache-control': 'no-store',
        },
      })
    }

    return Response.json({ error: 'Auth is not configured' }, { status: 503 })
  }

  return authServer.handler(request)
}
