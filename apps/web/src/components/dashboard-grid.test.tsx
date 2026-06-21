import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { PluginManifest } from '@pcc/contracts'
import { DashboardGrid } from './dashboard-grid'

const systemManifest: PluginManifest = {
  id: 'system',
  navLabel: 'System',
  routeBase: '/system',
  widgets: ['system-status'],
}

afterEach(cleanup)

describe('DashboardGrid', () => {
  it('renders a tile for each enabled plugin', () => {
    render(<DashboardGrid manifests={[systemManifest]} />)

    expect(screen.getByTestId('tile-system')).toBeDefined()
  })

  it('does not render plugins absent from the manifest', () => {
    render(<DashboardGrid manifests={[]} />)

    expect(screen.queryByTestId('tile-system')).toBeNull()
  })

  it('shows a non-blocking error banner when the manifest fails to load', () => {
    render(<DashboardGrid manifests={[]} error="unreachable" />)

    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('reflects per-tile health on the status dot', () => {
    render(
      <DashboardGrid manifests={[systemManifest]} tileHealth={() => 'down'} />,
    )

    expect(
      screen.getByTestId('health-system').getAttribute('data-health'),
    ).toBe('down')
  })

  it('defaults tile health to ok when none is supplied', () => {
    render(<DashboardGrid manifests={[systemManifest]} />)

    expect(
      screen.getByTestId('health-system').getAttribute('data-health'),
    ).toBe('ok')
  })

  it('renders a tile as a link to its page when tileHref yields one', () => {
    render(
      <DashboardGrid
        manifests={[systemManifest]}
        tileHref={(m) => m.routeBase}
      />,
    )

    const tile = screen.getByTestId('tile-system')
    expect(tile.tagName).toBe('A')
    expect(tile.getAttribute('href')).toBe('/system')
  })

  it('renders a tile as a non-link section when tileHref returns undefined', () => {
    render(
      <DashboardGrid manifests={[systemManifest]} tileHref={() => undefined} />,
    )

    expect(screen.getByTestId('tile-system').tagName).toBe('SECTION')
  })

  it('renders the hero slot above the grid', () => {
    render(
      <DashboardGrid
        manifests={[systemManifest]}
        hero={<div data-testid="hero-slot">hero</div>}
      />,
    )

    expect(screen.getByTestId('hero-slot')).toBeDefined()
  })
})
