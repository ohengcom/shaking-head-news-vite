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

export async function getHotList(sourceId: string): Promise<HotItem[]> {
  try {
    const apiPath = API_PATH_MAP[sourceId] || sourceId
    const res = await fetch(`https://60s.viki.moe/v2/${apiPath}`)

    if (!res.ok) {
      throw new Error(`Failed to fetch ${sourceId} hot list`)
    }

    const data = await res.json()
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

    // Generic handling: map 'link' to 'url' if url is missing
    // Detailed verification showed Douyin, Weibo, Bilibili use 'link'
    if (Array.isArray(data.data)) {
      return data.data.map(mapHotItem).filter((item): item is HotItem => Boolean(item))
    }

    return []
  } catch (error) {
    console.error(`Error fetching hot list for ${sourceId}:`, error)
    return []
  }
}
