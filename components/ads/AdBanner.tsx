/**
 * AdBanner Component
 * 广告横幅组件
 *
 * 根据用户层级显示/隐藏广告：
 * - Guest: 强制显示广告
 * - Member: 强制显示广告
 * - Pro: 可根据设置显示/隐藏
 */

'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { getAdSenseClientId, getAdSenseSlot } from '@/lib/config/adsense'
import { isDevelopmentRuntime } from '@/lib/config/runtime-env'

const subscribeToClient = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

interface AdBannerProps {
  /** 广告位置 */
  position?: 'sidebar' | 'header' | 'footer' | 'inline'
  /** 广告尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 自定义类名 */
  className?: string
  /** 广告单元 ID (Google AdSense) */
  adSlot?: string
  /** 初始 Pro 状态 (用于服务端渲染) */
  initialIsPro?: boolean
  /** 初始广告偏好（用于服务端渲染） */
  initialAdsEnabled?: boolean
}

/**
 * 广告横幅组件
 * 使用 Google AdSense 显示广告
 */
export function AdBanner({
  position = 'sidebar',
  size = 'medium',
  className,
  adSlot,
  initialIsPro,
  initialAdsEnabled = true,
}: AdBannerProps) {
  const adSenseClientId = getAdSenseClientId()
  const isProUser = Boolean(initialIsPro)
  const adsEnabled = isProUser ? initialAdsEnabled : true
  const isClient = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot)
  const adDimensions = getAdDimensions(position, size)
  const resolvedAdSlot = adSlot || getDefaultAdSlot(position)
  const hasAdSenseConfig = Boolean(adSenseClientId)

  // 如果 Pro 用户关闭了广告，不渲染
  if (isProUser && !adsEnabled) {
    return null
  }

  // 服务端渲染时返回占位符
  if (!isClient) {
    return <AdPlaceholder position={position} size={size} className={className} />
  }

  // 根据位置和尺寸确定广告尺寸
  return (
    <div
      className={cn(
        'ad-banner border-border/50 bg-muted/30 overflow-hidden rounded-lg border',
        adDimensions.containerClass,
        className
      )}
      style={adDimensions.style}
      data-ad-position={position}
      data-ad-size={size}
    >
      {/* 开发环境显示占位符 */}
      {isDevelopmentRuntime() || !hasAdSenseConfig ? (
        <AdPlaceholder position={position} size={size} />
      ) : (
        <GoogleAdSense
          adClient={adSenseClientId}
          adSlot={resolvedAdSlot}
          style={adDimensions.style}
        />
      )}
    </div>
  )
}

/**
 * 广告占位符（开发环境使用）
 */
function AdPlaceholder({
  position,
  size,
  className,
}: {
  position: string
  size: string
  className?: string
}) {
  const t = useTranslations('common')
  const dimensions = getAdDimensions(
    position as AdBannerProps['position'],
    size as AdBannerProps['size']
  )

  return (
    <div
      className={cn(
        'from-muted/50 to-muted text-muted-foreground flex items-center justify-center bg-gradient-to-br',
        dimensions.containerClass,
        className
      )}
      style={dimensions.style}
    >
      <div className="text-center">
        <p className="text-xs font-medium">{t('adPlaceholder')}</p>
        <p className="text-[10px] opacity-70">
          {position} - {size}
        </p>
      </div>
    </div>
  )
}

/**
 * Google AdSense 组件
 */
function GoogleAdSense({
  adClient,
  adSlot,
  style,
}: {
  adClient: string
  adSlot: string
  style: React.CSSProperties
}) {
  const adRef = useRef<HTMLModElement | null>(null)
  const hasPushedRef = useRef(false)
  const [isSlotReady, setIsSlotReady] = useState(false)

  useEffect(() => {
    const element = adRef.current
    if (!element) {
      return
    }

    let rafId: number | null = null
    const checkSize = () => {
      const current = adRef.current
      if (!current) {
        return
      }

      const rect = current.getBoundingClientRect()
      const isVisible = rect.width >= 120 && rect.height >= 50 && current.offsetParent !== null

      if (isVisible) {
        setIsSlotReady(true)
      }
    }

    const scheduleCheck = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(checkSize)
    }

    scheduleCheck()

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleCheck()
      })
      resizeObserver.observe(element)
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleCheck()
      }
    }

    window.addEventListener('resize', scheduleCheck)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleCheck)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    hasPushedRef.current = false
  }, [adClient, adSlot])

  useEffect(() => {
    if (!adClient) {
      return
    }

    if (!isSlotReady) {
      return
    }

    let isCancelled = false
    let retryTimer: ReturnType<typeof setInterval> | null = null
    let retryCount = 0

    const maxRetryCount = 20
    const retryIntervalMs = 800

    const pushAd = () => {
      if (isCancelled) {
        return true
      }

      if (hasPushedRef.current) {
        return true
      }

      const element = adRef.current
      if (!element) {
        return false
      }

      if (document.hidden) {
        return false
      }

      const adStatus = element.getAttribute('data-adsbygoogle-status')
      if (adStatus === 'done') {
        hasPushedRef.current = true
        return true
      }

      const rect = element.getBoundingClientRect()
      const isVisible = rect.width >= 120 && rect.height >= 50 && element.offsetParent !== null
      if (!isVisible) {
        return false
      }

      const adsQueue = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle
      if (!adsQueue) {
        return false
      }

      try {
        adsQueue.push({})
        hasPushedRef.current = true
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const isSizeError =
          /no slot size/i.test(message) ||
          /availableWidth\s*=\s*0/i.test(message) ||
          /availableHeight\s*=\s*0/i.test(message)

        if (!isSizeError) {
          console.error('AdSense error:', error)
          hasPushedRef.current = true
          return true
        }

        return false
      }
    }

    if (!pushAd()) {
      retryTimer = setInterval(() => {
        retryCount += 1

        if (pushAd() || retryCount >= maxRetryCount) {
          if (retryTimer) {
            clearInterval(retryTimer)
          }
        }
      }, retryIntervalMs)
    }

    try {
      const script = document.getElementById('adsense-script') as HTMLScriptElement | null
      if (script) {
        const onLoad = () => {
          void pushAd()
        }

        script.addEventListener('load', onLoad, { once: true })

        return () => {
          isCancelled = true
          script.removeEventListener('load', onLoad)
          if (retryTimer) {
            clearInterval(retryTimer)
          }
        }
      }
    } catch {
      // Ignore listener setup errors.
    }

    return () => {
      isCancelled = true
      if (retryTimer) {
        clearInterval(retryTimer)
      }
    }
  }, [adClient, adSlot, isSlotReady])

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', ...style }}
      data-ad-client={adClient}
      data-ad-slot={adSlot || ''}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

/**
 * 获取广告尺寸配置
 */
function getAdDimensions(
  position: AdBannerProps['position'],
  size: AdBannerProps['size']
): {
  containerClass: string
  style: React.CSSProperties
} {
  const configs = {
    sidebar: {
      small: { containerClass: 'w-full', style: { minHeight: '100px' } },
      medium: { containerClass: 'w-full', style: { minHeight: '250px' } },
      large: { containerClass: 'w-full', style: { minHeight: '400px' } },
    },
    header: {
      small: { containerClass: 'w-full h-[50px]', style: { height: '50px' } },
      medium: { containerClass: 'w-full h-[90px]', style: { height: '90px' } },
      large: { containerClass: 'w-full h-[120px]', style: { height: '120px' } },
    },
    footer: {
      small: { containerClass: 'w-full h-[50px]', style: { height: '50px' } },
      medium: { containerClass: 'w-full h-[90px]', style: { height: '90px' } },
      large: { containerClass: 'w-full h-[120px]', style: { height: '120px' } },
    },
    inline: {
      small: { containerClass: 'w-full', style: { minHeight: '100px' } },
      medium: { containerClass: 'w-full', style: { minHeight: '200px' } },
      large: { containerClass: 'w-full', style: { minHeight: '300px' } },
    },
  }

  return configs[position || 'sidebar'][size || 'medium']
}

/**
 * 获取默认广告位 ID
 */
function getDefaultAdSlot(position: AdBannerProps['position']): string {
  return getAdSenseSlot(position || 'sidebar')
}

export default AdBanner
