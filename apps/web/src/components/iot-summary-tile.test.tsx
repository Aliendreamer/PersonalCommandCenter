import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { IotEntity } from '@pcc/contracts'
import { IotSummaryTile } from './iot-summary-tile'

const entities: IotEntity[] = [
  { entityId: 'light.kitchen', name: 'Kitchen', domain: 'light', state: 'on' },
  { entityId: 'light.hall', name: 'Hall', domain: 'light', state: 'off' },
]

afterEach(cleanup)

describe('IotSummaryTile', () => {
  it('shows device counts from the loader data', () => {
    render(<IotSummaryTile entities={entities} />)

    expect(screen.getByText(/2 devices · 1 on/)).toBeDefined()
  })

  it('shows a degraded state when unavailable', () => {
    render(<IotSummaryTile error />)

    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
