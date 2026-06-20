import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { Book } from '@pcc/contracts'
import { GoodreadsReadingTile } from './goodreads-reading-tile'

const book: Book = {
  title: 'Dune',
  author: 'Frank Herbert',
  link: 'https://gr.test/1',
  coverUrl: 'https://img.test/dune.jpg',
}

afterEach(cleanup)

describe('GoodreadsReadingTile', () => {
  it('shows the current book', () => {
    render(<GoodreadsReadingTile books={[book]} />)
    expect(screen.getByText('Dune')).toBeDefined()
  })

  it('links the current book out to Goodreads, safely', () => {
    render(<GoodreadsReadingTile books={[book]} />)
    const link = screen.getByText('Dune').closest('a')
    expect(link?.getAttribute('href')).toBe('https://gr.test/1')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toContain('noopener')
  })

  it('neutralizes a dangerous book link', () => {
    render(
      <GoodreadsReadingTile
        books={[{ ...book, link: 'javascript:alert(1)' }]}
      />,
    )
    expect(screen.getByText('Dune').closest('a')?.getAttribute('href')).toBe(
      '#',
    )
  })

  it('shows a degraded state on error', () => {
    render(<GoodreadsReadingTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
