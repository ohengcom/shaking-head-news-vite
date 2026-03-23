import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/lib/auth-client'
import { useTranslations } from 'next-intl'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { status } = useSession()
  const tCommon = useTranslations('common')

  if (status === 'loading') {
    return (
      <div className="text-muted-foreground container mx-auto max-w-3xl py-16 text-center text-sm">
        {tCommon('loading')}
      </div>
    )
  }

  if (status !== 'authenticated') {
    const callbackUrl = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} replace />
  }

  return <>{children}</>
}
