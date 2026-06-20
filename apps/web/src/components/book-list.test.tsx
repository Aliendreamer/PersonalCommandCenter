import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import type { Book } from '@pcc/contracts'
import { BookList } from './book-list'

const book: Book = {
  title: 'Dune',
  author: 'Frank Herbert',
  link: 'https://gr.test/1',
  coverUrl: 'https://img.test/dune.jpg',
  description: '<b>A desert</b> planet.',
  averageRating: 4.25,
  numPages: 412,
  published: 1965,
}

afterEach(cleanup)

describe('BookList', () => {
  it('renders each book as a tile', () => {
    render(<BookList books={[book]} />)
    expect(screen.getByTestId('book-tile-https://gr.test/1')).toBeDefined()
    expect(screen.getByText('Dune')).toBeDefined()
  })

  it('opens a detail modal with the (stripped) description, rating and pages', () => {
    render(<BookList books={[book]} />)
    fireEvent.click(screen.getByRole('button', { name: /Dune/ }))
    expect(screen.getByText(/A desert planet\./)).toBeDefined()
    expect(screen.getByText(/4\.25/)).toBeDefined()
    expect(screen.getByText(/412 pages/)).toBeDefined()
  })

  it('links the detail out to Goodreads safely', () => {
    render(<BookList books={[book]} />)
    fireEvent.click(screen.getByRole('button', { name: /Dune/ }))
    const link = screen.getByRole('link', { name: /goodreads/i })
    expect(link.getAttribute('href')).toBe('https://gr.test/1')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('neutralizes a dangerous book link in the modal', () => {
    render(<BookList books={[{ ...book, link: 'javascript:alert(1)' }]} />)
    fireEvent.click(screen.getByRole('button', { name: /Dune/ }))
    expect(
      screen.getByRole('link', { name: /goodreads/i }).getAttribute('href'),
    ).toBe('#')
  })

  it('shows a degraded state on error', () => {
    render(<BookList books={[]} error="unreachable" />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
