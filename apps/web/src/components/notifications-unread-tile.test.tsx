import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import { NotificationsUnreadTile } from './notifications-unread-tile'

afterEach(cleanup)

describe('NotificationsUnreadTile', () => {
  it('shows the unread count', () => {
    render(<NotificationsUnreadTile unread={3} />)
    expect(screen.getByText(/3 unread/)).toBeDefined()
  })

  it('shows an all-caught-up state at zero', () => {
    render(<NotificationsUnreadTile unread={0} />)
    expect(screen.getByText(/all caught up/i)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<NotificationsUnreadTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
