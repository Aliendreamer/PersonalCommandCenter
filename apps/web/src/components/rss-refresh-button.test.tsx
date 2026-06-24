import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '../test/render'
import { RssRefreshButton } from './rss-refresh-button'

describe('RssRefreshButton', () => {
  it('calls onRefresh when clicked', () => {
    const onRefresh = vi.fn()
    render(<RssRefreshButton onRefresh={onRefresh} loading={false} />)
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('shows a busy state when loading', () => {
    render(<RssRefreshButton onRefresh={() => {}} loading={true} />)
    // Mantine's loading state adds a loader overlay (a second labelled button),
    // and the busy button carries data-loading — assert the busy state renders.
    const buttons = screen.getAllByRole('button', { name: /refresh/i })
    expect(buttons.length).toBeGreaterThan(0)
    expect(buttons.some((b) => b.hasAttribute('data-loading'))).toBe(true)
  })
})
