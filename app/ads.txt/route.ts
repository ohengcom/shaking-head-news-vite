import { NextResponse } from 'next/server'
import { getAdSenseClientId } from '@/lib/config/adsense'

const GOOGLE_SELLER_ID = 'f08c47fec0942fa0'

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

export function GET() {
  const publisherId = normalizePublisherId(getAdSenseClientId())

  if (!publisherId) {
    return new NextResponse('adsense client id is not configured\n', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    })
  }

  return new NextResponse(`google.com, ${publisherId}, DIRECT, ${GOOGLE_SELLER_ID}\n`, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
