import {
  RawNewsResponseSchema,
  NewsItemSchema,
  type NewsItem,
  type NewsResponse,
} from '@/types/news'
import { z } from 'zod'
import { logError, validateOrThrow, retryWithBackoff } from '@/lib/utils/error-handler'
import { NewsAPIError } from '@/lib/errors/news-error'
import { safeFetch, UnsafeUrlError } from '@/lib/utils/safe-fetch'
import { XMLParser } from 'fast-xml-parser'
import { auth } from '@/lib/auth'
import { getRSSSources } from '@/lib/actions/rss'
import { fetchAiNews } from '@/lib/api/daily-news'
import { getHotList } from '@/lib/api/hot-list'
import { getEnvValue, getRuntimeMode, isNonProductionRuntime } from '@/lib/config/runtime-env'

const DEFAULT_NEWS_API_BASE_URL = 'https://news.ravelloh.top'
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000
const NEWS_FETCH_TIMEOUT_MS = 10 * 1000
const RSS_FETCH_TIMEOUT_MS = 10 * 1000
const MAX_RSS_FEED_BYTES = 1024 * 1024
// Workers free tier allows 50 subrequests per request; cap custom RSS fetches
// so a fully-loaded account stays inside the budget alongside auth, settings,
// and hot list reads. Every feed is also cached briefly, so a page reload does
// not re-download all of them.
const MAX_RSS_SOURCES_PER_REQUEST = 10
const MAX_ITEMS_PER_RSS_FEED = 20
const MAX_TOTAL_CUSTOM_ITEMS = 200
const RSS_FEED_CACHE_TTL_MS = 5 * 60 * 1000
const RSS_FEED_CACHE_MAX_ENTRIES = 100
const NEWS_MAX_RETRIES = 1
const suppressedNewsFetchWarnings = new Set<string>()
const newsCache = new Map<string, { expiresAt: number; value: NewsResponse }>()
const rssFeedCache = new Map<string, { expiresAt: number; value: NewsItem[] }>()
const rssFeedInFlight = new Map<string, Promise<NewsItem[]>>()

function getNewsApiBaseUrl() {
  return getEnvValue('NEWS_API_BASE_URL') || DEFAULT_NEWS_API_BASE_URL
}

/**
 * Test helper: drop module-level caches so one test cannot observe another
 * test's feeds.
 */
export function resetNewsCaches(): void {
  newsCache.clear()
  rssFeedCache.clear()
  rssFeedInFlight.clear()
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

function shouldSuppressNewsFetchError(error: unknown, url: string): error is NewsAPIError {
  if (!isNonProductionRuntime() || !(error instanceof NewsAPIError)) {
    return false
  }

  if (![401, 403, 404].includes(error.statusCode ?? 0)) {
    return false
  }

  return !isLocalHostname(getUrlHostname(url))
}

function logNewsFetchFailure(
  error: unknown,
  context: {
    action: string
    url: string
    language: 'zh' | 'en'
    source?: string
  }
) {
  if (!shouldSuppressNewsFetchError(error, context.url)) {
    logError(error, context)
    return
  }

  const warningKey = `${getRuntimeMode()}:${context.url}:${error.statusCode}`
  if (suppressedNewsFetchWarnings.has(warningKey)) {
    return
  }

  suppressedNewsFetchWarnings.add(warningKey)

  const hostname = getUrlHostname(context.url) || context.url
  console.warn(
    `[news] Suppressed expected upstream ${error.statusCode} from ${hostname} during ${getRuntimeMode()}; using empty feed fallback.`
  )
}

function getContentLength(response: Response): number | null {
  const raw = response.headers.get('content-length')
  if (!raw) {
    return null
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

async function readBoundedText(response: Response, maxBytes: number, sourceUrl: string) {
  const contentLength = getContentLength(response)
  if (contentLength !== null && contentLength > maxBytes) {
    throw new NewsAPIError('RSS feed is too large', 413, sourceUrl)
  }

  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let receivedBytes = 0
  let text = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      receivedBytes += value.byteLength
      if (receivedBytes > maxBytes) {
        await reader.cancel()
        throw new NewsAPIError('RSS feed is too large', 413, sourceUrl)
      }

      text += decoder.decode(value, { stream: true })
    }

    text += decoder.decode()
    return text
  } finally {
    reader.releaseLock()
  }
}

async function fetchNews(language: 'zh' | 'en' = 'zh', source?: string): Promise<NewsResponse> {
  const newsApiBaseUrl = getNewsApiBaseUrl()
  const url = source
    ? `${newsApiBaseUrl}/${source}.json?lang=${language}`
    : `${newsApiBaseUrl}/latest.json?lang=${language}`

  try {
    const response = await retryWithBackoff(
      async () => {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(NEWS_FETCH_TIMEOUT_MS),
        })

        if (!res.ok) {
          throw new NewsAPIError(`Failed to fetch news: ${res.statusText}`, res.status, source)
        }

        return res
      },
      // One retry keeps the worst-case latency near 20s; the previous three
      // retries could hold a request open for ~47s with no client timeout.
      { maxRetries: NEWS_MAX_RETRIES }
    )

    const rawData = await response.json()

    // Validate raw response data
    const validatedRawData = validateOrThrow(RawNewsResponseSchema, rawData)

    // Transform to our format
    const items: NewsItem[] = validatedRawData.content.map((title, index) => ({
      id: `${validatedRawData.date}-${index}`,
      title,
      source: source || 'everydaynews',
      publishedAt: validatedRawData.date,
    }))

    const transformedData: NewsResponse = {
      items,
      total: items.length,
      updatedAt: new Date().toISOString(),
    }

    return transformedData
  } catch (error) {
    logNewsFetchFailure(error, {
      action: 'getNews',
      url,
      language,
      source,
    })

    // Re-throw with context
    if (error instanceof NewsAPIError) {
      throw error
    }

    if (error instanceof z.ZodError) {
      throw new NewsAPIError('Invalid news data format received from API', 500, source)
    }

    throw new NewsAPIError('Failed to fetch news. Please try again later.', 500, source)
  }
}

/**
 * Get news from the upstream API.
 *
 * @param language - Language for news content ('zh' or 'en')
 * @param source - Optional specific news source
 * @returns News response with items
 */
export async function getNews(language: 'zh' | 'en' = 'zh', source?: string) {
  const cacheKey = `${language}:${source || 'latest'}`
  const cached = newsCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  const value = await fetchNews(language, source)
  newsCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + NEWS_CACHE_TTL_MS,
  })
  return value
}

/**
 * Fetch a feed through a short-lived cache with in-flight merging.
 *
 * Without this, every personalised home request re-downloaded up to 30 feeds
 * (multiple MiB and dozens of subrequests) even when nothing had changed.
 */
async function getCachedRSSNews(url: string): Promise<NewsItem[]> {
  const cached = rssFeedCache.get(url)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  const existing = rssFeedInFlight.get(url)
  if (existing) {
    return existing
  }

  const pending = getRSSNews(url)
  rssFeedInFlight.set(url, pending)

  try {
    const value = await pending
    rssFeedCache.set(url, {
      value,
      expiresAt: Date.now() + RSS_FEED_CACHE_TTL_MS,
    })

    if (rssFeedCache.size > RSS_FEED_CACHE_MAX_ENTRIES) {
      const oldest = rssFeedCache.keys().next()
      if (!oldest.done) {
        rssFeedCache.delete(oldest.value)
      }
    }

    return value
  } finally {
    rssFeedInFlight.delete(url)
  }
}

/**
 * Get user's custom news from RSS feeds
 */
export async function getUserCustomNews(): Promise<NewsItem[]> {
  try {
    const session = await auth()
    if (!session?.user?.id) return []

    const rssSources = await getRSSSources()
    if (rssSources.length === 0) return []

    // Deduplicate by URL and cap the number of feeds fetched per request so a
    // single account cannot amplify one page view into dozens of subrequests.
    const enabledSources = Array.from(
      new Map(
        rssSources
          .filter((s) => s.enabled !== false)
          .map((source) => [source.url.toLowerCase(), source] as const)
      ).values()
    ).slice(0, MAX_RSS_SOURCES_PER_REQUEST)

    if (enabledSources.length === 0) return []

    const results = await Promise.allSettled(enabledSources.map((s) => getCachedRSSNews(s.url)))
    const allItems: NewsItem[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const itemsWithSource = result.value.slice(0, MAX_ITEMS_PER_RSS_FEED).map((item) => ({
          ...item,
          source: item.source || enabledSources[index].name,
        }))
        allItems.push(...itemsWithSource)
      } else {
        console.error(`Failed to fetch RSS source ${enabledSources[index].url}:`, result.reason)
      }
    })

    if (allItems.length > 0) {
      allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    }

    return allItems.slice(0, MAX_TOTAL_CUSTOM_ITEMS)
  } catch (error) {
    console.error('Error in getUserCustomNews:', error)
    return []
  }
}

/**
 * Parse RSS feed XML to NewsItem array using fast-xml-parser
 */
function parseRSSFeed(xml: string, sourceUrl: string): NewsItem[] {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })
    const result = parser.parse(xml)

    const channel = result.rss?.channel || result.feed
    const items = channel?.item || channel?.entry || []

    // Handle single item case (fast-xml-parser might return object instead of array for single item)
    const itemsArray = Array.isArray(items) ? items : [items]

    const newsItems: NewsItem[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemsArray.forEach((item: any, index: number) => {
      try {
        // Extract fields with fallbacks for different RSS/Atom formats
        const title = item.title || 'Untitled'
        const link = item.link || item.guid || ''
        // Handle Atom link object
        const url = typeof link === 'object' && link['@_href'] ? link['@_href'] : link

        let description = item.description || item.summary || item.content || ''
        // Handle Atom content object
        if (typeof description === 'object' && description['#text']) {
          description = description['#text']
        }

        const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString()
        const guid = item.guid || item.id || url

        // Ensure description is a string
        if (typeof description !== 'string') {
          // Try to handle other object formats or fallback to empty string
          if (typeof description === 'number') {
            description = String(description)
          } else {
            description = ''
          }
        }

        // Try to extract image
        let imageUrl: string | undefined
        if (item.enclosure && item.enclosure['@_type']?.startsWith('image')) {
          imageUrl = item.enclosure['@_url']
        } else if (item['media:content'] && item['media:content']['@_url']) {
          imageUrl = item['media:content']['@_url']
        } else if (item['media:group'] && item['media:group']['media:content']) {
          const mediaContent = item['media:group']['media:content']
          imageUrl = Array.isArray(mediaContent) ? mediaContent[0]['@_url'] : mediaContent['@_url']
        } else {
          // Try to extract from description HTML
          const imgMatch = description.match(/<img.*?src="(.*?)".*?>/)
          if (imgMatch) {
            imageUrl = imgMatch[1]
          }
        }

        // Clean HTML from description
        const cleanDescription = description
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()

        // Convert pubDate to ISO format
        let isoDate: string
        try {
          isoDate = new Date(pubDate).toISOString()
        } catch {
          isoDate = new Date().toISOString()
        }

        const newsItem = validateOrThrow(NewsItemSchema, {
          id: typeof guid === 'object' ? guid['#text'] || `${sourceUrl}-${index}` : guid,
          title: typeof title === 'object' ? title['#text'] || 'Untitled' : title.trim(),
          description: cleanDescription || undefined,
          url: typeof url === 'string' ? url.trim() : '',
          source: sourceUrl,
          publishedAt: isoDate,
          imageUrl: imageUrl || undefined,
        })

        newsItems.push(newsItem)
      } catch (error) {
        // Skip invalid items but log for debugging
        logError(error, {
          action: 'parseRSSFeed',
          sourceUrl,
          itemIndex: index,
        })
      }
    })

    return newsItems
  } catch (error) {
    logError(error, {
      action: 'parseRSSFeed',
      sourceUrl,
    })
    throw new NewsAPIError('Failed to parse RSS feed')
  }
}

/**
 * Get news from RSS feed
 *
 * @param rssUrl - URL of the RSS feed
 * @returns Array of news items
 */
export async function getRSSNews(rssUrl: string): Promise<NewsItem[]> {
  try {
    // Single attempt per source: retried fetches multiply subrequest usage on
    // the Workers free tier and the caller can simply retry the page request.
    // safeFetch validates every URL (and redirect hop) against private and
    // reserved networks before opening a connection (SSRF guard).
    const res = await safeFetch(rssUrl, {
      headers: {
        'User-Agent': 'ShakingHeadNews/1.0',
      },
      signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      throw new NewsAPIError(`Failed to fetch RSS feed: ${res.statusText}`, res.status, rssUrl)
    }

    const xml = await readBoundedText(res, MAX_RSS_FEED_BYTES, rssUrl)

    // Parse RSS XML
    const items = parseRSSFeed(xml, rssUrl)

    if (items.length === 0) {
      throw new NewsAPIError('No valid items found in RSS feed', 404, rssUrl)
    }

    return items
  } catch (error) {
    logError(error, {
      action: 'getRSSNews',
      rssUrl,
    })

    if (error instanceof NewsAPIError) {
      throw error
    }

    if (error instanceof UnsafeUrlError) {
      throw new NewsAPIError('RSS URL was blocked for security reasons', 403, rssUrl)
    }

    throw new NewsAPIError(
      'Failed to fetch RSS feed. Please check the URL and try again.',
      500,
      rssUrl
    )
  }
}

/**
 * Get AI News as standard NewsItem[]
 */
export async function getAiNewsItems(): Promise<NewsItem[]> {
  try {
    const aiNews = await fetchAiNews()
    if (!aiNews) return []

    return aiNews.map((item, index) => ({
      id: `ai-${item.date}-${index}`,
      title: item.title,
      description: item.description,
      url: item.link,
      source: `AI News (${item.source})`,
      publishedAt: item.date || new Date().toISOString(),
      imageUrl: item.pic,
    }))
  } catch (error) {
    console.error('Error adapting AI news:', error)
    return []
  }
}

/**
 * Get Hot List News as standard NewsItem[]
 */
export async function getHotListNews(sourceId: string, sourceName: string): Promise<NewsItem[]> {
  try {
    const items = await getHotList(sourceId)
    if (!items) return []

    return items.map((item, index) => ({
      id: `hot-${sourceId}-${index}`,
      title: item.title,
      description: item.hot ? `热度: ${item.hot}` : undefined,
      url: item.url,
      source: sourceName,
      publishedAt: new Date().toISOString(),
    }))
  } catch (error) {
    console.error(`Error adapting Hot List news for ${sourceId}:`, error)
    return []
  }
}
