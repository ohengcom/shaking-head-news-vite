import { useEffect, useState } from 'react'
import { BlurredStats } from '@/components/stats/BlurredStats'
import { StatsDisplay } from '@/components/stats/StatsDisplay'
import { useUserTier } from '@/hooks/use-user-tier'
import { getSummaryStatsViaApi } from '@/lib/api/stats-client'
import { useDocumentTitle } from '@/src/hooks/use-document-title'

type SummaryPayload = NonNullable<Awaited<ReturnType<typeof getSummaryStatsViaApi>>['payload']>

export function StatsPage() {
  const { tier, isLoading: isTierLoading, isPro } = useUserTier()
  const [stats, setStats] = useState<SummaryPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle('Statistics')

  useEffect(() => {
    if (!isPro) {
      return
    }

    let cancelled = false

    void (async () => {
      const result = await getSummaryStatsViaApi()

      if (cancelled) {
        return
      }

      if (!result.success || !result.payload) {
        setError(result.error || 'Failed to load statistics')
        return
      }

      setStats(result.payload)
      setError(null)
    })()

    return () => {
      cancelled = true
    }
  }, [isPro])

  if (isTierLoading) {
    return (
      <div className="text-muted-foreground container mx-auto py-12 text-sm">
        Loading statistics...
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground mt-2">
            Track your daily movement and long-term health trends.
          </p>
        </div>
        <BlurredStats tier={tier} />
      </div>
    )
  }

  if (error) {
    return <div className="text-destructive container mx-auto py-12 text-sm">{error}</div>
  }

  if (!stats) {
    return (
      <div className="text-muted-foreground container mx-auto py-12 text-sm">
        Loading statistics...
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
        <p className="text-muted-foreground mt-2">
          Track your daily movement and long-term health trends.
        </p>
      </div>
      <StatsDisplay initialStats={stats} dailyGoal={stats.dailyGoal} />
    </div>
  )
}
