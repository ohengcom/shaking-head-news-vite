import { NextResponse } from 'next/server'
import { getHotListNews, getUserCustomNews } from '@/lib/actions/news'
import { getUserSettings } from '@/lib/actions/settings'
import { HOT_LIST_SOURCES } from '@/lib/api/hot-list'
import type { NewsItem } from '@/types/news'
import type { HomePersonalizationResponse } from '@/types/home'

export async function GET() {
  try {
    const settings = await getUserSettings()

    if (!settings.userId) {
      return NextResponse.json<HomePersonalizationResponse>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const enabledSourceIds = settings.newsSources
      .filter((id) => id !== 'everydaynews')
      .filter((id) => HOT_LIST_SOURCES.some((source) => source.id === id))

    const [customNews, ...dynamicSourcesData] = await Promise.all([
      settings.isPro ? getUserCustomNews().catch(() => []) : Promise.resolve([]),
      ...enabledSourceIds.map((id) => {
        const sourceName = HOT_LIST_SOURCES.find((source) => source.id === id)?.name || id
        return getHotListNews(id, sourceName).catch(() => [])
      }),
    ])

    const dynamicNewsMap = enabledSourceIds.reduce<Record<string, NewsItem[]>>((acc, id, index) => {
      acc[id] = dynamicSourcesData[index] || []
      return acc
    }, {})

    return NextResponse.json<HomePersonalizationResponse>({
      success: true,
      payload: {
        settings,
        customNews,
        dynamicNewsMap,
      },
    })
  } catch (error) {
    return NextResponse.json<HomePersonalizationResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load home personalization',
      },
      { status: 500 }
    )
  }
}
