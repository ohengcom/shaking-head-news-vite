import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StatsChart } from '@/components/stats/StatsChart'
import { I18nProvider } from '@/lib/client-i18n'

function renderWithI18n(ui: React.ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>)
}

describe('StatsChart', () => {
  beforeEach(() => {
    window.localStorage.setItem('app-locale', 'en')
    document.cookie = 'locale=en; path=/'
  })

  it('renders an empty state when no data is available', () => {
    renderWithI18n(<StatsChart data={[]} type="week" />)

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('updates the month summary when a different point receives focus', () => {
    renderWithI18n(
      <StatsChart
        type="month"
        data={[
          { date: '2025-02-01', count: 3, duration: 120 },
          { date: '2025-02-02', count: 5, duration: 240 },
        ]}
      />
    )

    expect(screen.getByText('2025-02-02')).toBeInTheDocument()
    expect(screen.getByText('Rotation Count: 5')).toBeInTheDocument()
    expect(screen.getByText('Duration: 4 min')).toBeInTheDocument()

    fireEvent.focus(screen.getByLabelText(/2\/1, Rotation Count: 3, Duration: 2 min/i))

    expect(screen.getByText('2025-02-01')).toBeInTheDocument()
    expect(screen.getByText('Rotation Count: 3')).toBeInTheDocument()
    expect(screen.getByText('Duration: 2 min')).toBeInTheDocument()
  })
})
