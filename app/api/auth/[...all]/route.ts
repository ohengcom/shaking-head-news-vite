import { toNextJsHandler } from 'better-auth/next-js'
import { getAuthServer } from '@/lib/auth'
import { NextResponse } from 'next/server'

const authServer = getAuthServer()
const authHandler = authServer ? toNextJsHandler(authServer) : null

export async function GET(request: Request) {
  if (!authHandler) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 })
  }
  return authHandler.GET(request)
}

export async function POST(request: Request) {
  if (!authHandler) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 })
  }
  return authHandler.POST(request)
}
