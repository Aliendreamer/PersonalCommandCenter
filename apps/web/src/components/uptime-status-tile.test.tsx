import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { UptimeCheck } from '@pcc/contracts'
import { UptimeStatusTile } from './uptime-status-tile'

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

describe('UptimeStatusTile', () => {
  it('shows the up count', () => {
    render(<UptimeStatusTile checks={[up, down]} />)
    expect(screen.getByText('1/2 up')).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<UptimeStatusTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
