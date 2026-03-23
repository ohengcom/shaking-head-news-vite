import type { ReactNode } from 'react'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { UIWrapper } from '@/components/layout/UIWrapper'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { I18nProvider } from '@/lib/client-i18n'
import { AdsenseScript } from '@/src/providers/AdsenseScript'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider>
        <SessionProvider>
          <UIWrapper>
            {children}
            <Toaster />
            <AdsenseScript />
          </UIWrapper>
        </SessionProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
