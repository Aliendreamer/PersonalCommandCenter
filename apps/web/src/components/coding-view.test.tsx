import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { CodingStatus } from '@pcc/contracts'
import { CodingView } from './coding-view'

const status: CodingStatus = {
  weekSeconds: 65040, // 18h 04m
  todaySeconds: 11520,
  days: [
    { date: '2026-06-15', seconds: 7200 },
    { date: '2026-06-18', seconds: 11520 },
  ],
  projects: [{ name: 'PersonalCommandCenter', seconds: 65040 }],
  languages: [{ name: 'C#', seconds: 65040 }],
}

afterEach(cleanup)

describe('CodingView', () => {
  it('shows the week total, per-day strip, and breakdowns', () => {
    render(<CodingView status={status} />)
    expect(screen.getByText('This week')).toBeDefined()
    // 18h 04m renders for the week total and the (equal) top project/language.
    expect(screen.getAllByText('18h 04m').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Projects')).toBeDefined()
    expect(screen.getByText('Languages')).toBeDefined()
    expect(screen.getByText('PersonalCommandCenter')).toBeDefined()
    // Per-day strip renders a weekday label.
    expect(screen.getByText('Mon')).toBeDefined()
  })

  it('degrades on error', () => {
    render(<CodingView status={null} error="unreachable" />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
