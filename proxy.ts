import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security headers configuration
 */
function getSecurityHeaders() {
  const headers = new Headers()

  // Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com https://cse.google.com https://*.adtrafficquality.google https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob: https://pagead2.googlesyndication.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://news.ravelloh.top https://accounts.google.com https://*.upstash.io https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://fundingchoicesmessages.google.com https://*.adtrafficquality.google https://static.cloudflareinsights.com",
    "frame-src 'self' https://accounts.google.com https://googleads.g.doubleclick.net https://www.google.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com https://*.adtrafficquality.google",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ]
  headers.set('Content-Security-Policy', cspDirectives.join('; '))

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY')

  // XSS Protection (legacy browsers)
  headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy (formerly Feature Policy)
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return headers
}

export async function proxy(request: NextRequest) {
  void request
  // Create response with security headers
  const response = NextResponse.next()

  // Apply security headers
  const securityHeaders = getSecurityHeaders()
  securityHeaders.forEach((value, key) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vinext/image (vinext image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|_vinext/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export { proxy as middleware }
export default proxy
