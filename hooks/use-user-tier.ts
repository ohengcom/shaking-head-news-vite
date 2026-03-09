/**
 * useUserTier Hook
 * ????????? Hook
 */

'use client'

import { useSession } from '@/lib/auth-client'
import { useEffect, useState } from 'react'
import {
  UserTier,
  FeatureConfig,
  getFeaturesForTier,
  isFeatureEnabled,
} from '@/lib/config/features'
import { getSettingsViaApi, toggleProViaApi } from '@/lib/api/settings-client'

export interface UseUserTierReturn {
  /** ???? */
  tier: UserTier
  /** ???? */
  features: FeatureConfig
  /** ?????? */
  isLoading: boolean
  /** ????? */
  isAuthenticated: boolean
  /** ????? */
  isGuest: boolean
  /** ????? */
  isMember: boolean
  /** ??? Pro ?? */
  isPro: boolean
  /** ???? */
  user: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
  /** ?????????? */
  hasFeature: (feature: keyof FeatureConfig) => boolean
  /** ?? Pro ????????? */
  togglePro: () => Promise<{ success: boolean; error?: string; isPro?: boolean }>
  /** ?????? Pro ?? */
  isTogglingPro: boolean
}

interface UseUserTierProps {
  /** ?? Pro ?????????? */
  initialIsPro?: boolean
}

/**
 * ???????????
 */
export function useUserTier(props?: UseUserTierProps): UseUserTierReturn {
  const { data: session, status } = useSession()
  const [isProEnabled, setIsProEnabled] = useState(props?.initialIsPro ?? false)
  const [isTogglingPro, setIsTogglingPro] = useState(false)

  useEffect(() => {
    let isCancelled = false

    if (typeof props?.initialIsPro === 'boolean') {
      setIsProEnabled(props.initialIsPro)
      return () => {
        isCancelled = true
      }
    }

    if (!session?.user?.id) {
      setIsProEnabled(false)
      return () => {
        isCancelled = true
      }
    }

    void (async () => {
      const result = await getSettingsViaApi()
      if (!isCancelled) {
        setIsProEnabled(Boolean(result.success && result.settings?.isPro))
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [props?.initialIsPro, session?.user?.id])

  const togglePro = async () => {
    if (isTogglingPro) {
      return { success: false, error: 'Pro update is already in progress' }
    }

    setIsTogglingPro(true)
    try {
      const result = await toggleProViaApi()
      if (result.success && result.isPro !== undefined) {
        setIsProEnabled(result.isPro)
      }
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update Pro status',
      }
    } finally {
      setIsTogglingPro(false)
    }
  }

  let tier: UserTier = 'guest'
  if (session) {
    tier = isProEnabled ? 'pro' : 'member'
  }

  const features = getFeaturesForTier(tier)
  const isLoading = status === 'loading'
  const isAuthenticated = !!session
  const isGuest = tier === 'guest'
  const isMember = tier === 'member'
  const isPro = tier === 'pro'

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : null

  const hasFeature = (feature: keyof FeatureConfig): boolean => {
    return isFeatureEnabled(tier, feature)
  }

  return {
    tier,
    features,
    isLoading,
    isAuthenticated,
    isGuest,
    isMember,
    isPro,
    user,
    hasFeature,
    togglePro,
    isTogglingPro,
  }
}
