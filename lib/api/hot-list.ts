import {
  HOT_LIST_SOURCES,
  type HotItem,
  type HotListResponse,
  type HotListSourceId,
} from '@/lib/constants/hot-list-sources'

export { HOT_LIST_SOURCES, type HotItem, type HotListResponse, type HotListSourceId }

const API_PATH_MAP: Record<string, string> = {
  baidu: 'baidu/hot',
  bilibili: 'bili',
  juejin: 'juejin',
  netease: 'netease',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toHotString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function mapHotItem(item: unknown): HotItem | null {
  if (!isRecord(item) || typeof item.title !== 'string') {
    return null
  }

  return {
    title: item.title,
    url: toHotString(item.url) || toHotString(item.link),
    hot: toHotString(item.hot) || toHotString(item.hot_value) || toHotString(item.year),
  }
}

const HOT_LIST_CACHE_TTL_MS = 5 * 60 * 1000
// Hot lists are identical for every visitor, so a shared per-colo Cache API
// entry shields the upstream API when many users hit /api/home at once.
const HOT_LIST_EDGE_CACHE_TTL_SECONDS = 10 * 60
const HOT_LIST_FETCH_TIMEOUT_MS = 8 * 1000
const hotListCache = new Map<string, { expiresAt: number; items: HotItem[] }>()

interface EdgeCacheLike {
  match: (request: Request) => Promise<Response | undefined>
  put: (request: Request, response: Response) => Promise<undefined>
}

function getEdgeCache(): EdgeCacheLike | null {
  try {
    const cacheStorage = (globalThis as { caches?: { default?: EdgeCacheLike } }).caches
    return cacheStorage?.default ?? null
  } catch {
    return null
  }
}

function getHotListCacheRequest(sourceId: string): Request {
  const apiPath = API_PATH_MAP[sourceId] || sourceId
  return new Request(`https://60s.viki.moe/v2/${apiPath}`, { method: 'GET' })
}

function getCachedHotList(sourceId: string): HotItem[] | null {
  const cached = hotListCache.get(sourceId)
  if (!cached) {
    return null
  }

  if (Date.now() >= cached.expiresAt) {
    hotListCache.delete(sourceId)
    return null
  }

  return cached.items
}

function setCachedHotList(sourceId: string, items: HotItem[]): void {
  // Hot lists change slowly; a short per-isolate cache keeps /api/home well
  // below the Workers free-tier subrequest limit and shields the upstream.
  hotListCache.set(sourceId, {
    expiresAt: Date.now() + HOT_LIST_CACHE_TTL_MS,
    items,
  })
}

function parseHotListPayload(data: unknown, sourceId: string): HotItem[] {
  if (!isRecord(data)) {
    return []
  }

  // Handle "today-in-history" special structure
  if (sourceId === 'today-in-history') {
    const payload = data.data
    if (isRecord(payload) && Array.isArray(payload.items)) {
      return payload.items.map(mapHotItem).filter((item): item is HotItem => Boolean(item))
    }

    return []
  }

  if (Array.isArray(data.data)) {
    // Generic handling: map 'link' to 'url' if url is missing
    // Detailed verification showed Douyin, Weibo, Bilibili use 'link'
    return data.data.map(mapHotItem).filter((item): item is HotItem => Boolean(item))
  }

  return []
}

async function readEdgeCachedHotList(sourceId: string): Promise<HotItem[] | null> {
  const cache = getEdgeCache()
  if (!cache) {
    return null
  }

  try {
    const cached = await cache.match(getHotListCacheRequest(sourceId))
    if (!cached) {
      return null
    }

    const items = parseHotListPayload(await cached.json(), sourceId)
    setCachedHotList(sourceId, items)
    return items
  } catch {
    return null
  }
}

async function writeEdgeCachedHotList(sourceId: string, data: unknown): Promise<void> {
  const cache = getEdgeCache()
  if (!cache) {
    return
  }

  try {
    await cache.put(
      getHotListCacheRequest(sourceId),
      new Response(JSON.stringify(data), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, max-age=${HOT_LIST_EDGE_CACHE_TTL_SECONDS}`,
        },
      })
    )
  } catch {
    // Edge cache writes are best-effort; the per-isolate cache still applies.
  }
}

export async function getHotList(sourceId: string): Promise<HotItem[]> {
  const cached = getCachedHotList(sourceId)
  if (cached) {
    return cached
  }

  const edgeCached = await readEdgeCachedHotList(sourceId)
  if (edgeCached) {
    return edgeCached
  }

  try {
    const apiPath = API_PATH_MAP[sourceId] || sourceId
    const res = await fetch(`https://60s.viki.moe/v2/${apiPath}`, {
      signal: AbortSignal.timeout(HOT_LIST_FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch ${sourceId} hot list`)
    }

    const data = await res.json()
    const items = parseHotListPayload(data, sourceId)

    setCachedHotList(sourceId, items)
    await writeEdgeCachedHotList(sourceId, data)

    return items
  } catch (error) {
    console.error(`Error fetching hot list for ${sourceId}:`, error)
    return []
  }
}
