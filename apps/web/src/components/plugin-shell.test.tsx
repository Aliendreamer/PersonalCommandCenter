import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
})
