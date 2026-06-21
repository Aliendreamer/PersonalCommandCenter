import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import type { Notification } from '@pcc/contracts'
import { NotificationList } from './notification-list'

function notif(over: Partial<Notification> = {}): Notification {
  return {
    id: over.id ?? '1',
    severity: over.severity ?? 'Info',
    title: over.title ?? 'Command center online',
    message: over.message,
    source: over.source ?? 'system',
    createdAt: over.createdAt ?? '2026-06-21T12:00:00Z',
    readAt: over.readAt ?? null,
  }
}

afterEach(cleanup)

describe('NotificationList', () => {
  it('renders a row with its title and severity', () => {
    render(<NotificationList notifications={[notif({ title: 'Disk full' })]} />)

    expect(screen.getByText('Disk full')).toBeDefined()
    expect(screen.getByText('Info')).toBeDefined()
  })

  it('renders every row when no scroll height is measured (SSR/jsdom fallback)', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      notif({ id: String(i), title: `Note ${i}` }),
    )
    render(<NotificationList notifications={items} />)

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Note ${i}`)).toBeDefined()
    }
  })

  it('offers mark-read on an unread row and calls back', () => {
    const onMarkRead = vi.fn()
    render(
      <NotificationList
        notifications={[notif({ readAt: null })]}
        onMarkRead={onMarkRead}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /mark read/i }))
    expect(onMarkRead).toHaveBeenCalledOnce()
  })

  it('shows an empty state', () => {
    render(<NotificationList notifications={[]} />)
    expect(screen.getByText(/no notifications/i)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<NotificationList notifications={[]} error="unreachable" />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
