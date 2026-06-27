import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { NetworkStatus } from '@pcc/contracts'
import { NetworkDevicesTile } from './network-devices-tile'

const status: NetworkStatus = {
  devices: [
    {
      name: 'Phone',
      ip: '192.168.1.100',
      mac: null,
      home: true,
      connectionType: 'wireless_5_ghz',
      downKbps: 10.5,
      upKbps: 2.3,
      rssiDbm: -55,
    },
    {
      name: 'Laptop',
      ip: '192.168.1.101',
      mac: null,
      home: false,
      connectionType: 'wireless_5_ghz',
      downKbps: null,
      upKbps: null,
      rssiDbm: null,
    },
    {
      name: 'Router',
      ip: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      home: true,
      connectionType: 'wired',
      downKbps: null,
      upKbps: null,
      rssiDbm: null,
    },
  ],
  nodes: [],
}

afterEach(cleanup)

describe('NetworkDevicesTile', () => {
  it('shows home count out of total', () => {
    render(<NetworkDevicesTile status={status} />)
    expect(screen.getByText('2 / 3 home')).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<NetworkDevicesTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })

  it('shows "No devices" for empty status', () => {
    render(<NetworkDevicesTile status={{ devices: [], nodes: [] }} />)
    expect(screen.getByText(/no devices/i)).toBeDefined()
  })
})
