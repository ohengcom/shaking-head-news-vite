import { useEffect, useState } from 'react'
import { useSession } from '@/lib/auth-client'
import { getCachedSettings } from '@/lib/api/settings-cache'
import { getAdSenseClientId } from '@/lib/config/adsense'
import { isProductionRuntime } from '@/lib/config/runtime-env'

const SCRIPT_ID = 'adsense-script'

/**
 * Load the AdSense library only when an ad can actually be rendered.
 *
 * The script used to be injected for every visitor in production whenever a
 * client id was configured, including Pro users who never see an ad slot. The
 * third-party script is the single largest piece of JS on the page, so gating
 * it removes that cost for those users.
 */
export function AdsenseScript() {
  const clientId = getAdSenseClientId()
  const { status } = useSession()
  const [adsAllowed, setAdsAllowed] = useState(false)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status !== 'authenticated') {
      // Guests see ads, so the loader is required.
      setAdsAllowed(true)
      return
    }

    let cancelled = false

    void (async () => {
      const result = await getCachedSettings()
      if (cancelled) {
        return
      }

      const settings = result?.settings
      setAdsAllowed(Boolean(settings) && settings?.isPro !== true && settings?.adsEnabled !== false)
    })()

    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    if (!isProductionRuntime() || !adsAllowed) {
      return
    }

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
  }, [adsAllowed, clientId])

  return null
}
