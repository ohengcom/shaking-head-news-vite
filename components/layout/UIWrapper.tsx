'use client'

import { useUIStore } from '@/lib/stores/ui-store'
import { useEffect } from 'react'

interface UIWrapperProps {
  children: React.ReactNode
}

export function UIWrapper({ children }: UIWrapperProps) {
  const { fontSize, layoutMode } = useUIStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
    document.documentElement.setAttribute('data-layout-mode', layoutMode)
  }, [fontSize, layoutMode])

  return <>{children}</>
}
