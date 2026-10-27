import { m } from 'framer-motion'
import { useRotationStore } from '@/lib/stores/rotation-store'
import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { usePathname } from '@/lib/router'
import { getLocalStatsDate, recordRotationViaApi } from '@/lib/api/stats-client'
import { cn } from '@/lib/utils'

interface TiltWrapperProps {
  children: React.ReactNode
  mode?: 'fixed' | 'continuous'
  interval?: number
}

interface PendingRotation {
  angle: number
  duration: number
}

const BATCH_INTERVAL_MS = 5 * 60 * 1000 // Flush every 5 minutes
const MAX_PENDING_ROTATIONS = 500
// Mouse-follow updates below this delta are visually irrelevant and only cost a
// React/Zustand render.
const MIN_MOUSE_ANGLE_DELTA = 0.2
const subscribeToHydration = () => () => {}
const getHydratedSnapshot = () => true
const getServerHydratedSnapshot = () => false
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const MIN_RANDOM_ANGLE_DEGREES = 8
const MAX_RANDOM_ANGLE_DEGREES = 20
const MIN_RANDOM_ANGLE_DELTA_DEGREES = 8

function getNextRandomAngle(previousAngle: number): number {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angleMagnitude =
      Math.random() * (MAX_RANDOM_ANGLE_DEGREES - MIN_RANDOM_ANGLE_DEGREES) +
      MIN_RANDOM_ANGLE_DEGREES
    const sign = Math.random() < 0.5 ? 1 : -1
    const nextAngle = angleMagnitude * sign

    if (Math.abs(nextAngle - previousAngle) >= MIN_RANDOM_ANGLE_DELTA_DEGREES) {
      return nextAngle
    }
  }

  const fallbackMagnitude = Math.max(Math.abs(previousAngle), MIN_RANDOM_ANGLE_DEGREES)
  const fallbackSign = previousAngle >= 0 ? -1 : 1
  return fallbackMagnitude * fallbackSign
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getReducedMotionSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false
}

const getServerReducedMotionSnapshot = () => false

export function TiltWrapper({
  children,
  mode: propMode,
  interval: propInterval,
}: TiltWrapperProps) {
  const { angle, setAngle, isPaused, mode, interval } = useRotationStore()
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  )
  const lastRotationTime = useRef<number | null>(null)
  const previousAngle = useRef<number>(0)
  const pendingRotations = useRef<PendingRotation[]>([])
  const flushInFlight = useRef(false)
  const mouseFrame = useRef<number | null>(null)
  const latestMouseAngle = useRef<number>(0)
  const pathname = usePathname()
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  )

  // Use props if provided, otherwise use store values
  const effectiveMode = propMode ?? mode
  const effectiveInterval = propInterval ?? interval
  const fallbackPathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const resolvedPathname = pathname || fallbackPathname

  // Disable rotation on settings and RSS pages (including localized/nested paths)
  const isSettingsPage =
    typeof resolvedPathname === 'string' && /(^|\/)(settings|rss)(\/|$)/.test(resolvedPathname)
  const safeAngle = Number.isFinite(angle) ? Math.max(-25, Math.min(25, angle)) : 0

  // Flush pending rotations to server (batch upload)
  const flushRotations = useCallback(() => {
    if (flushInFlight.current) return

    const batch = pendingRotations.current
    if (batch.length === 0) return

    // Send the latest rotation as a summary (total count preserved in duration sum)
    const lastEntry = batch[batch.length - 1]
    const totalDuration = batch.reduce((sum, r) => sum + r.duration, 0)

    flushInFlight.current = true
    recordRotationViaApi(lastEntry.angle, totalDuration, batch.length)
      .then((delivered) => {
        if (delivered) {
          // Drop only the entries that were sent; rotations buffered while the
          // request was in flight must survive.
          pendingRotations.current = pendingRotations.current.slice(batch.length)
          return
        }

        // Keep the batch so the next flush retries it instead of losing stats.
        if (pendingRotations.current.length > MAX_PENDING_ROTATIONS) {
          pendingRotations.current = pendingRotations.current.slice(-MAX_PENDING_ROTATIONS)
        }
      })
      .catch(() => {
        // Network failure: keep the batch for the next flush.
      })
      .finally(() => {
        flushInFlight.current = false
      })
  }, [])

  // Flush rotations on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (pendingRotations.current.length > 0) {
        const batch = pendingRotations.current
        const lastEntry = batch[batch.length - 1]
        const totalDuration = batch.reduce((sum, r) => sum + r.duration, 0)
        // Use sendBeacon for reliable page-unload reporting
        const data = JSON.stringify({
          angle: lastEntry.angle,
          duration: totalDuration,
          count: batch.length,
          date: getLocalStatsDate(),
        })
        navigator.sendBeacon?.('/api/stats/rotation', data)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  // Periodically flush rotation batch
  useEffect(() => {
    const timer = setInterval(flushRotations, BATCH_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      flushRotations() // Flush on cleanup
    }
  }, [flushRotations])

  // Manually rehydrate zustand store after mount
  useEffect(() => {
    try {
      useRotationStore.persist?.rehydrate?.()
    } catch (e) {
      console.error('Rehydration failed:', e)
    }
  }, [])

  // Reset angle to 0 on settings page
  useEffect(() => {
    if (isSettingsPage || !Number.isFinite(angle)) {
      setAngle(0)
    }
  }, [angle, isSettingsPage, setAngle])

  // Handle rotation logic
  useEffect(() => {
    if (!isHydrated) return

    if (isPaused || effectiveMode === 'fixed' || prefersReducedMotion || isSettingsPage) {
      return
    }

    // Continuous mode: change angle at intervals
    const timer = setInterval(() => {
      const newAngle = getNextRandomAngle(previousAngle.current)
      setAngle(newAngle)

      // Buffer rotation for batch reporting
      const now = Date.now()
      const previousTime = lastRotationTime.current ?? now
      const duration = Math.round((now - previousTime) / 1000)
      lastRotationTime.current = now

      // Only buffer if there's a significant angle change
      if (Math.abs(newAngle - previousAngle.current) > 0.5) {
        pendingRotations.current.push({ angle: newAngle, duration })
        previousAngle.current = newAngle
      }
    }, effectiveInterval * 1000)

    return () => clearInterval(timer)
  }, [
    effectiveMode,
    effectiveInterval,
    isPaused,
    prefersReducedMotion,
    isSettingsPage,
    setAngle,
    isHydrated,
  ])

  // Handle manual mode (mouse follow)
  useEffect(() => {
    if (!isHydrated) return

    if (effectiveMode === 'fixed' && !prefersReducedMotion && !isSettingsPage) {
      const handleMouseMove = (e: MouseEvent) => {
        const xFactor = (e.clientX / window.innerWidth) * 2 - 1
        latestMouseAngle.current = xFactor * 15

        // Coalesce to one update per animation frame: mousemove can fire
        // hundreds of times per second and each call re-rendered the whole
        // tilt tree.
        if (mouseFrame.current !== null) return

        mouseFrame.current = window.requestAnimationFrame(() => {
          mouseFrame.current = null
          const next = latestMouseAngle.current
          if (Math.abs(next - previousAngle.current) < MIN_MOUSE_ANGLE_DELTA) return
          previousAngle.current = next
          setAngle(next)
        })
      }

      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        if (mouseFrame.current !== null) {
          window.cancelAnimationFrame(mouseFrame.current)
          mouseFrame.current = null
        }
      }
    }
  }, [effectiveMode, prefersReducedMotion, isSettingsPage, setAngle, isHydrated])

  // Render without animation on reduced motion or settings-like pages
  if (prefersReducedMotion || isSettingsPage) {
    return (
      <div
        className={cn(
          'h-screen overflow-x-hidden overflow-y-auto',
          !isSettingsPage && 'scrollbar-hide'
        )}
        data-testid="tilt-wrapper"
      >
        {children}
      </div>
    )
  }

  return (
    <m.div
      animate={{ rotate: safeAngle }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className={cn(
        'h-screen overflow-x-hidden overflow-y-auto',
        !isSettingsPage && 'scrollbar-hide'
      )}
      data-testid="tilt-wrapper"
    >
      {children}
    </m.div>
  )
}
