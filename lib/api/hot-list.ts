export interface HotItem {
  title: string
  url: string
  hot?: string
}

export interface HotListResponse {
  code: number
  msg: string
  data: HotItem[]
  time: string
}

export const HOT_LIST_SOURCES = [
  { id: 'douyin', name: '抖音热搜', icon: '🎵' },
  { id: 'weibo', name: '微博热搜', icon: '🔴' },
  { id: 'bilibili', name: 'B站热搜', icon: '📺' },
  { id: 'zhihu', name: '知乎热榜', icon: '❓' },
  { id: 'baidu', name: '百度热搜', icon: '🔍' },
  { id: 'toutiao', name: '头条热榜', icon: '📰' },
  { id: 'today-in-history', name: '历史上的今天', icon: '📅' },
  { id: 'quark', name: '夸克热点', icon: '🌪️' },
  { id: 'rednote', name: '小红书', icon: '📕' },
  // { id: 'juejin', name: '掘金热榜', icon: '💎' },
  // { id: 'netease', name: '网易新闻', icon: '📰' },
] as const

export type HotListSourceId = (typeof HOT_LIST_SOURCES)[number]['id']

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
const HOT_LIST_FETCH_TIMEOUT_MS = 8 * 1000
const hotListCache = new Map<string, { expiresAt: number; items: HotItem[] }>()

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

export async function getHotList(sourceId: string): Promise<HotItem[]> {
  const cached = getCachedHotList(sourceId)
  if (cached) {
    return cached
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
    if (!isRecord(data)) {
      return []
    }

    let items: HotItem[]

    // Handle "today-in-history" special structure
    if (sourceId === 'today-in-history') {
      const payload = data.data
      if (isRecord(payload) && Array.isArray(payload.items)) {
        items = payload.items.map(mapHotItem).filter((item): item is HotItem => Boolean(item))
      } else {
        items = []
      }
    } else if (Array.isArray(data.data)) {
      // Generic handling: map 'link' to 'url' if url is missing
      // Detailed verification showed Douyin, Weibo, Bilibili use 'link'
      items = data.data.map(mapHotItem).filter((item): item is HotItem => Boolean(item))
    } else {
      items = []
    }

    // Hot lists change slowly; a short per-isolate cache keeps /api/home well
    // below the Workers free-tier subrequest limit and shields the upstream.
    hotListCache.set(sourceId, {
      expiresAt: Date.now() + HOT_LIST_CACHE_TTL_MS,
      items,
    })

    return items
  } catch (error) {
    console.error(`Error fetching hot list for ${sourceId}:`, error)
    return []
  }
}
