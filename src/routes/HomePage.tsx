import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { HomePageContent } from '@/components/home/HomePageContent'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getHomeFeedViaApi, getInitialHomeFeed } from '@/lib/api/content-client'
import type { NewsItem } from '@/types/news'
import { useDocumentTitle } from '@/src/hooks/use-document-title'
import { useAppLocale, useTranslations } from '@/lib/i18n'

export function HomePage() {
  const locale = useAppLocale()
  const initialFeed = getInitialHomeFeed(locale)
  const [dailyNews, setDailyNews] = useState<NewsItem[]>(
    () => initialFeed?.payload?.dailyNews ?? []
  )
  const [aiNews, setAiNews] = useState<NewsItem[]>(() => initialFeed?.payload?.aiNews ?? [])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(() => !initialFeed?.payload)
  const t = useTranslations('home')
  const tCommon = useTranslations('common')

  useDocumentTitle(t('title'))

  useEffect(() => {
    let cancelled = false
    const initialFeed = getInitialHomeFeed(locale)

    if (initialFeed?.payload) {
      setDailyNews(initialFeed.payload.dailyNews)
      setAiNews(initialFeed.payload.aiNews)
      setError(null)
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      setIsLoading(true)
      const result = await getHomeFeedViaApi(locale)

      if (cancelled) {
        return
      }

      if (!result.success || !result.payload) {
        setError(result.error || t('loadErrorDescription'))
        setIsLoading(false)
        return
      }

      setDailyNews(result.payload.dailyNews)
      setAiNews(result.payload.aiNews)
      setError(null)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [locale, t])

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-16">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <div className="text-muted-foreground text-center text-sm">{t('loadingFeed')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tCommon('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <HomePageContent dailyNews={dailyNews} aiNews={aiNews} />
}
