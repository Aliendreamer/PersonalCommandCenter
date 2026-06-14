import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { SearchResult } from '@pcc/contracts'
import { SearchResultList } from './search-result-list'

afterEach(cleanup)

const result: SearchResult = {
  title: 'TanStack',
  url: 'https://tanstack.com/',
  content: 'App stack',
  engine: 'google',
}

describe('SearchResultList', () => {
  it('renders result links', () => {
    render(<SearchResultList results={[result]} />)
    const link = screen.getByRole('link', { name: 'TanStack' })
    expect(link.getAttribute('href')).toBe('https://tanstack.com/')
  })

  it('prompts when idle (no query yet)', () => {
    render(<SearchResultList results={[]} idle />)
    expect(screen.getByText(/enter a query/i)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<SearchResultList results={[]} error="boom" />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
