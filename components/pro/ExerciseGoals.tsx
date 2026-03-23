'use client'

import { Sparkles, Target, Trophy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LockedFeature } from '@/components/tier/LockedFeature'
import { useUserTier } from '@/hooks/use-user-tier'

interface ExerciseGoalsProps {
  className?: string
}

export function ExerciseGoals({ className }: ExerciseGoalsProps) {
  const t = useTranslations('stats')
  const tCommon = useTranslations('common')
  const { isPro, features } = useUserTier()

  if (!isPro || !features.exerciseGoalsEnabled) {
    return (
      <LockedFeature
        requiredTier="pro"
        featureName="exerciseGoalsEnabled"
        description={t('goalProgress')}
        className={className}
      />
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('goal')}
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {tCommon('comingSoon')}
          </Badge>
        </div>
        <CardDescription>{t('goalProgress')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted mb-4 rounded-full p-4">
            <Trophy className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="text-muted-foreground text-sm">{t('exerciseGoalsComingSoon')}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('exerciseGoalsComingSoonDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ExerciseGoals
