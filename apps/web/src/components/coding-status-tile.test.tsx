import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { CodingStatus } from '@pcc/contracts'
import { CodingStatusTile } from './coding-status-tile'

const status: CodingStatus = {
  weekSeconds: 65040, // 18h 04m
  todaySeconds: 11520, // 3h 12m
  days: [{ date: '2026-06-18', seconds: 11520 }],
  projects: [{ name: 'PersonalCommandCenter', seconds: 65040 }],
  languages: [{ name: 'C#', seconds: 65040 }],
}

afterEach(cleanup)

describe('CodingStatusTile', () => {
  it('shows the week headline and today secondary', () => {
    render(<CodingStatusTile status={status} />)
    expect(screen.getByText(/18h 04m this week/)).toBeDefined()
    expect(screen.getByText(/3h 12m today/)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<CodingStatusTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
