'use client'

import type { UserSettings } from '@/types/settings'

type SettingsApiAction = 'update' | 'reset' | 'togglePro'

interface SettingsApiRequestBody {
  action: SettingsApiAction
  payload?: unknown
}

export interface SettingsApiResponse {
  success: boolean
  error?: string
  settings?: UserSettings
  isPro?: boolean
  authenticated?: boolean
}

async function callSettingsApi(
  method: 'GET' | 'POST',
  body?: SettingsApiRequestBody
): Promise<SettingsApiResponse> {
  try {
    const response = await fetch('/api/settings', {
      method,
      headers: body
        ? {
            'content-type': 'application/json',
          }
        : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
      body: body ? JSON.stringify(body) : undefined,
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

export function getSettingsViaApi(): Promise<SettingsApiResponse> {
  return callSettingsApi('GET')
}

export function updateSettingsViaApi(
  settings: Partial<UserSettings>
): Promise<SettingsApiResponse> {
  return callSettingsApi('POST', {
    action: 'update',
    payload: settings,
  })
}

export function resetSettingsViaApi(): Promise<SettingsApiResponse> {
  return callSettingsApi('POST', {
    action: 'reset',
  })
}

export function toggleProViaApi(): Promise<SettingsApiResponse> {
  return callSettingsApi('POST', {
    action: 'togglePro',
  })
}
