import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsListSkeleton } from '@/components/news/NewsListSkeleton'

describe('NewsListSkeleton', () => {
  it('renders default number of skeleton items', () => {
    render(<NewsListSkeleton />)
    const container = screen.getByTestId('news-list-skeleton')
    expect(container).toBeInTheDocument()
    expect(container.children).toHaveLength(8)
  })

  it('renders custom count of skeleton items', () => {
    render(<NewsListSkeleton count={4} />)
    const container = screen.getByTestId('news-list-skeleton')
    expect(container.children).toHaveLength(4)
  })
})
