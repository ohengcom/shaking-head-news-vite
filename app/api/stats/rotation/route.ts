import { NextResponse } from 'next/server'
import { recordRotation } from '@/lib/actions/stats'

interface RotationPayload {
  angle?: unknown
  duration?: unknown
}

function isRotationPayload(value: unknown): value is RotationPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function parsePayload(request: Request): Promise<RotationPayload | null> {
  const rawBody = await request.text()

  if (!rawBody) {
    return null
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown
    return isRotationPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const payload = await parsePayload(request)

  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid rotation payload',
      },
      { status: 400 }
    )
  }

  const angle = Number(payload.angle)
  const duration = Number(payload.duration)

  if (!Number.isFinite(angle) || !Number.isFinite(duration)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rotation payload must contain numeric angle and duration',
      },
      { status: 400 }
    )
  }

  const result = await recordRotation(angle, duration)

  if (result && typeof result === 'object' && 'error' in result) {
    if (result.error === 'UNAUTHORIZED' || result.error === 'RATE_LIMIT') {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 500 }
    )
  }

  return new NextResponse(null, { status: 204 })
}
