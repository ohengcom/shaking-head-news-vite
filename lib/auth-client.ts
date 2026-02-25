'use client'

import { createAuthClient } from 'better-auth/react'

const rawAuthClient = createAuthClient()

const MICROSOFT_PROVIDER_ALIASES = new Set(['microsoft-entra-id', 'azure-ad'])

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SignInOptions {
  callbackUrl?: string
  redirectTo?: string
}

interface SignOutOptions {
  callbackUrl?: string
  redirectTo?: string
}

function getCallbackURL(options?: SignInOptions | SignOutOptions) {
  return options?.redirectTo || options?.callbackUrl
}

function normalizeProvider(provider: string) {
  return MICROSOFT_PROVIDER_ALIASES.has(provider) ? 'microsoft' : provider
}

export const authClient = rawAuthClient

export function useSession() {
  const state = rawAuthClient.useSession()

  const data = state.data?.user
    ? {
        user: {
          id: state.data.user.id,
          name: state.data.user.name,
          email: state.data.user.email,
          image: state.data.user.image,
        },
      }
    : null

  const status: SessionStatus = state.isPending
    ? 'loading'
    : data
      ? 'authenticated'
      : 'unauthenticated'

  return {
    data,
    status,
    update: async () => {
      await state.refetch()
      return data
    },
  }
}

export async function signIn(provider?: string, options?: SignInOptions) {
  const callbackURL = getCallbackURL(options)

  if (!provider) {
    if (typeof window !== 'undefined') {
      const nextURL = callbackURL || window.location.pathname || '/'
      window.location.href = `/login?callbackUrl=${encodeURIComponent(nextURL)}`
    }
    return
  }

  return rawAuthClient.signIn.social({
    provider: normalizeProvider(provider),
    callbackURL,
  })
}

export async function signOut(options?: SignOutOptions) {
  const callbackURL = getCallbackURL(options)
  const result = await rawAuthClient.signOut()

  if (callbackURL && typeof window !== 'undefined') {
    window.location.href = callbackURL
  }

  return result
}
