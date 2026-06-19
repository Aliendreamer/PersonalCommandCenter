import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { PluginManifest } from '@pcc/contracts'
import { Sidebar } from './sidebar'

const manifests: PluginManifest[] = [
  {
    id: 'system',
    navLabel: 'System',
    routeBase: '/system',
    widgets: ['system-status'],
  },
  {
    id: 'coding',
    navLabel: 'Coding',
    routeBase: '/coding',
    widgets: ['coding-status'],
  },
]

afterEach(cleanup)

describe('Sidebar', () => {
  it('renders a nav link per manifest', () => {
    render(<Sidebar manifests={manifests} />)

    expect(screen.getByRole('link', { name: 'System' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Coding' })).toBeDefined()
  })

  it('highlights the active route only', () => {
    render(<Sidebar manifests={manifests} activePath="/coding" />)

    expect(
      screen.getByRole('link', { name: 'Coding' }).getAttribute('data-active'),
    ).toBe('true')
    expect(
      screen.getByRole('link', { name: 'System' }).getAttribute('data-active'),
    ).toBeNull()
  })
})
