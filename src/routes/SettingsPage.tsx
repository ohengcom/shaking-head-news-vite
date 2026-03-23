import { useEffect, useState } from 'react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { getSettingsViaApi } from '@/lib/api/settings-client'
import type { UserSettings } from '@/types/settings'
import { useDocumentTitle } from '@/src/hooks/use-document-title'
import { useTranslations } from 'next-intl'

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations('settings')

  useDocumentTitle(t('title'))

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const result = await getSettingsViaApi()

      if (cancelled) {
        return
      }

      if (!result.success || !result.settings) {
        setError(result.error || t('loadError'))
        return
      }

      setSettings(result.settings)
      setError(null)
    })()

    return () => {
      cancelled = true
    }
  }, [t])

  if (error) {
    return <div className="text-destructive container mx-auto max-w-4xl py-12 text-sm">{error}</div>
  }

  if (!settings) {
    return (
      <div className="text-muted-foreground container mx-auto max-w-4xl py-12 text-sm">
        {t('loading')}
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('pageDescription')}</p>
      </div>
      <SettingsPanel initialSettings={settings} />
    </div>
  )
}
