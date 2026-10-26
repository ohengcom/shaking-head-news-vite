import { useEffect } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRotationStore } from '@/lib/stores/rotation-store'
import { usePathname } from '@/lib/router'
import { useTranslations } from '@/lib/i18n'

// Rotation is disabled on these pages (see TiltWrapper); hide the quick bar
// there as well so the controls never appear without an effect.
const EXCLUDED_PATH_PATTERN = /(^|\/)(settings|rss)(\/|$)/

function isFormTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON'
}

function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('[role="dialog"]') !== null
}

export function RotationQuickBar() {
  const isPaused = useRotationStore((state) => state.isPaused)
  const togglePause = useRotationStore((state) => state.togglePause)
  const setAngle = useRotationStore((state) => state.setAngle)
  const pathname = usePathname()
  const t = useTranslations('rotation')

  const isExcluded = EXCLUDED_PATH_PATTERN.test(pathname || '')

  useEffect(() => {
    if (isExcluded) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.defaultPrevented) {
        return
      }

      if (isFormTarget(event.target) || isInsideDialog(event.target)) {
        return
      }

      event.preventDefault()
      togglePause()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExcluded, togglePause])

  if (isExcluded) {
    return null
  }

  return (
    <div
      className="bg-card/90 border-border fixed right-4 bottom-4 z-50 flex items-center gap-1 rounded-full border px-2 py-1 shadow-lg backdrop-blur"
      data-testid="rotation-quick-bar"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={togglePause}
        title={isPaused ? t('resume') : t('pause')}
        aria-label={isPaused ? t('resume') : t('pause')}
      >
        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setAngle(0)}
        title={t('resetAngle')}
        aria-label={t('resetAngle')}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <span className="text-muted-foreground hidden pr-2 pl-1 text-xs sm:inline">
        {t('shortcutHint')}
      </span>
    </div>
  )
}
