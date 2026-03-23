import type { NewsItem } from '@/types/news'

export interface HomeFeedResponse {
  success: boolean
  error?: string
  payload?: {
    dailyNews: NewsItem[]
    aiNews: NewsItem[]
  }
}

export async function getHomeFeedViaApi(): Promise<HomeFeedResponse> {
  try {
    const response = await fetch('/api/feed/home', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
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
