import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { NewsItem as NewsItemType } from '@/types/news'
import { NewsItem } from './NewsItem'

interface NewsListProps {
  news: NewsItemType[]
  showLoginCTA?: boolean
}

export function NewsList({ news, showLoginCTA = false }: NewsListProps) {
  const t = useTranslations('news')

  if (!news || news.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('emptyTitle')}</AlertTitle>
        <AlertDescription>{t('emptyDescription')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div
      className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent divide-border max-h-[600px] divide-y overflow-y-auto pr-2"
      data-testid="news-list"
    >
      {news.map((item) => (
        <NewsItem key={item.id} item={item} />
      ))}

      {showLoginCTA && (
        <div className="py-6 text-center">
          <p className="text-muted-foreground mb-3 text-sm">{t('loginForMore')}</p>
          <Button asChild size="sm">
            <Link href="/login">{t('signInNow')}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
