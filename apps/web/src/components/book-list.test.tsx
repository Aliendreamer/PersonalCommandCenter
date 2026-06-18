import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { Book } from '@pcc/contracts'
import { BookList } from './book-list'

const book: Book = {
  title: 'Dune',
  author: 'Frank Herbert',
  link: 'https://gr.test/1',
  coverUrl: 'https://img.test/dune.jpg',
}

afterEach(cleanup)

describe('BookList', () => {
  it('links the title out safely', () => {
    render(<BookList books={[book]} />)
    const link = screen.getByText('Dune').closest('a')
    expect(link?.getAttribute('href')).toBe('https://gr.test/1')
    expect(link?.getAttribute('rel')).toContain('noopener')
  })

  it('neutralizes a dangerous href', () => {
    render(<BookList books={[{ ...book, link: 'javascript:alert(1)' }]} />)
    expect(screen.getByText('Dune').closest('a')?.getAttribute('href')).toBe(
      '#',
    )
  })

  it('shows a degraded state on error', () => {
    render(<BookList books={[]} error="unreachable" />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
