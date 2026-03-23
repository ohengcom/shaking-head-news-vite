'use client'

import { Calendar, Loader2, Lock, Target, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserTier } from '@/hooks/use-user-tier'
import { signIn } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface BlurredStatsProps {
  className?: string
  tier?: 'guest' | 'member' | 'pro'
}

export function BlurredStats({ className, tier: serverTier }: BlurredStatsProps) {
  const { isGuest: clientIsGuest, isMember: clientIsMember } = useUserTier()

  const isGuest = serverTier ? serverTier === 'guest' : clientIsGuest
  const isMember = serverTier ? serverTier === 'member' : clientIsMember

  if (isGuest) {
    return (
      <div className={cn('space-y-6', className)}>
        <GuestStatsOverlay />
      </div>
    )
  }

  if (isMember) {
    return (
      <div className={cn('space-y-6', className)}>
        <MemberStatsPreview />
      </div>
    )
  }

  return null
}

function GuestStatsOverlay() {
  const t = useTranslations('stats')
  const tTier = useTranslations('tier')

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50 blur-md select-none">
        <StatsPlaceholder />
      </div>

      <div className="bg-background/80 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
            <Lock className="text-muted-foreground h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('guestOverlayTitle')}</h3>
            <p className="text-muted-foreground max-w-xs text-sm">
              {tTier('loginToUnlockDescription')}
            </p>
          </div>
          <Button onClick={() => signIn()}>{tTier('loginButton')}</Button>
        </div>
      </div>
    </div>
  )
}

function MemberStatsPreview() {
  const t = useTranslations('stats')
  const tTier = useTranslations('tier')
  const { togglePro, isTogglingPro } = useUserTier()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('today')}</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-muted-foreground text-xs">{t('rotationCount')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('week')}</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-muted-foreground text-xs">{t('average')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('goal')}</CardTitle>
            <Target className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-muted-foreground text-xs">{t('goalProgress')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <div className="pointer-events-none opacity-50 blur-md select-none">
          <Card>
            <CardHeader>
              <CardTitle>{t('weeklyTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 flex h-[200px] items-center justify-center rounded">
                <div className="text-muted-foreground">{t('chartPreview')}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-lg backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <Lock className="text-muted-foreground h-6 w-6" />
            <div className="space-y-1">
              <p className="font-medium">{t('fullStatsTitle')}</p>
              <p className="text-muted-foreground text-sm">{t('fullStatsDescription')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={togglePro} disabled={isTogglingPro}>
              {isTogglingPro ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tTier('upgradeButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Card key={item}>
            <CardHeader className="pb-2">
              <div className="bg-muted h-4 w-20 rounded" />
            </CardHeader>
            <CardContent>
              <div className="bg-muted mb-2 h-8 w-16 rounded" />
              <div className="bg-muted h-3 w-24 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="bg-muted h-5 w-32 rounded" />
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 h-[200px] rounded" />
        </CardContent>
      </Card>
    </div>
  )
}

export default BlurredStats
