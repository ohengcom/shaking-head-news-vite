interface SummaryStatsResponse {
  success: boolean
  error?: string
  payload?: {
    today: { count: number; duration: number }
    week: { count: number; duration: number }
    month: { count: number; duration: number }
    dailyData: Array<{ date: string; count: number; duration: number }>
    monthlyData: Array<{ date: string; count: number; duration: number }>
    dailyGoal: number
    isPro: boolean
  }
}

interface HealthReminderResponse {
  shouldRemind: boolean
  lastRotationTime: number | null
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function getSummaryStatsViaApi(): Promise<SummaryStatsResponse> {
  try {
    const response = await fetch('/api/stats/summary', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })

    return await parseJsonResponse<SummaryStatsResponse>(response)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load summary stats',
    }
  }
}

export async function recordRotationViaApi(angle: number, duration: number) {
  await fetch('/api/stats/rotation', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ angle, duration }),
  })
}

export async function checkHealthReminderViaApi(): Promise<HealthReminderResponse> {
  try {
    const response = await fetch('/api/stats/health-reminder', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })

    return await parseJsonResponse<HealthReminderResponse>(response)
  } catch {
    return { shouldRemind: false, lastRotationTime: null }
  }
}
