import { useEffect, type ReactNode } from 'react'
import { useSession } from '@/lib/auth-client'
import { getSettingsViaApi } from '@/lib/api/settings-client'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { UIWrapper } from '@/components/layout/UIWrapper'
import { RuntimeRecovery } from '@/components/RuntimeRecovery'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { I18nProvider, useSetAppLocale } from '@/lib/client-i18n'
import { AdsenseScript } from '@/src/providers/AdsenseScript'

function AppLocaleSync() {
  const { status } = useSession()
  const setAppLocale = useSetAppLocale()

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    let cancelled = false

    void (async () => {
      const result = await getSettingsViaApi()
      if (
        cancelled ||
        !result.success ||
        !result.authenticated ||
        !result.settings ||
        (result.settings.language !== 'zh' && result.settings.language !== 'en')
      ) {
        return
      }

      setAppLocale(result.settings.language)
    })()

    return () => {
      cancelled = true
    }
  }, [setAppLocale, status])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <I18nProvider>
          <AppLocaleSync />
          <RuntimeRecovery />
          <UIWrapper>
            {children}
            <Toaster />
            <AdsenseScript />
          </UIWrapper>
        </I18nProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
