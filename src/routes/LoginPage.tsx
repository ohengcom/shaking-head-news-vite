import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { signIn } from '@/lib/auth-client'
import { useDocumentTitle } from '@/src/hooks/use-document-title'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

function toSafeCallbackUrl(callbackUrl: string | null): string {
  if (!callbackUrl) {
    return '/'
  }

  if (callbackUrl.startsWith('/')) {
    return callbackUrl
  }

  if (typeof window === 'undefined') {
    return '/'
  }

  try {
    const parsed = new URL(callbackUrl)
    if (parsed.origin !== window.location.origin) {
      return '/'
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/'
  } catch {
    return '/'
  }
}

function parseAuthError(error: unknown, fallbackMessage: string): string | null {
  if (!error) {
    return null
  }

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object') {
    const candidate = error as {
      message?: unknown
      code?: unknown
      error?: unknown
      data?: { message?: unknown }
    }

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message
    }

    if (
      candidate.data &&
      typeof candidate.data.message === 'string' &&
      candidate.data.message.trim()
    ) {
      return candidate.data.message
    }

    if (candidate.error) {
      return parseAuthError(candidate.error, fallbackMessage)
    }

    if (typeof candidate.code === 'string' && candidate.code.trim()) {
      return candidate.code
    }
  }

  return fallbackMessage
}

interface SignInResult {
  data?: {
    url?: string
    redirect?: boolean
  } | null
  error?: unknown
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-.8 2.4-1.8 3.2l3 2.3c1.8-1.6 2.9-4 2.9-6.8 0-.6-.1-1.2-.2-1.8H12Z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.6 0 4.8-.9 6.4-2.4l-3-2.3c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1l-3.1 2.4c1.6 3.2 4.9 5.4 8.7 5.4Z"
      />
      <path
        fill="#4A90E2"
        d="M6.4 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7L3.3 8c-.7 1.3-1.1 2.6-1.1 4s.4 2.8 1.1 4l3.1-2.3Z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.2c1.4 0 2.7.5 3.7 1.5l2.7-2.7C16.8 3.5 14.6 2.5 12 2.5 8.2 2.5 4.9 4.7 3.3 8l3.1 2.3C7.2 8 9.4 6.2 12 6.2Z"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  )
}

export function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = toSafeCallbackUrl(searchParams.get('callbackUrl'))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')

  useDocumentTitle(tAuth('signIn'))

  const handleSocialSignIn = async (provider: 'google' | 'microsoft') => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSignInError(null)

    try {
      const result = (await signIn(provider, { redirectTo: callbackUrl })) as
        | SignInResult
        | undefined

      const errorMessage = parseAuthError(result?.error, tAuth('genericError'))
      if (errorMessage) {
        setSignInError(errorMessage)
        return
      }

      if (result?.data?.url && typeof window !== 'undefined') {
        window.location.href = result.data.url
      }
    } catch (error) {
      setSignInError(parseAuthError(error, tAuth('genericError')) || tAuth('genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="via-background dark:via-background flex min-h-[calc(100vh-12rem)] items-center justify-center rounded-[2rem] bg-gradient-to-br from-emerald-100 to-sky-100 px-4 py-8 dark:from-emerald-950/40 dark:to-sky-950/30">
      <div className="border-border bg-card/90 w-full max-w-md space-y-8 rounded-[2rem] border p-8 shadow-xl backdrop-blur">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{tCommon('appName')}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{tAuth('signInDescription')}</p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleSocialSignIn('google')}
            disabled={isSubmitting}
          >
            <GoogleIcon />
            Google
          </button>

          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-muted flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleSocialSignIn('microsoft')}
            disabled={isSubmitting}
          >
            <MicrosoftIcon />
            Microsoft
          </button>

          {signInError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {signInError}
            </div>
          ) : null}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-primary inline-flex items-center gap-2 text-sm hover:underline"
          >
            {tAuth('continueWithoutSignIn')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="border-border/70 bg-background/70 text-muted-foreground rounded-2xl border px-4 py-3 text-center text-xs">
          <div className="text-foreground mb-2 flex items-center justify-center gap-2">
            <ShieldCheck className="text-primary h-4 w-4" />
            {tAuth('secureSignIn')}
          </div>
          <p>
            {tAuth('agreementPrefix')}{' '}
            <Link href="/about#terms" className="text-primary hover:underline">
              {tAuth('terms')}
            </Link>{' '}
            {tCommon('and')}{' '}
            <Link href="/about#privacy" className="text-primary hover:underline">
              {tAuth('privacyPolicy')}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
