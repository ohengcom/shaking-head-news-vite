import { auth } from '@/lib/auth'
import { XMLParser } from 'fast-xml-parser'
import { StorageKeys } from '@/lib/storage'
import { readUserDoc, updateUserDoc } from '@/lib/server/user-doc'
import { safeFetch, UnsafeUrlError } from '@/lib/utils/safe-fetch'
import { RSSSourceSchema, RSSSource } from '@/types/rss'
import {
  APIError,
  AuthError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  logError,
  validateOrThrow,
} from '@/lib/utils/error-handler'
import { rateLimitByAction, RateLimitTiers } from '@/lib/rate-limit'
import { sanitizeUrl, sanitizeString } from '@/lib/utils/input-validation'
import { getUserTier } from '@/lib/tier-server'

const MAX_RSS_SOURCES = 50
const FEED_PROBE_TIMEOUT_MS = 8 * 1000
// Only the beginning of the document is needed to confirm it is a feed.
const FEED_PROBE_MAX_BYTES = 64 * 1024

// 默认 RSS 源（Guest 用户可见）
const DEFAULT_RSS_SOURCES: RSSSource[] = [
  {
    id: 'default-1',
    name: '新浪新闻',
    url: 'https://rss.sina.com.cn/news/china/focus15.xml',
    description: '新浪新闻焦点',
    language: 'zh',
    enabled: true,
    tags: ['新闻', '中国'],
    order: 0,
    failureCount: 0,
  },
  {
    id: 'default-2',
    name: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/rss.xml',
    description: 'BBC World News',
    language: 'en',
    enabled: true,
    tags: ['news', 'world'],
    order: 1,
    failureCount: 0,
  },
  {
    id: 'default-3',
    name: '36氪',
    url: 'https://36kr.com/feed',
    description: '36氪科技新闻',
    language: 'zh',
    enabled: true,
    tags: ['科技', '创业'],
    order: 2,
    failureCount: 0,
  },
]

// 获取默认 RSS 源（Guest 用户）
export async function getDefaultRSSSources(): Promise<RSSSource[]> {
  return DEFAULT_RSS_SOURCES
}

// 获取用户的 RSS 源列表
export async function getRSSSources(): Promise<RSSSource[]> {
  const session = await auth()

  if (!session?.user?.id) {
    return []
  }

  const key = StorageKeys.userRSSSources(session.user.id)
  // Strict read: a transient storage failure must abort the caller instead of
  // returning an empty list that a later write would persist over the data.
  const sources = (await readUserDoc<unknown[]>(key, { strict: true })) || []

  // Skip individually invalid entries instead of dropping the whole list, so
  // one corrupted source can never wipe the stored list on the next write.
  const validSources: RSSSource[] = []
  sources.forEach((source, index) => {
    try {
      validSources.push(validateOrThrow(RSSSourceSchema, source))
    } catch (error) {
      logError(error, {
        action: 'getRSSSources:skipInvalidSource',
        index,
      })
    }
  })

  return validSources
}

async function readResponsePrefix(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let receivedBytes = 0
  let text = ''

  try {
    while (receivedBytes < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    return text
  } finally {
    // Stop downloading the rest of the feed; only the prefix was needed.
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function looksLikeFeed(payload: string): boolean {
  return /<(rss|feed|rdf:RDF)\b/i.test(payload)
}

/**
 * Verify a user-supplied feed URL before storing it.
 *
 * This runs through `safeFetch`, which validates the scheme, the port, embedded
 * credentials, private/reserved hosts and every redirect hop. The previous
 * implementation issued a bare `fetch(url, { method: 'HEAD' })`, which followed
 * redirects to internal addresses and turned "add source" into a blind SSRF
 * probe. Only a small prefix of the body is read, so a hostile or huge document
 * cannot exhaust memory or CPU.
 */
async function assertReachableFeed(url: string): Promise<void> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FEED_PROBE_TIMEOUT_MS)

  try {
    const response = await safeFetch(url, {
      method: 'GET',
      headers: {
        accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'user-agent': 'ShakingHeadNews/1.0 (+https://sn.oheng.com)',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ValidationError('RSS URL is not accessible')
    }

    const prefix = await readResponsePrefix(response, FEED_PROBE_MAX_BYTES)
    if (!looksLikeFeed(prefix)) {
      throw new ValidationError('URL does not look like an RSS or Atom feed')
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }

    if (error instanceof UnsafeUrlError) {
      throw new ValidationError('RSS URL is blocked for security reasons')
    }

    throw new ValidationError('Invalid RSS URL or URL is not accessible')
  } finally {
    clearTimeout(timeoutId)
    controller.abort()
  }
}

// 添加 RSS 源
export async function addRSSSource(source: Omit<RSSSource, 'id' | 'order' | 'failureCount'>) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to add RSS sources')
    }

    // 速率限制：敏感操作限流（STRICT 档）
    const rateLimitResult = await rateLimitByAction(session.user.id, 'add-rss', {
      ...RateLimitTiers.STRICT,
    })

    if (!rateLimitResult.success) {
      throw new RateLimitError('Too many RSS sources added. Please try again later.')
    }

    // 清理和验证输入
    const sanitizedUrl = sanitizeUrl(source.url)
    if (!sanitizedUrl) {
      throw new ValidationError('Invalid RSS URL')
    }

    const sanitizedSource = {
      ...source,
      url: sanitizedUrl,
      name: sanitizeString(source.name, { maxLength: 200 }),
      description: source.description
        ? sanitizeString(source.description, { maxLength: 500 })
        : undefined,
      tags: source.tags.map((tag) => sanitizeString(tag, { maxLength: 50 })),
    }

    const existing = await getRSSSources()
    // Fail fast before opening a network connection.
    if (existing.length >= MAX_RSS_SOURCES) {
      throw new ValidationError(`Maximum number of RSS sources (${MAX_RSS_SOURCES}) reached`)
    }

    if (existing.some((item) => item.url.toLowerCase() === sanitizedUrl.toLowerCase())) {
      throw new ValidationError('This RSS feed is already in your list')
    }

    await assertReachableFeed(sanitizedUrl)

    const newSource: RSSSource = validateOrThrow(RSSSourceSchema, {
      ...sanitizedSource,
      id: globalThis.crypto.randomUUID(),
      order: existing.length,
      failureCount: 0,
    })

    const result = await updateUserDoc<unknown[]>(
      StorageKeys.userRSSSources(session.user.id),
      (current) => {
        const list = Array.isArray(current) ? current : []
        if (list.length >= MAX_RSS_SOURCES) {
          throw new ValidationError(`Maximum number of RSS sources (${MAX_RSS_SOURCES}) reached`)
        }
        return [...list, newSource]
      }
    )

    if (!Array.isArray(result.value)) {
      throw new APIError('Failed to save RSS source', 500, 'RSS_WRITE_FAILED')
    }

    return newSource
  } catch (error) {
    logError(error, {
      action: 'addRSSSource',
      source,
    })
    throw error
  }
}

// 允许客户端修改的字段白名单。id/order/failureCount 由服务端维护。
const UPDATABLE_RSS_FIELDS = ['name', 'url', 'description', 'language', 'enabled', 'tags'] as const

// 更新 RSS 源
export async function updateRSSSource(id: string, updates: Partial<RSSSource>) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to update RSS sources')
    }

    // 速率限制：每分钟最多200次更新 (Relaxed +)
    const rateLimitResult = await rateLimitByAction(session.user.id, 'update-rss', {
      limit: 200,
      window: 60,
    })

    if (!rateLimitResult.success) {
      throw new RateLimitError('Too many requests. Please try again later.')
    }

    const patch: Record<string, unknown> = {}
    for (const field of UPDATABLE_RSS_FIELDS) {
      const value = (updates as Record<string, unknown>)[field]
      if (value === undefined) continue

      if (field === 'url') {
        const sanitizedUrl = sanitizeUrl(String(value))
        if (!sanitizedUrl) {
          throw new ValidationError('Invalid RSS URL')
        }
        patch.url = sanitizedUrl
        continue
      }

      if (field === 'name') {
        patch.name = sanitizeString(String(value), { maxLength: 200 })
        continue
      }

      if (field === 'description') {
        patch.description = sanitizeString(String(value), { maxLength: 500 })
        continue
      }

      if (field === 'tags') {
        if (!Array.isArray(value)) {
          throw new ValidationError('RSS tags must be an array of strings')
        }
        patch.tags = value.map((tag) => sanitizeString(String(tag), { maxLength: 50 }))
        continue
      }

      if (field === 'language') {
        patch.language = value
        continue
      }

      if (field === 'enabled') {
        patch.enabled = value
      }
    }

    if (typeof patch.url === 'string') {
      await assertReachableFeed(patch.url)
    }

    const result = await updateUserDoc<unknown[]>(
      StorageKeys.userRSSSources(session.user.id),
      (current) => {
        const list = Array.isArray(current) ? current : []
        const index = list.findIndex((item) => (item as RSSSource)?.id === id)
        if (index === -1) {
          throw new NotFoundError('RSS source not found')
        }

        const next = [...list]
        next[index] = validateOrThrow(RSSSourceSchema, {
          ...(list[index] as RSSSource),
          ...patch,
          id,
        })
        return next
      }
    )

    if (!result.updated || !Array.isArray(result.value)) {
      throw new NotFoundError('RSS source not found')
    }

    const saved = result.value
      .map((item) => validateOrThrow(RSSSourceSchema, item))
      .find((item) => item.id === id)

    if (!saved) {
      throw new NotFoundError('RSS source not found')
    }

    return saved
  } catch (error) {
    logError(error, {
      action: 'updateRSSSource',
      id,
      updates,
    })
    throw error
  }
}

// 删除 RSS 源
export async function deleteRSSSource(id: string) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to delete RSS sources')
    }

    const result = await updateUserDoc<unknown[]>(
      StorageKeys.userRSSSources(session.user.id),
      (current) => {
        const list = Array.isArray(current) ? current : []
        if (!list.some((item) => (item as RSSSource)?.id === id)) {
          throw new NotFoundError('RSS source not found')
        }

        return list
          .filter((item) => (item as RSSSource)?.id !== id)
          .map((item, index) => ({ ...(item as RSSSource), order: index }))
      }
    )

    if (!result.updated) {
      throw new NotFoundError('RSS source not found')
    }
  } catch (error) {
    logError(error, {
      action: 'deleteRSSSource',
      id,
    })
    throw error
  }
}

// 重新排序 RSS 源
export async function reorderRSSSources(sourceIds: string[]) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to reorder RSS sources')
    }

    if (new Set(sourceIds).size !== sourceIds.length) {
      throw new ValidationError('Reorder payload must not contain duplicate ids')
    }

    const result = await updateUserDoc<unknown[]>(
      StorageKeys.userRSSSources(session.user.id),
      (current) => {
        const list = Array.isArray(current) ? current : []
        // A reorder is a permutation: it must include every source exactly
        // once. Accepting a subset used to delete the missing sources, and
        // duplicates used to clone entries.
        if (list.length !== sourceIds.length) {
          throw new ValidationError('Reorder payload must include every RSS source once')
        }

        const byId = new Map(list.map((item) => [(item as RSSSource).id, item as RSSSource]))

        return sourceIds.map((id, index) => {
          const source = byId.get(id)
          if (!source) {
            throw new ValidationError(`Unknown RSS source id: ${id}`)
          }
          return { ...source, order: index }
        })
      }
    )

    if (!result.updated || !Array.isArray(result.value)) {
      throw new APIError('Failed to reorder RSS sources', 500, 'RSS_WRITE_FAILED')
    }

    return result.value.map((item) => validateOrThrow(RSSSourceSchema, item))
  } catch (error) {
    logError(error, {
      action: 'reorderRSSSources',
      sourceIds,
    })
    throw error
  }
}

// XML 属性值转义，防止 XSS/注入
function escapeXmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// 导出 OPML
export async function exportOPML() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to export RSS sources')
    }

    const sources = await getRSSSources()

    if (sources.length === 0) {
      throw new ValidationError('No RSS sources to export')
    }

    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Shaking Head News - RSS Sources</title>
  </head>
  <body>
    ${sources
      .map(
        (s) => `
    <outline text="${escapeXmlAttr(s.name)}" 
             type="rss" 
             xmlUrl="${escapeXmlAttr(s.url)}" 
             htmlUrl="${escapeXmlAttr(s.url)}" />
    `
      )
      .join('')}
  </body>
</opml>`

    return opml
  } catch (error) {
    logError(error, {
      action: 'exportOPML',
    })
    throw error
  }
}

// 导入 OPML (Pro only)
export async function importOPML(
  opmlContent: string
): Promise<{ imported: number; skipped: number }> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthError('Please sign in to import RSS sources')
    }

    // 检查 Pro 权限
    const { features } = await getUserTier()
    if (!features.opmlImportExportEnabled) {
      throw new AuthError('OPML import requires Pro subscription')
    }

    // 速率限制
    const rateLimitResult = await rateLimitByAction(session.user.id, 'import-opml', {
      ...RateLimitTiers.STRICT,
    })

    if (!rateLimitResult.success) {
      throw new RateLimitError('Too many import attempts. Please try again later.')
    }

    // 解析 OPML
    const parsedSources = parseOPML(opmlContent)

    if (parsedSources.length === 0) {
      throw new ValidationError('No valid RSS sources found in OPML file')
    }

    let imported = 0
    let skipped = 0

    // The whole merge runs inside one versioned update so a concurrent add or
    // delete cannot be lost between reading and writing the list.
    await updateUserDoc<unknown[]>(StorageKeys.userRSSSources(session.user.id), (current) => {
      const list = Array.isArray(current) ? current : []
      const seenUrls = new Set(
        list.map((item) => String((item as RSSSource)?.url ?? '').toLowerCase())
      )
      const next = [...list]
      imported = 0
      skipped = 0

      for (const source of parsedSources) {
        if (next.length >= MAX_RSS_SOURCES) {
          skipped += 1
          continue
        }

        const normalizedUrl = source.url.toLowerCase()
        if (seenUrls.has(normalizedUrl)) {
          skipped += 1
          continue
        }

        seenUrls.add(normalizedUrl)
        next.push(
          validateOrThrow(RSSSourceSchema, {
            ...source,
            id: globalThis.crypto.randomUUID(),
            order: next.length,
            failureCount: 0,
          })
        )
        imported += 1
      }

      if (imported === 0) {
        return null
      }

      return next
    })

    return { imported, skipped }
  } catch (error) {
    logError(error, {
      action: 'importOPML',
    })
    throw error
  }
}

type XmlRecord = Record<string, unknown>

function asRecord(value: unknown): XmlRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as XmlRecord)
    : null
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function collectOutlineNodes(value: unknown, nodes: XmlRecord[] = []): XmlRecord[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectOutlineNodes(item, nodes))
    return nodes
  }

  const record = asRecord(value)
  if (!record) {
    return nodes
  }

  for (const [key, child] of Object.entries(record)) {
    if (key.toLowerCase() === 'outline') {
      for (const outline of toArray(child)) {
        const outlineRecord = asRecord(outline)
        if (outlineRecord) {
          nodes.push(outlineRecord)
          collectOutlineNodes(outlineRecord, nodes)
        }
      }
      continue
    }

    collectOutlineNodes(child, nodes)
  }

  return nodes
}

function getXmlAttribute(node: XmlRecord, names: string[]): string | null {
  for (const name of names) {
    const exactValue = node[name]
    if (typeof exactValue === 'string' && exactValue.trim()) {
      return exactValue
    }

    const caseInsensitiveKey = Object.keys(node).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    )
    const caseInsensitiveValue = caseInsensitiveKey ? node[caseInsensitiveKey] : undefined
    if (typeof caseInsensitiveValue === 'string' && caseInsensitiveValue.trim()) {
      return caseInsensitiveValue
    }
  }

  return null
}

// 解析 OPML 内容
function parseOPML(content: string): Omit<RSSSource, 'id' | 'order' | 'failureCount'>[] {
  const sources: Omit<RSSSource, 'id' | 'order' | 'failureCount'>[] = []
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    trimValues: true,
  })

  let parsed: unknown
  try {
    parsed = parser.parse(content)
  } catch {
    throw new ValidationError('Invalid OPML XML')
  }

  for (const outline of collectOutlineNodes(parsed)) {
    const xmlUrl = getXmlAttribute(outline, ['xmlUrl', 'xmlurl'])
    const text = getXmlAttribute(outline, ['text', 'title'])
    const type = getXmlAttribute(outline, ['type'])

    // 只处理 RSS 类型的 outline
    if (!xmlUrl || (type && type.toLowerCase() !== 'rss')) {
      continue
    }

    // 验证 URL
    const sanitizedUrl = sanitizeUrl(xmlUrl)
    if (!sanitizedUrl) {
      continue
    }

    sources.push({
      name: sanitizeString(text || new URL(sanitizedUrl).hostname, { maxLength: 200 }),
      url: sanitizedUrl,
      description: '',
      language: 'zh',
      enabled: true,
      tags: [],
    })
  }

  return sources
}
