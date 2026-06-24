import { afterEach, describe, expect, it } from 'vitest'
import type { RssItem } from '@pcc/contracts'
import { cleanup, render, screen, fireEvent } from '../test/render'
import { RssItemList } from './rss-item-list'

const item = (over: Partial<RssItem>): RssItem => ({
  title: 'T',
  link: 'https://e.test/x',
  published: '2026-06-15T10:00:00Z',
  source: 'Src',
  topic: 'technology',
  summary: '',
  ...over,
})

const data: RssItem[] = [
  item({
    title: 'Tech one',
    link: 'https://e.test/1',
    topic: 'technology',
    source: 'Ars',
  }),
  item({
    title: 'Sport one',
    link: 'https://e.test/2',
    topic: 'sports',
    source: 'ESPN',
  }),
]

afterEach(cleanup)

describe('RssItemList filters', () => {
  it('filters by topic chip', () => {
    render(<RssItemList items={data} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Sports' }))
    expect(screen.queryByText('Tech one')).toBeNull()
    expect(screen.getByText('Sport one')).toBeDefined()
  })

  it('renders an All chip that shows everything', () => {
    render(<RssItemList items={data} />)
    expect(screen.getByText('Tech one')).toBeDefined()
    expect(screen.getByText('Sport one')).toBeDefined()
  })

  it('degrades on error', () => {
    render(<RssItemList items={[]} error="unreachable" />)
    expect(screen.getByText('Feeds unavailable')).toBeDefined()
  })
})
