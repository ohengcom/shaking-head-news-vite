import { FeaturesComparison } from '@/components/features/FeaturesComparison'
import { useUserTier } from '@/hooks/use-user-tier'
import { useTranslations } from 'next-intl'
import { useDocumentTitle } from '@/src/hooks/use-document-title'

export function FeaturesPage() {
  const t = useTranslations('features')
  const { tier } = useUserTier()

  useDocumentTitle(t('title'))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>
      <FeaturesComparison currentTier={tier} />
    </div>
  )
}
