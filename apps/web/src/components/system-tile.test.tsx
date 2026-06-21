import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { SystemStatus } from '@pcc/contracts'
import { SystemTile } from './system-tile'

const status: SystemStatus = {
  apiHealthy: true,
  version: '1.0.0.0',
  uptimeSeconds: 1,
  hostname: 'box',
}

function renderTile(ui: React.ReactNode) {
  return render(ui)
}

afterEach(cleanup)

describe('SystemTile', () => {
  it('renders the status provided by the loader', () => {
    renderTile(<SystemTile status={status} />)

    expect(screen.getByText('box')).toBeDefined()
  })

  it('renders status values as Mantine components', () => {
    renderTile(<SystemTile status={status} />)

    // Mantine Text/components carry mantine-* classes — proof the tile was migrated off Tailwind.
    expect(screen.getByText('box').className).toContain('mantine-')
  })

  it('shows a degraded state when the source is unavailable', () => {
    renderTile(<SystemTile error />)

    const degraded = screen.getByRole('status')
    expect(degraded.textContent).toMatch(/unavailable/i)
    expect(degraded.className).toContain('mantine-')
  })

  it('shows a degraded state when no status is provided', () => {
    renderTile(<SystemTile />)

    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
