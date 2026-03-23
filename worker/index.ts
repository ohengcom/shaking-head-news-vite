import { Hono } from 'hono'
import { handleAuthRequest } from '@/lib/auth'
import { getAiNewsItems, getHotListNews, getNews, getUserCustomNews } from '@/lib/actions/news'
import {
  getDefaultRSSSources,
  getRSSSources,
  addRSSSource,
  updateRSSSource,
  deleteRSSSource,
  reorderRSSSources,
  exportOPML,
  importOPML,
} from '@/lib/actions/rss'
import {
  getUserSettings,
  resetSettings,
  toggleProStatus,
  updateSettings,
} from '@/lib/actions/settings'
import { checkHealthReminder, getSummaryStats, recordRotation } from '@/lib/actions/stats'
import { HOT_LIST_SOURCES } from '@/lib/api/hot-list'
import { getAdSenseClientId } from '@/lib/config/adsense'
import type { UserSettings } from '@/types/settings'
import { APIError, ValidationError } from '@/lib/utils/error-handler'
import { setGlobalWorkerEnv, type AppWorkerEnv } from '@/lib/server/env'
import { runWithRequestContext } from '@/lib/server/request-context'

type Bindings = AppWorkerEnv

const app = new Hono<{ Bindings: Bindings }>()
const GOOGLE_SELLER_ID = 'f08c47fec0942fa0'
const LEGACY_MICROSOFT_CALLBACK_PATH = '/api/auth/callback/microsoft-entra-id'
const LEGACY_MICROSOFT_OAUTH2_CALLBACK_PATH = '/api/auth/oauth2/callback/microsoft-entra-id'

function toErrorPayload(error: unknown, fallback: string) {
  if (error instanceof APIError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: error.message,
      },
    }
  }

  return {
    status: 500,
    body: {
      success: false,
      error: error instanceof Error ? error.message : fallback,
    },
  }
}

function normalizePublisherId(clientId: string | undefined): string | null {
  if (!clientId) {
    return null
  }

  const trimmed = clientId.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('ca-pub-')) {
    return trimmed.replace('ca-', '')
  }

  if (trimmed.startsWith('pub-')) {
    return trimmed
  }

  return null
}

function normalizeLegacyMicrosoftCallbackRequest(request: Request): Request {
  const url = new URL(request.url)

  if (
    url.pathname !== LEGACY_MICROSOFT_CALLBACK_PATH &&
    url.pathname !== LEGACY_MICROSOFT_OAUTH2_CALLBACK_PATH
  ) {
    return request
  }

  url.pathname = url.pathname.replace('microsoft-entra-id', 'microsoft')
  return new Request(url.toString(), request)
}

function getRequestLocale(request: Request): 'zh' | 'en' {
  const cookieHeader = request.headers.get('cookie') || ''
  const localeCookie = cookieHeader.match(/(?:^|;\s*)locale=(zh|en)(?:;|$)/)?.[1]
  if (localeCookie === 'en') {
    return 'en'
  }

  return 'zh'
}

async function parseJsonBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T
}

app.use('*', async (c, next) => {
  setGlobalWorkerEnv(c.env)
  await runWithRequestContext(
    {
      request: c.req.raw,
      env: c.env,
    },
    async () => {
      await next()
    }
  )
})

app.get('/api/feed/home', async (c) => {
  try {
    const locale = getRequestLocale(c.req.raw)
    const [dailyNewsResult, aiNewsResult] = await Promise.allSettled([
      getNews(locale),
      getAiNewsItems(),
    ])

    return c.json({
      success: true,
      payload: {
        dailyNews: dailyNewsResult.status === 'fulfilled' ? dailyNewsResult.value.items : [],
        aiNews: aiNewsResult.status === 'fulfilled' ? aiNewsResult.value : [],
      },
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to load home feed')
    return Response.json(body, { status })
  }
})

app.get('/api/home', async (c) => {
  try {
    const settings = await getUserSettings()

    if (!settings.userId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        401
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

    const dynamicNewsMap = enabledSourceIds.reduce<Record<string, Awaited<typeof customNews>>>(
      (acc, id, index) => {
        acc[id] = dynamicSourcesData[index] || []
        return acc
      },
      {}
    )

    return c.json({
      success: true,
      payload: {
        settings,
        customNews,
        dynamicNewsMap,
      },
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to load home personalization')
    return Response.json(body, { status })
  }
})

app.get('/api/settings', async (c) => {
  try {
    const settings = await getUserSettings()

    return c.json({
      success: true,
      authenticated: Boolean(settings.userId),
      settings,
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Settings API failed')
    return Response.json(body, { status })
  }
})

app.post('/api/settings', async (c) => {
  try {
    const body = await parseJsonBody<{
      action?: 'update' | 'reset' | 'togglePro'
      payload?: unknown
    }>(c.req.raw)

    if (body.action === 'update') {
      if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
        throw new ValidationError('Invalid settings payload')
      }

      const result = await updateSettings(body.payload as Partial<UserSettings>)
      return c.json(result, result.success ? 200 : 400)
    }

    if (body.action === 'reset') {
      const result = await resetSettings()
      return c.json(result, result.success ? 200 : 400)
    }

    if (body.action === 'togglePro') {
      const result = await toggleProStatus()
      return c.json(result, result.success ? 200 : 400)
    }

    throw new ValidationError('Unsupported action')
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Settings API failed')
    return Response.json(body, { status })
  }
})

app.get('/api/stats/summary', async (c) => {
  try {
    const settings = await getUserSettings()

    return c.json({
      success: true,
      payload: {
        ...(await getSummaryStats()),
        dailyGoal: settings.dailyGoal || 30,
        isPro: Boolean(settings.isPro),
      },
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to load summary stats')
    return Response.json(body, { status })
  }
})

app.get('/api/stats/health-reminder', async (c) => {
  try {
    return c.json(await checkHealthReminder())
  } catch {
    return c.json({ shouldRemind: false, lastRotationTime: null })
  }
})

app.post('/api/stats/rotation', async (c) => {
  try {
    const payload = await parseJsonBody<{ angle?: unknown; duration?: unknown }>(c.req.raw)
    const angle = Number(payload.angle)
    const duration = Number(payload.duration)

    if (!Number.isFinite(angle) || !Number.isFinite(duration)) {
      throw new ValidationError('Rotation payload must contain numeric angle and duration')
    }

    const result = await recordRotation(angle, duration)
    if (result && typeof result === 'object' && 'error' in result) {
      if (result.error === 'UNAUTHORIZED' || result.error === 'RATE_LIMIT') {
        return c.body(null, 204)
      }

      return c.json(
        {
          success: false,
          error: result.error,
        },
        500
      )
    }

    return c.body(null, 204)
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to record rotation')
    return Response.json(body, { status })
  }
})

app.get('/api/rss/defaults', async (c) => {
  return c.json({
    success: true,
    payload: await getDefaultRSSSources(),
  })
})

app.get('/api/rss', async (c) => {
  try {
    return c.json({
      success: true,
      payload: await getRSSSources(),
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to load RSS sources')
    return Response.json(body, { status })
  }
})

app.post('/api/rss', async (c) => {
  try {
    const payload = await parseJsonBody<{
      name: string
      url: string
      description?: string
      language: 'zh' | 'en'
      enabled: boolean
      tags: string[]
    }>(c.req.raw)

    return c.json(
      {
        success: true,
        payload: await addRSSSource(payload),
      },
      201
    )
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to add RSS source')
    return Response.json(body, { status })
  }
})

app.patch('/api/rss/:id', async (c) => {
  try {
    const payload = await parseJsonBody<Record<string, unknown>>(c.req.raw)
    return c.json({
      success: true,
      payload: await updateRSSSource(c.req.param('id'), payload),
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to update RSS source')
    return Response.json(body, { status })
  }
})

app.delete('/api/rss/:id', async (c) => {
  try {
    await deleteRSSSource(c.req.param('id'))
    return c.json({
      success: true,
      payload: null,
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to delete RSS source')
    return Response.json(body, { status })
  }
})

app.post('/api/rss/reorder', async (c) => {
  try {
    const payload = await parseJsonBody<{ sourceIds?: unknown }>(c.req.raw)
    if (
      !Array.isArray(payload.sourceIds) ||
      payload.sourceIds.some((id) => typeof id !== 'string')
    ) {
      throw new ValidationError('Invalid RSS reorder payload')
    }

    return c.json({
      success: true,
      payload: await reorderRSSSources(payload.sourceIds),
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to reorder RSS sources')
    return Response.json(body, { status })
  }
})

app.get('/api/rss/export', async (c) => {
  try {
    return c.body(await exportOPML(), 200, {
      'content-type': 'application/xml; charset=utf-8',
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to export OPML')
    return Response.json(body, { status })
  }
})

app.post('/api/rss/import', async (c) => {
  try {
    return c.json({
      success: true,
      payload: await importOPML(await c.req.text()),
    })
  } catch (error) {
    const { status, body } = toErrorPayload(error, 'Failed to import OPML')
    return Response.json(body, { status })
  }
})

app.all('/api/auth/*', async (c) => {
  return handleAuthRequest(normalizeLegacyMicrosoftCallbackRequest(c.req.raw))
})

app.get('/ads.txt', (c) => {
  const publisherId = normalizePublisherId(getAdSenseClientId())

  if (!publisherId) {
    return c.body('adsense client id is not configured\n', 404, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300',
    })
  }

  return c.body(`google.com, ${publisherId}, DIRECT, ${GOOGLE_SELLER_ID}\n`, 200, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  })
})

app.notFound(async (c) => {
  if (c.env.ASSETS) {
    const response = await c.env.ASSETS.fetch(c.req.raw)
    if (response.status !== 404) {
      return response
    }
  }

  return c.text('Not Found', 404)
})

app.onError((error) => {
  const { status, body } = toErrorPayload(error, 'Worker runtime error')
  return Response.json(body, { status })
})

export default app
