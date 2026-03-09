import type { NewsItem } from '@/types/news'
import type { UserSettings } from '@/types/settings'

export interface HomePersonalizationPayload {
  settings: UserSettings
  customNews: NewsItem[]
  dynamicNewsMap: Record<string, NewsItem[]>
}

export interface HomePersonalizationResponse {
  success: boolean
  error?: string
  payload?: HomePersonalizationPayload
}
