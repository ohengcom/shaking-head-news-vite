import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RotationQuickBar } from '@/components/rotation/RotationQuickBar'

let currentPath = '/'
const mockTogglePause = vi.fn()
const mockSetAngle = vi.fn()
let isPausedState = false

vi.mock('@/lib/router', () => ({
  usePathname: () => currentPath,
}))

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      pause: '暂停',
      resume: '继续',
      resetAngle: '回正页面',
      shortcutHint: '空格：暂停/继续',
    }
    return map[key] || key
  },
}))

vi.mock('@/lib/stores/rotation-store', () => ({
  useRotationStore: (selector: (state: unknown) => unknown) => {
    const state = {
      isPaused: isPausedState,
      togglePause: mockTogglePause,
      setAngle: mockSetAngle,
    }
    return selector(state)
  },
}))

describe('RotationQuickBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentPath = '/'
    isPausedState = false
  })

  it('renders quick bar on home page', () => {
    render(<RotationQuickBar />)
    expect(screen.getByTestId('rotation-quick-bar')).toBeInTheDocument()
  })

  it('is hidden on settings and rss pages', () => {
    currentPath = '/settings'
    const { container: settingsContainer } = render(<RotationQuickBar />)
    expect(settingsContainer.firstChild).toBeNull()

    currentPath = '/rss'
    const { container: rssContainer } = render(<RotationQuickBar />)
    expect(rssContainer.firstChild).toBeNull()
  })

  it('calls togglePause when pause button is clicked', () => {
    render(<RotationQuickBar />)
    const pauseButton = screen.getByLabelText('暂停')
    fireEvent.click(pauseButton)
    expect(mockTogglePause).toHaveBeenCalledTimes(1)
  })

  it('calls setAngle(0) when reset button is clicked', () => {
    render(<RotationQuickBar />)
    const resetButton = screen.getByLabelText('回正页面')
    fireEvent.click(resetButton)
    expect(mockSetAngle).toHaveBeenCalledWith(0)
  })

  it('toggles pause on spacebar keydown', () => {
    render(<RotationQuickBar />)
    fireEvent.keyDown(window, { code: 'Space' })
    expect(mockTogglePause).toHaveBeenCalledTimes(1)
  })

  it('ignores spacebar keydown when typing in an input', () => {
    render(
      <div>
        <input data-testid="test-input" />
        <RotationQuickBar />
      </div>
    )
    const input = screen.getByTestId('test-input')
    fireEvent.keyDown(input, { code: 'Space' })
    expect(mockTogglePause).not.toHaveBeenCalled()
  })
})
