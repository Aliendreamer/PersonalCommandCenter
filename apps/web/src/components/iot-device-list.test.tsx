import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { IotEntity } from '@pcc/contracts'
import { IotDeviceList } from './iot-device-list'

const entities: IotEntity[] = [
  { entityId: 'light.kitchen', name: 'Kitchen', domain: 'light', state: 'on' },
  {
    entityId: 'sensor.temp',
    name: 'Temp',
    domain: 'sensor',
    state: '21.5',
    unit: '°C',
  },
]

afterEach(cleanup)

describe('IotDeviceList', () => {
  it('renders entities grouped by domain', () => {
    render(<IotDeviceList entities={entities} />)

    expect(screen.getByTestId('domain-light')).toBeDefined()
    expect(screen.getByTestId('domain-sensor')).toBeDefined()
    expect(screen.getByText(/Kitchen/)).toBeDefined()
    expect(screen.getByText(/21\.5/)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<IotDeviceList entities={[]} error="unreachable" />)

    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
