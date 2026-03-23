'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { refreshNews } from '@/lib/actions/news'

interface RefreshButtonProps {
  language?: 'zh' | 'en'
  source?: string
}

export function RefreshButton({ language, source }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const t = useTranslations('news')
  const tCommon = useTranslations('common')

  const handleRefresh = async () => {
    setIsRefreshing(true)

    try {
      await refreshNews(language, source)
      router.refresh()

      toast({
        title: t('refreshSuccess'),
        description: t('refreshSuccessDescription'),
      })
    } catch (error) {
      toast({
        title: t('refreshError'),
        description: error instanceof Error ? error.message : tCommon('tryAgainLater'),
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      variant="outline"
      size="sm"
      data-testid="refresh-button"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? t('refreshing') : t('refresh')}
    </Button>
  )
}
