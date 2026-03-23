import type { RSSSource } from '@/types/rss'

interface RssApiResponse<T> {
  success: boolean
  error?: string
  payload?: T
}

async function parseJsonResponse<T>(response: Response): Promise<RssApiResponse<T>> {
  return (await response.json()) as RssApiResponse<T>
}

export function getRSSSourcesViaApi() {
  return fetch('/api/rss', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  }).then(parseJsonResponse<RSSSource[]>)
}

export function getDefaultRSSSourcesViaApi() {
  return fetch('/api/rss/defaults', {
    method: 'GET',
    cache: 'force-cache',
  }).then(parseJsonResponse<RSSSource[]>)
}

export async function addRSSSourceViaApi(
  payload: Omit<RSSSource, 'id' | 'order' | 'failureCount'>
): Promise<RSSSource> {
  const response = await fetch('/api/rss', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await parseJsonResponse<RSSSource>(response)
  if (!result.success || !result.payload) {
    throw new Error(result.error || 'Failed to add RSS source')
  }

  return result.payload
}

export async function updateRSSSourceViaApi(
  id: string,
  payload: Partial<RSSSource>
): Promise<RSSSource> {
  const response = await fetch(`/api/rss/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await parseJsonResponse<RSSSource>(response)
  if (!result.success || !result.payload) {
    throw new Error(result.error || 'Failed to update RSS source')
  }

  return result.payload
}

export async function deleteRSSSourceViaApi(id: string) {
  const response = await fetch(`/api/rss/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })

  const result = await parseJsonResponse<null>(response)
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete RSS source')
  }
}

export async function reorderRSSSourcesViaApi(sourceIds: string[]): Promise<RSSSource[]> {
  const response = await fetch('/api/rss/reorder', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sourceIds }),
  })

  const result = await parseJsonResponse<RSSSource[]>(response)
  if (!result.success || !result.payload) {
    throw new Error(result.error || 'Failed to reorder RSS sources')
  }

  return result.payload
}

export async function exportOPMLViaApi(): Promise<string> {
  const response = await fetch('/api/rss/export', {
    method: 'GET',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Failed to export OPML')
  }

  return response.text()
}

export async function importOPMLViaApi(opmlContent: string) {
  const response = await fetch('/api/rss/import', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
    body: opmlContent,
  })

  const result = await parseJsonResponse<{ imported: number; skipped: number }>(response)
  if (!result.success || !result.payload) {
    throw new Error(result.error || 'Failed to import OPML')
  }

  return result.payload
}
