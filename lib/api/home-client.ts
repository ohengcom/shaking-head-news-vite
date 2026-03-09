'use client'

import type { HomePersonalizationResponse } from '@/types/home'

export async function getHomePersonalizationViaApi(): Promise<HomePersonalizationResponse> {
  try {
    const response = await fetch('/api/home', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })

    let result: HomePersonalizationResponse | null = null
    try {
      result = (await response.json()) as HomePersonalizationResponse
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
      error: error instanceof Error ? error.message : 'Failed to call home API',
    }
  }
}
