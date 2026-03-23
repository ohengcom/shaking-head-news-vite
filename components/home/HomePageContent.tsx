'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AdBanner } from '@/components/ads/AdBanner'
import { RefreshButton } from '@/components/common/RefreshButton'
import { NewsList } from '@/components/news/NewsList'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/lib/auth-client'
import { getHomePersonalizationViaApi } from '@/lib/api/home-client'
import { HOT_LIST_SOURCES } from '@/lib/api/hot-list'
import type { HomePersonalizationPayload } from '@/types/home'
import type { NewsItem } from '@/types/news'

interface HomePageContentProps {
  dailyNews: NewsItem[]
  aiNews: NewsItem[]
}

interface HomeShellProps {
  children: ReactNode
  isPro: boolean
  adsEnabled: boolean
}

function HomeShell({ children, isPro, adsEnabled }: HomeShellProps) {
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[200px_1fr_200px] xl:gap-24">
        <aside className="sticky top-0 hidden h-screen flex-col justify-center xl:flex">
          <AdBanner
            position="sidebar"
            size="large"
            className="min-h-[600px] w-full"
            initialIsPro={isPro}
            initialAdsEnabled={adsEnabled}
          />
        </aside>

        <main className="mx-auto w-full max-w-4xl">{children}</main>

        <aside className="sticky top-0 hidden h-screen flex-col justify-center xl:flex">
          <AdBanner
            position="sidebar"
            size="large"
            className="min-h-[600px] w-full"
            initialIsPro={isPro}
            initialAdsEnabled={adsEnabled}
          />
        </aside>
      </div>
    </div>
  )
}

export function HomePageContent({ dailyNews, aiNews }: HomePageContentProps) {
  const { status } = useSession()
  const t = useTranslations('home')
  const tNews = useTranslations('news')
  const tPage = useTranslations('page')
  const [personalization, setPersonalization] = useState<HomePersonalizationPayload | null>(null)
  const [personalizationError, setPersonalizationError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    if (status !== 'authenticated') {
      return () => {
        isCancelled = true
      }
    }

    void (async () => {
      const result = await getHomePersonalizationViaApi()
      if (isCancelled) {
        return
      }

      if (result.success && result.payload) {
        setPersonalization(result.payload)
        setPersonalizationError(null)
      } else {
        setPersonalization(null)
        setPersonalizationError(result.error || t('loadPersonalizationError'))
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [status, t])

  const mergedNews = useMemo(() => [...dailyNews, ...aiNews], [dailyNews, aiNews])

  if (status !== 'authenticated') {
    return (
      <HomeShell isPro={false} adsEnabled={true}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>

        <div className="space-y-6">
          <div className="xl:hidden">
            <AdBanner
              position="inline"
              size="medium"
              className="w-full"
              initialIsPro={false}
              initialAdsEnabled={true}
            />
          </div>
          <NewsList news={mergedNews} showLoginCTA={status === 'unauthenticated'} />
        </div>
      </HomeShell>
    )
  }

  const settings = personalization?.settings
  const isPro = settings?.isPro ?? false
  const adsEnabled = settings?.adsEnabled ?? true
  const enabledSourceIds = (settings?.newsSources || [])
    .filter((id) => id !== 'everydaynews')
    .filter((id) => HOT_LIST_SOURCES.some((source) => source.id === id))
  const customNews = personalization?.customNews || []
  const dynamicNewsMap = personalization?.dynamicNewsMap || {}
  const tabsKey = `${isPro ? 'pro' : 'member'}:${enabledSourceIds.join(',') || 'default'}`

  return (
    <HomeShell isPro={isPro} adsEnabled={adsEnabled}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <Tabs key={tabsKey} defaultValue={isPro ? 'custom' : 'daily'} className="w-full">
        <div className="mb-6 xl:hidden">
          <AdBanner
            position="inline"
            size="medium"
            className="w-full"
            initialIsPro={isPro}
            initialAdsEnabled={adsEnabled}
          />
        </div>

        <TabsList className="scrollbar-hide mb-6 flex h-auto w-full justify-start overflow-x-auto whitespace-nowrap sm:w-auto">
          {isPro && <TabsTrigger value="custom">{tPage('myFeed')}</TabsTrigger>}
          <TabsTrigger value="daily">{tNews('daily')}</TabsTrigger>
          <TabsTrigger value="ai">{tNews('ai')}</TabsTrigger>
          {enabledSourceIds.map((id) => {
            const source = HOT_LIST_SOURCES.find((item) => item.id === id)
            return (
              <TabsTrigger key={id} value={id}>
                {source?.icon} {source?.name}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {personalizationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tNews('error')}</AlertTitle>
            <AlertDescription>{personalizationError}</AlertDescription>
          </Alert>
        )}

        {isPro && (
          <TabsContent value="custom" className="min-h-[500px] space-y-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{tPage('myCustomFeed')}</h2>
              <RefreshButton />
            </div>
            {customNews.length > 0 ? (
              <NewsList news={customNews} showLoginCTA={false} />
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{tPage('noCustomFeeds')}</AlertTitle>
                <AlertDescription>{tPage('noCustomFeedsDescription')}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        )}

        <TabsContent value="daily" className="min-h-[500px] space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{tNews('daily')}</h2>
            <RefreshButton />
          </div>
          <NewsList news={dailyNews} showLoginCTA={false} />
        </TabsContent>

        <TabsContent value="ai" className="min-h-[500px] space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{tPage('itNewsAi')}</h2>
            <RefreshButton />
          </div>
          <NewsList news={aiNews} showLoginCTA={false} />
        </TabsContent>

        {enabledSourceIds.map((id) => {
          const source = HOT_LIST_SOURCES.find((item) => item.id === id)
          const news = dynamicNewsMap[id] || []

          return (
            <TabsContent key={id} value={id} className="min-h-[500px] space-y-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{source?.name}</h2>
                <RefreshButton />
              </div>
              <NewsList news={news} showLoginCTA={false} />
            </TabsContent>
          )
        })}
      </Tabs>
    </HomeShell>
  )
}
