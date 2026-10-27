import { useEffect, type ReactNode } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { useSession } from '@/lib/auth-client'
import { getCachedSettings } from '@/lib/api/settings-cache'
import { UIWrapper } from '@/components/layout/UIWrapper'
import { RuntimeRecovery } from '@/components/RuntimeRecovery'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { I18nProvider, useSetAppLocale } from '@/lib/client-i18n'
import { AdsenseScript } from '@/src/providers/AdsenseScript'
import { useUIStore } from '@/lib/stores/ui-store'
import { useRotationStore } from '@/lib/stores/rotation-store'

/**
 * Apply the signed-in user's cloud preferences at startup.
 *
 * Only the language used to be synced here, so a new device served the home
 * page with local defaults (theme, font size, layout, rotation) until the user
 * happened to open the settings page.
 */
function CloudSettingsSync() {
  const { status } = useSession()
  const setAppLocale = useSetAppLocale()
  const { setTheme } = useTheme()
  const { setFontSize, setLayoutMode } = useUIStore()
  const { setMode: setRotationMode, setInterval: setRotationInterval } = useRotationStore()

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    let cancelled = false

    void (async () => {
      const result = await getCachedSettings()
      if (cancelled || !result?.success || !result.authenticated || !result.settings) {
        return
      }

      const settings = result.settings

      if (settings.language === 'zh' || settings.language === 'en') {
        setAppLocale(settings.language)
      }
      if (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system') {
        setTheme(settings.theme)
      }
      if (settings.fontSize) {
        setFontSize(settings.fontSize)
      }
      if (settings.layoutMode) {
        setLayoutMode(settings.layoutMode)
      }
      if (settings.rotationMode) {
        setRotationMode(settings.rotationMode)
      }
      if (typeof settings.rotationInterval === 'number') {
        setRotationInterval(settings.rotationInterval)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    setAppLocale,
    setFontSize,
    setLayoutMode,
    setRotationInterval,
    setRotationMode,
    setTheme,
    status,
  ])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    // LazyMotion at the app root keeps framer-motion features in a shared
    // chunk; strict mode forbids full `motion` imports anywhere in the tree.
    <LazyMotion features={domAnimation} strict>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <I18nProvider>
          <CloudSettingsSync />
          <RuntimeRecovery />
          <UIWrapper>
            {children}
            <Toaster />
            <AdsenseScript />
          </UIWrapper>
        </I18nProvider>
      </ThemeProvider>
    </LazyMotion>
  )
}
