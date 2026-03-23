'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

const RELOAD_WINDOW_MS = 5 * 60 * 1000
const MAX_RELOADS_PER_WINDOW = 3
const SOFT_REFRESH_AFTER_HIDDEN_MS = 10 * 60 * 1000

const RELOAD_STATE_KEY = '__sn_runtime_reload_state__'
const PENDING_RELOAD_KEY = '__sn_runtime_pending_reload__'

function getMessage(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

function looksLikeChunkLoadError(message: string): boolean {
  const normalized = message.toLowerCase()

  return (
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('css chunk load failed') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('error loading dynamically imported module')
  )
}

function looksLikeServerComponentRenderError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('server components render') ||
    normalized.includes('server component render') ||
    normalized.includes('digest property is included')
  )
}

function looksLikeHashedAssetUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href)
    const { pathname } = parsed
    const isAssetPath = pathname.includes('/assets/') || pathname.includes('/_next/static/')
    const isCode = pathname.endsWith('.js') || pathname.endsWith('.css')
    return isAssetPath && isCode
  } catch {
    return false
  }
}

function readReloadState(): { windowStart: number; count: number } {
  if (typeof sessionStorage === 'undefined') {
    return { windowStart: Date.now(), count: 0 }
  }

  try {
    const raw = sessionStorage.getItem(RELOAD_STATE_KEY)
    if (!raw) return { windowStart: Date.now(), count: 0 }
    const parsed = JSON.parse(raw) as { windowStart?: unknown; count?: unknown }

    const windowStart = typeof parsed.windowStart === 'number' ? parsed.windowStart : Date.now()
    const count = typeof parsed.count === 'number' ? parsed.count : 0

    return { windowStart, count }
  } catch {
    return { windowStart: Date.now(), count: 0 }
  }
}

function writeReloadState(state: { windowStart: number; count: number }) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

function markPendingReload(reason: string) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(PENDING_RELOAD_KEY, reason || '1')
  } catch {
    // Ignore storage failures.
  }
}

function clearPendingReload() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(PENDING_RELOAD_KEY)
  } catch {
    // Ignore storage failures.
  }
}

function hasPendingReload(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    return Boolean(sessionStorage.getItem(PENDING_RELOAD_KEY))
  } catch {
    return false
  }
}

function canHardReloadNow(): boolean {
  const now = Date.now()
  const state = readReloadState()

  const inWindow = now - state.windowStart < RELOAD_WINDOW_MS
  const nextState = inWindow ? state : { windowStart: now, count: 0 }

  if (nextState.count >= MAX_RELOADS_PER_WINDOW) {
    return false
  }

  writeReloadState({ windowStart: nextState.windowStart, count: nextState.count + 1 })
  return true
}

function triggerHardReload(reason: string) {
  if (typeof window === 'undefined') return

  if (!navigator.onLine) {
    markPendingReload(reason)
    return
  }

  if (!canHardReloadNow()) {
    markPendingReload(reason)
    return
  }

  clearPendingReload()
  window.location.reload()
}

/**
 * Handles background/resume and chunk-load failures.
 *
 * This prevents a common "white screen" scenario where a dynamic import (or code-split chunk)
 * fails after the app has been kept open in the background (often across deployments).
 */
export function RuntimeRecovery() {
  const router = useRouter()
  const lastHiddenAt = useRef<number | null>(null)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastHiddenAt.current = Date.now()
        return
      }

      const hiddenAt = lastHiddenAt.current
      lastHiddenAt.current = null

      if (hasPendingReload()) {
        triggerHardReload('pending_reload')
        return
      }

      if (!hiddenAt) return

      const hiddenDuration = Date.now() - hiddenAt
      if (hiddenDuration >= SOFT_REFRESH_AFTER_HIDDEN_MS) {
        try {
          router.refresh()
        } catch {
          // Ignore refresh errors; hard reload is handled separately.
        }
      }
    }

    const handleOnline = () => {
      if (hasPendingReload()) {
        triggerHardReload('back_online')
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = getMessage(event.reason)
      if (looksLikeChunkLoadError(message) || looksLikeServerComponentRenderError(message)) {
        triggerHardReload(`unhandledrejection:${message}`)
      }
    }

    const handleWindowError = (event: Event) => {
      if (event instanceof ErrorEvent) {
        const message = getMessage(event.error || event.message)
        if (looksLikeChunkLoadError(message) || looksLikeServerComponentRenderError(message)) {
          triggerHardReload(`error:${message}`)
        }
        return
      }

      const target = event.target
      if (target instanceof HTMLScriptElement) {
        const url = target.src
        if (url && looksLikeHashedAssetUrl(url)) {
          triggerHardReload(`script:${url}`)
        }
        return
      }

      if (target instanceof HTMLLinkElement) {
        const url = target.href
        if (url && looksLikeHashedAssetUrl(url)) {
          triggerHardReload(`link:${url}`)
        }
      }
    }

    window.addEventListener('error', handleWindowError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('error', handleWindowError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router])

  return null
}
