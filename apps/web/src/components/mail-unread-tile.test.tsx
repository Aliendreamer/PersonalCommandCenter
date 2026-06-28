import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import { MailUnreadTile } from './mail-unread-tile'
import type { MailHeader } from '@pcc/contracts'

afterEach(cleanup)

const makeHeader = (uid: number, isRead: boolean): MailHeader => ({
  uid,
  subject: `Message ${uid}`,
  from: 'alice@example.com',
  to: 'bob@example.com',
  date: new Date().toISOString(),
  isRead,
  tag: null,
  folder: 'INBOX',
})

describe('MailUnreadTile', () => {
  it('shows the unread count', () => {
    const messages = [
      makeHeader(1, false),
      makeHeader(2, false),
      makeHeader(3, true),
    ]
    render(<MailUnreadTile messages={messages} />)
    expect(screen.getByText(/2 unread/i)).toBeDefined()
  })

  it('shows no-unread state when all read', () => {
    const messages = [makeHeader(1, true), makeHeader(2, true)]
    render(<MailUnreadTile messages={messages} />)
    expect(screen.getByText(/no unread mail/i)).toBeDefined()
  })

  it('shows degraded state on error', () => {
    render(<MailUnreadTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
