import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { UptimeCheck } from '@pcc/contracts'
import { UptimeList } from './uptime-list'

const up: UptimeCheck = {
  name: 'api',
  url: 'https://a.test',
  up: true,
  statusCode: 200,
  latencyMs: 8,
}
const down: UptimeCheck = {
  name: 'db',
  url: 'https://b.test',
  up: false,
  statusCode: null,
  latencyMs: 5000,
}

afterEach(cleanup)

describe('UptimeList', () => {
  it('renders an up and a down badge', () => {
    render(<UptimeList checks={[up, down]} />)
    expect(screen.getByText(/up · 200/)).toBeDefined()
    expect(screen.getByText('down')).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<UptimeList checks={[]} error="unreachable" />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
