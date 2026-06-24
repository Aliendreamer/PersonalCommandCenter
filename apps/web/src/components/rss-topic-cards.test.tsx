import { afterEach, describe, expect, it } from 'vitest'
import type { RssItem } from '@pcc/contracts'
import { cleanup, render, screen } from '../test/render'
import { RssTopicCards } from './rss-topic-cards'

afterEach(cleanup)

const item = (over: Partial<RssItem>): RssItem => ({
  title: 'T',
  link: 'https://e.test/x',
  published: '2026-06-15T10:00:00Z',
  source: 'Src',
  topic: 'technology',
  summary: '',
  ...over,
})

describe('RssTopicCards', () => {
  it('renders a labeled column per topic', () => {
    render(<RssTopicCards items={[item({})]} />)
    for (const label of ['Technology', 'Bulgaria', 'World', 'Sports']) {
      expect(screen.getByText(label)).toBeDefined()
    }
  })

  it('caps each topic at 10 cards', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      item({ title: `Tech ${i}`, link: `https://e.test/${i}` }),
    )
    render(<RssTopicCards items={many} />)
    expect(screen.getAllByRole('link')).toHaveLength(10)
  })

  it('shows an empty state for a topic with no items', () => {
    render(<RssTopicCards items={[item({ topic: 'sports', title: 'Goal' })]} />)
    // technology column has nothing
    expect(screen.getAllByText('No items').length).toBeGreaterThan(0)
  })
})
