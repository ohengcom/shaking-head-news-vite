export const DEFAULT_ADSENSE_CLIENT_ID = 'ca-pub-5567992467139695'

export function getAdSenseClientId(): string {
  const envClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim()
  return envClientId && envClientId.length > 0 ? envClientId : DEFAULT_ADSENSE_CLIENT_ID
}

type AdSenseSlotPosition = 'sidebar' | 'header' | 'footer' | 'inline'

function getEnvSlotValue(value: string | undefined): string {
  return value?.trim() || ''
}

export function getAdSenseSlot(position: AdSenseSlotPosition): string {
  const defaultSlot = getEnvSlotValue(process.env.NEXT_PUBLIC_ADSENSE_SLOT)
  const positionedSlots: Record<AdSenseSlotPosition, string> = {
    sidebar: getEnvSlotValue(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR),
    header: getEnvSlotValue(process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER),
    footer: getEnvSlotValue(process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER),
    inline: getEnvSlotValue(process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE),
  }

  return positionedSlots[position] || defaultSlot
}
