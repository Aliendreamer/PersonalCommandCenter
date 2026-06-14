import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { SystemStatus } from '@pcc/contracts'
import { SystemTile } from './system-tile'

const status: SystemStatus = {
  apiHealthy: true,
  version: '1.0.0.0',
  uptimeSeconds: 1,
  hostname: 'box',
}

afterEach(cleanup)

describe('SystemTile', () => {
  it('renders the status provided by the loader', () => {
    render(<SystemTile status={status} />)

    expect(screen.getByText('box')).toBeDefined()
  })

  it('shows a degraded state when the source is unavailable', () => {
    render(<SystemTile error />)

    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })

  it('shows a degraded state when no status is provided', () => {
    render(<SystemTile />)

    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
