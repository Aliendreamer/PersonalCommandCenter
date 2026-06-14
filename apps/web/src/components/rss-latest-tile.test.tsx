import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { RssItem } from '@pcc/contracts'
import { RssLatestTile } from './rss-latest-tile'

const item: RssItem = {
  title: 'Big news',
  link: 'https://e.test/1',
  published: '2026-06-15T10:00:00Z',
  source: 'Example',
}

afterEach(cleanup)

describe('RssLatestTile', () => {
  it('shows the latest headline', () => {
    render(<RssLatestTile items={[item]} />)
    expect(screen.getByText('Big news')).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<RssLatestTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
