import { getSettingsViaApi, type SettingsApiResponse } from './settings-client'

/**
 * Shared client-side cache for `/api/settings`.
 *
 * Header, Stats page and the ads loader each used to fetch the settings
 * document on mount, so a single page view could issue the same request three
 * times. This module collapses concurrent calls into one request and keeps the
 * result for a short window.
 */
const SETTINGS_CACHE_TTL_MS = 30 * 1000

let cached: { at: number; value: SettingsApiResponse } | null = null
let inFlight: Promise<SettingsApiResponse> | null = null

export function invalidateSettingsCache(): void {
  cached = null
  inFlight = null
}

export function primeSettingsCache(value: SettingsApiResponse): void {
  cached = { at: Date.now(), value }
}

export async function getCachedSettings(
  options: { force?: boolean } = {}
): Promise<SettingsApiResponse | null> {
  if (!options.force && cached && Date.now() - cached.at < SETTINGS_CACHE_TTL_MS) {
    return cached.value
  }

  if (!options.force && inFlight) {
    return inFlight
  }

  const request = getSettingsViaApi()
    .then((value) => {
      cached = { at: Date.now(), value }
      return value
    })
    .finally(() => {
      if (inFlight === request) {
        inFlight = null
      }
    })

  inFlight = request
  return request
}
