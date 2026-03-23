'use client'

import { useEffect } from 'react'
import { getAdSenseClientId } from '@/lib/config/adsense'

const SCRIPT_ID = 'adsense-script'

export function AdsenseScript() {
  const clientId = getAdSenseClientId()

  useEffect(() => {
    if (!clientId || typeof document === 'undefined') {
      return
    }

    if (document.getElementById(SCRIPT_ID)) {
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      clientId
    )}`
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)
  }, [clientId])

  return null
}
