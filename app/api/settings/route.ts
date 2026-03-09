import { NextResponse } from 'next/server'
import {
  getUserSettings,
  updateSettings,
  resetSettings,
  toggleProStatus,
} from '@/lib/actions/settings'
import type { UserSettings } from '@/types/settings'

type SettingsApiAction = 'update' | 'reset' | 'togglePro'

interface SettingsApiRequestBody {
  action?: SettingsApiAction
  payload?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET() {
  try {
    const settings = await getUserSettings()

    return NextResponse.json({
      success: true,
      authenticated: Boolean(settings.userId),
      settings,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Settings API failed',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let body: SettingsApiRequestBody

  try {
    body = (await request.json()) as SettingsApiRequestBody
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON payload',
      },
      { status: 400 }
    )
  }

  try {
    if (body.action === 'update') {
      if (!isRecord(body.payload)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid settings payload',
          },
          { status: 400 }
        )
      }

      const result = await updateSettings(body.payload as Partial<UserSettings>)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    if (body.action === 'reset') {
      const result = await resetSettings()
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    if (body.action === 'togglePro') {
      const result = await toggleProStatus()
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unsupported action',
      },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Settings API failed',
      },
      { status: 500 }
    )
  }
}
