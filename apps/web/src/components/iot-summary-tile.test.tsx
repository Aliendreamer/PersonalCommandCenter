import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { IotEntity } from '@pcc/contracts'
import { IotSummaryTile } from './iot-summary-tile'

const entities: IotEntity[] = [
  { entityId: 'light.kitchen', name: 'Kitchen', domain: 'light', state: 'on' },
  { entityId: 'light.hall', name: 'Hall', domain: 'light', state: 'off' },
]

afterEach(cleanup)

describe('IotSummaryTile', () => {
  it('shows device counts', async () => {
    render(<IotSummaryTile fetchEntities={() => Promise.resolve(entities)} />)

    expect(await screen.findByText(/2 devices · 1 on/)).toBeDefined()
  })

  it('shows a degraded state on error', async () => {
    render(
      <IotSummaryTile
        fetchEntities={() => Promise.reject(new Error('down'))}
      />,
    )

    expect(await screen.findByText(/unavailable/i)).toBeDefined()
  })
})
