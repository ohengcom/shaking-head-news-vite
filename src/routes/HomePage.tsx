import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { HomePageContent } from '@/components/home/HomePageContent'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getHomeFeedViaApi } from '@/lib/api/content-client'
import type { NewsItem } from '@/types/news'
import { useDocumentTitle } from '@/src/hooks/use-document-title'
import { useTranslations } from 'next-intl'

export function HomePage() {
  const [dailyNews, setDailyNews] = useState<NewsItem[]>([])
  const [aiNews, setAiNews] = useState<NewsItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const t = useTranslations('home')

  useDocumentTitle('Home')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setIsLoading(true)
      const result = await getHomeFeedViaApi()

      if (cancelled) {
        return
      }

      if (!result.success || !result.payload) {
        setError(result.error || 'Failed to load news feed')
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
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-16">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <div className="text-muted-foreground text-center text-sm">Loading news...</div>
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
          <AlertTitle>Feed Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <HomePageContent dailyNews={dailyNews} aiNews={aiNews} />
}
