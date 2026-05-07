import { getRuntimeMode, isNonProductionRuntime } from '@/lib/config/runtime-env'
import { logError } from '@/lib/utils/error-handler'

export interface DailyNewsItem {
  news: string[]
  tip: string
  date: string
  lunar_date: string
  image: string
  cover: string
  link: string // url to original article
  updated: string
  day_of_week: string
}

export interface AiNewsItem {
  title: string
  description: string
  pic: string
  link: string
  source: string
  date: string
}

interface VikiResponse<T> {
  code: number
  message: string
  data: T
}

const BASE_URL = 'https://60s.viki.moe/v2'
const suppressedDailyNewsWarnings = new Set<string>()

class DailyNewsUpstreamError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'DailyNewsUpstreamError'
  }
}

function getUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isLocalHostname(hostname: string | null): boolean {
  if (!hostname) {
    return false
  }

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  )
}

function shouldSuppressOptionalUpstreamError(error: unknown, url: string): boolean {
  if (!isNonProductionRuntime()) {
    return false
  }

  if (isLocalHostname(getUrlHostname(url))) {
    return false
  }

  return (
    error instanceof DailyNewsUpstreamError ||
    error instanceof TypeError ||
    error instanceof SyntaxError
  )
}

function logOptionalUpstreamFailure(
  error: unknown,
  context: {
    action: 'fetchDailyNews' | 'fetchAiNews'
    url: string
    fallbackLabel: string
  }
) {
  if (!shouldSuppressOptionalUpstreamError(error, context.url)) {
    logError(error, context)
    return
  }

  const status =
    error instanceof DailyNewsUpstreamError && typeof error.statusCode === 'number'
      ? error.statusCode
      : 'network'
  const warningKey = `${getRuntimeMode()}:${context.action}:${context.url}:${status}`

  if (suppressedDailyNewsWarnings.has(warningKey)) {
    return
  }

  suppressedDailyNewsWarnings.add(warningKey)

  const hostname = getUrlHostname(context.url) || context.url
  console.warn(
    `[daily-news] Suppressed expected upstream ${status} from ${hostname} during ${getRuntimeMode()}; using empty ${context.fallbackLabel} fallback.`
  )
}

export async function fetchDailyNews(): Promise<DailyNewsItem | null> {
  const url = `${BASE_URL}/60s?encoding=json`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new DailyNewsUpstreamError('Failed to fetch daily news', res.status)
    }

    const json: VikiResponse<DailyNewsItem> = await res.json()
    return json.data
  } catch (error) {
    logOptionalUpstreamFailure(error, {
      action: 'fetchDailyNews',
      url,
      fallbackLabel: 'daily news',
    })
    return null
  }
}

export async function fetchAiNews(): Promise<AiNewsItem[] | null> {
  const url = `${BASE_URL}/ai-news`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new DailyNewsUpstreamError('Failed to fetch AI news', res.status)
    }

    const json: VikiResponse<{ date: string; news: AiNewsItem[] }> = await res.json()
    return json.data.news
  } catch (error) {
    logOptionalUpstreamFailure(error, {
      action: 'fetchAiNews',
      url,
      fallbackLabel: 'AI news',
    })
    return null
  }
}
