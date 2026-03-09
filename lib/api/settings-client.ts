'use client'

import type { UserSettings } from '@/types/settings'

type SettingsApiAction = 'update' | 'reset' | 'togglePro'

interface SettingsApiRequestBody {
  action: SettingsApiAction
  payload?: unknown
}

interface SettingsApiResponse {
  success: boolean
  error?: string
  settings?: UserSettings
  isPro?: boolean
}

async function callSettingsApi(body: SettingsApiRequestBody): Promise<SettingsApiResponse> {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(body),
    })

    let result: SettingsApiResponse | null = null
    try {
      result = (await response.json()) as SettingsApiResponse
    } catch {
      result = null
    }

    if (result && typeof result.success === 'boolean') {
      return result
    }

    return {
      success: false,
      error: `Request failed with status ${response.status}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to call settings API',
    }
  }
}

export function updateSettingsViaApi(
  settings: Partial<UserSettings>
): Promise<SettingsApiResponse> {
  return callSettingsApi({
    action: 'update',
    payload: settings,
  })
}

export function resetSettingsViaApi(): Promise<SettingsApiResponse> {
  return callSettingsApi({
    action: 'reset',
  })
}

export function toggleProViaApi(): Promise<SettingsApiResponse> {
  return callSettingsApi({
    action: 'togglePro',
  })
}
