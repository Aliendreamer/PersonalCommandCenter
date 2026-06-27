import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { NetworkNode } from '@pcc/contracts'
import { NetworkNodeCard } from './network-node-card'

const onlineNode: NetworkNode = {
  name: 'Deco Living Room',
  online: true,
  cpuPct: 23.0,
  memPct: 61.0,
  connectedDevices: 5,
  downKbps: 80.5,
  upKbps: 12.3,
}

const offlineNode: NetworkNode = {
  name: 'Deco Bedroom',
  online: false,
  cpuPct: null,
  memPct: null,
  connectedDevices: null,
  downKbps: null,
  upKbps: null,
}

afterEach(cleanup)

describe('NetworkNodeCard', () => {
  it('renders node name and online badge', () => {
    render(<NetworkNodeCard node={onlineNode} />)
    expect(screen.getByText('Deco Living Room')).toBeDefined()
    expect(screen.getByText('Online')).toBeDefined()
  })

  it('shows CPU percentage', () => {
    render(<NetworkNodeCard node={onlineNode} />)
    expect(screen.getByText(/CPU: 23%/)).toBeDefined()
  })

  it('shows offline badge when node is offline', () => {
    render(<NetworkNodeCard node={offlineNode} />)
    expect(screen.getByText('Offline')).toBeDefined()
  })
})
