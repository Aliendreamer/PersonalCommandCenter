import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { PluginManifest } from '@pcc/contracts'
import { PluginShell } from './plugin-shell'

const systemManifest: PluginManifest = {
  id: 'system',
  navLabel: 'System',
  routeBase: '/system',
  widgets: ['system-status'],
}

afterEach(cleanup)

describe('PluginShell', () => {
  it('renders a nav entry and tile for each enabled plugin', () => {
    render(<PluginShell manifests={[systemManifest]} />)

    expect(screen.getByRole('link', { name: 'System' })).toBeDefined()
    expect(screen.getByTestId('tile-system')).toBeDefined()
  })

  it('does not render plugins absent from the manifest', () => {
    render(<PluginShell manifests={[]} />)

    expect(screen.queryByRole('link', { name: 'System' })).toBeNull()
    expect(screen.queryByTestId('tile-system')).toBeNull()
  })

  it('shows a non-blocking error banner when the manifest fails to load', () => {
    render(<PluginShell manifests={[]} error="unreachable" />)

    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('reflects per-tile health on the status dot', () => {
    render(
      <PluginShell manifests={[systemManifest]} tileHealth={() => 'down'} />,
    )

    expect(
      screen.getByTestId('health-system').getAttribute('data-health'),
    ).toBe('down')
  })

  it('defaults tile health to ok when none is supplied', () => {
    render(<PluginShell manifests={[systemManifest]} />)

    expect(
      screen.getByTestId('health-system').getAttribute('data-health'),
    ).toBe('ok')
  })

  it('renders the hero slot above the grid', () => {
    render(
      <PluginShell
        manifests={[systemManifest]}
        hero={<div data-testid="hero-slot">hero</div>}
      />,
    )

    expect(screen.getByTestId('hero-slot')).toBeDefined()
  })
})
