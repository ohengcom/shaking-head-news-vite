'use client'

import { Check, Eye, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export type FeatureValue = 'included' | 'not-included' | 'preview' | string

interface FeatureRowProps {
  name: string
  guest: FeatureValue
  member: FeatureValue
  pro: FeatureValue
  isLast?: boolean
}

export function FeatureRow({ name, guest, member, pro, isLast }: FeatureRowProps) {
  const t = useTranslations('features')

  return (
    <div
      className={cn('grid grid-cols-4 gap-4 py-3 text-sm', !isLast && 'border-border/50 border-b')}
    >
      <div className="font-medium">{name}</div>
      <div className="text-center">
        <FeatureValueDisplay value={guest} previewLabel={t('preview')} />
      </div>
      <div className="text-center">
        <FeatureValueDisplay value={member} previewLabel={t('preview')} />
      </div>
      <div className="text-center">
        <FeatureValueDisplay value={pro} previewLabel={t('preview')} />
      </div>
    </div>
  )
}

function FeatureValueDisplay({
  value,
  previewLabel,
}: {
  value: FeatureValue
  previewLabel: string
}) {
  if (value === 'included') {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-green-500" />
      </span>
    )
  }

  if (value === 'not-included') {
    return (
      <span className="inline-flex items-center justify-center">
        <X className="text-muted-foreground/50 h-4 w-4" />
      </span>
    )
  }

  if (value === 'preview') {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-500">
        <Eye className="h-3 w-3" />
        <span className="text-xs">{previewLabel}</span>
      </span>
    )
  }

  return <span className="text-muted-foreground text-xs">{value}</span>
}

export function FeatureTableHeader() {
  const t = useTranslations('features')

  return (
    <div className="border-border grid grid-cols-4 gap-4 border-b py-3 text-sm font-semibold">
      <div>{t('tableFeature')}</div>
      <div className="text-center">{t('guestTitle')}</div>
      <div className="text-center">{t('memberTitle')}</div>
      <div className="text-center">{t('proTitle')}</div>
    </div>
  )
}

export default FeatureRow
