import type { HomeFeedResponse } from '@/types/news'

export type HomeFeedLocale = 'zh' | 'en'

interface InitialHomeFeedSnapshot {
  locale: HomeFeedLocale
  data: HomeFeedResponse
}

declare global {
  interface Window {
    __HOME_FEED__?: InitialHomeFeedSnapshot
  }
}

export function getInitialHomeFeed(locale: HomeFeedLocale): HomeFeedResponse | null {
  if (typeof window === 'undefined') {
    return null
  }

  const snapshot = window.__HOME_FEED__
  if (!snapshot || snapshot.locale !== locale || !snapshot.data.success || !snapshot.data.payload) {
    return null
  }

  return snapshot.data
}

export async function getHomeFeedViaApi(locale: HomeFeedLocale): Promise<HomeFeedResponse> {
  try {
    const response = await fetch(`/api/feed/home?locale=${locale}`, {
      method: 'GET',
      credentials: 'same-origin',
    })

    const result = (await response.json()) as HomeFeedResponse
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
      error: error instanceof Error ? error.message : 'Failed to load home feed',
    }
  }
}
