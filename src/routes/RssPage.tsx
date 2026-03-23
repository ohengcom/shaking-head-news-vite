import { useEffect, useState } from 'react'
import { AddRSSSourceDialog } from '@/components/rss/AddRSSSourceDialog'
import { ExportOPMLButton } from '@/components/rss/ExportOPMLButton'
import { ImportOPMLButton } from '@/components/rss/ImportOPMLButton'
import { RSSSourceList } from '@/components/rss/RSSSourceList'
import { useUserTier } from '@/hooks/use-user-tier'
import { getRSSSourcesViaApi } from '@/lib/api/rss-client'
import type { RSSSource } from '@/types/rss'
import { useDocumentTitle } from '@/src/hooks/use-document-title'
import { useTranslations } from 'next-intl'

export function RssPage() {
  const { isPro } = useUserTier()
  const [sources, setSources] = useState<RSSSource[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const t = useTranslations('rss')

  useDocumentTitle(t('title'))

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setIsLoading(true)
      const result = await getRSSSourcesViaApi()

      if (cancelled) {
        return
      }

      if (!result.success || !result.payload) {
        setError(result.error || t('loadError'))
        setIsLoading(false)
        return
      }

      setSources(result.payload)
      setError(null)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isPro ? (
            <>
              <ImportOPMLButton />
              <ExportOPMLButton />
            </>
          ) : null}
          <AddRSSSourceDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t('loading')}</div>
      ) : error ? (
        <div className="text-destructive text-sm">{error}</div>
      ) : (
        <RSSSourceList initialSources={sources} />
      )}
    </div>
  )
}
