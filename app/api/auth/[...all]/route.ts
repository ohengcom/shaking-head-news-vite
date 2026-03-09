import { toNextJsHandler } from 'better-auth/next-js'
import { getAuthServer } from '@/lib/auth'
import { NextResponse } from 'next/server'

const authServer = getAuthServer()
const authHandler = authServer ? toNextJsHandler(authServer) : null
const LEGACY_MICROSOFT_CALLBACK_PATH = '/api/auth/callback/microsoft-entra-id'
const LEGACY_MICROSOFT_OAUTH2_CALLBACK_PATH = '/api/auth/oauth2/callback/microsoft-entra-id'

function normalizeLegacyMicrosoftCallbackRequest(request: Request): Request {
  const url = new URL(request.url)

  if (
    url.pathname !== LEGACY_MICROSOFT_CALLBACK_PATH &&
    url.pathname !== LEGACY_MICROSOFT_OAUTH2_CALLBACK_PATH
  ) {
    return request
  }

  url.pathname = url.pathname.replace('microsoft-entra-id', 'microsoft')
  return new Request(url.toString(), request)
}

export async function GET(request: Request) {
  if (!authHandler) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 })
  }
  return authHandler.GET(normalizeLegacyMicrosoftCallbackRequest(request))
}

export async function POST(request: Request) {
  if (!authHandler) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 })
  }
  return authHandler.POST(normalizeLegacyMicrosoftCallbackRequest(request))
}
