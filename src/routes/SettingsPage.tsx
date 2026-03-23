import { useEffect, useState } from 'react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { getSettingsViaApi } from '@/lib/api/settings-client'
import type { UserSettings } from '@/types/settings'
import { useDocumentTitle } from '@/src/hooks/use-document-title'

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle('Settings')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const result = await getSettingsViaApi()

      if (cancelled) {
        return
      }

      if (!result.success || !result.settings) {
        setError(result.error || 'Failed to load settings')
        return
      }

      setSettings(result.settings)
      setError(null)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <div className="text-destructive container mx-auto max-w-4xl py-12 text-sm">{error}</div>
  }

  if (!settings) {
    return (
      <div className="text-muted-foreground container mx-auto max-w-4xl py-12 text-sm">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize your reading experience and health routine.
        </p>
      </div>
      <SettingsPanel initialSettings={settings} />
    </div>
  )
}
