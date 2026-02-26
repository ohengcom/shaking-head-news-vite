'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { signIn } from '@/lib/auth-client'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  const handleSocialSignIn = async (provider: 'google' | 'microsoft-entra-id') => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSignInError(null)

    try {
      const result = await signIn(provider, { redirectTo: callbackUrl })
      const errorMessage =
        result && typeof result === 'object' && 'error' in result ? String(result.error ?? '') : ''

      if (errorMessage) {
        setSignInError(errorMessage)
      }
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : '登录失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">摇头看新闻</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">登录以同步您的设置和偏好</p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleSocialSignIn('google')}
            disabled={isSubmitting}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 登录
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            onClick={() => void handleSocialSignIn('microsoft-entra-id')}
            disabled={isSubmitting}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 21 21" fill="currentColor">
              <path fill="#f25022" d="M1 1h9v9H1z" />
              <path fill="#00a4ef" d="M1 11h9v9H1z" />
              <path fill="#7fba00" d="M11 1h9v9H11z" />
              <path fill="#ffb900" d="M11 11h9v9H11z" />
            </svg>
            使用 Microsoft 登录
          </button>

          {signInError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {signInError}
            </div>
          ) : null}

          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            登录即表示您同意我们的服务条款和隐私政策
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
            继续浏览（无需登录）
          </a>
        </div>
      </div>
    </div>
  )
}
