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

  it('renders the book title as plain text, not a link', () => {
    // On the dashboard the whole tile navigates to /goodreads; the title itself must not be a link.
    render(<GoodreadsReadingTile books={[book]} />)
    expect(screen.getByText('Dune').closest('a')).toBeNull()
  })

  it('shows a degraded state on error', () => {
    render(<GoodreadsReadingTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
