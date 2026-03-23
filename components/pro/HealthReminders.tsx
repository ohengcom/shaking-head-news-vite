'use client'

import { Bell, Clock, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LockedFeature } from '@/components/tier/LockedFeature'
import { useUserTier } from '@/hooks/use-user-tier'

interface HealthRemindersProps {
  className?: string
}

export function HealthReminders({ className }: HealthRemindersProps) {
  const t = useTranslations('stats')
  const tCommon = useTranslations('common')
  const { isPro, features } = useUserTier()

  if (!isPro || !features.healthRemindersEnabled) {
    return (
      <LockedFeature
        requiredTier="pro"
        featureName="healthRemindersEnabled"
        description={t('healthReminderDescription')}
        className={className}
      />
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('healthReminder')}
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {tCommon('comingSoon')}
          </Badge>
        </div>
        <CardDescription>{t('healthReminderDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted mb-4 rounded-full p-4">
            <Clock className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="text-muted-foreground text-sm">{t('healthReminderComingSoon')}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('healthReminderComingSoonDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default HealthReminders
