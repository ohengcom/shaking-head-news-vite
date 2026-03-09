import { HomePageContent } from '@/components/home/HomePageContent'
import { getAiNewsItems, getNews } from '@/lib/actions/news'

export const revalidate = 3600

export default async function HomePage() {
  const [dailyResponse, aiNews] = await Promise.all([
    getNews('zh').catch(() => ({ items: [], total: 0 })),
    getAiNewsItems().catch(() => []),
  ])

  return <HomePageContent dailyNews={dailyResponse.items} aiNews={aiNews} />
}
