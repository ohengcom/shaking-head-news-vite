import { useEffect, useState } from 'react'
import { AddRSSSourceDialog } from '@/components/rss/AddRSSSourceDialog'
import { ExportOPMLButton } from '@/components/rss/ExportOPMLButton'
import { ImportOPMLButton } from '@/components/rss/ImportOPMLButton'
import { RSSSourceList } from '@/components/rss/RSSSourceList'
import { useUserTier } from '@/hooks/use-user-tier'
import { getRSSSourcesViaApi } from '@/lib/api/rss-client'
import type { RSSSource } from '@/types/rss'
import { useDocumentTitle } from '@/src/hooks/use-document-title'

export function RssPage() {
  const { isPro } = useUserTier()
  const [sources, setSources] = useState<RSSSource[]>([])
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle('RSS')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const result = await getRSSSourcesViaApi()

      if (cancelled) {
        return
      }

      if (!result.success || !result.payload) {
        setError(result.error || 'Failed to load RSS sources')
        return
      }

      setSources(result.payload)
      setError(null)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RSS Management</h1>
          <p className="text-muted-foreground mt-2">
            Curate your own feed sources on Cloudflare Workers.
          </p>
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

      {error ? (
        <div className="text-destructive text-sm">{error}</div>
      ) : (
        <RSSSourceList initialSources={sources} />
      )}
    </div>
  )
}
