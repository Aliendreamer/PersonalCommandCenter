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
  it('shows live status from the api', async () => {
    render(<SystemTile fetchStatus={() => Promise.resolve(status)} />)

    expect(await screen.findByText('box')).toBeDefined()
  })

  it('shows a degraded state when the status request fails', async () => {
    render(<SystemTile fetchStatus={() => Promise.reject(new Error('down'))} />)

    expect(await screen.findByText(/unavailable/i)).toBeDefined()
  })
})
