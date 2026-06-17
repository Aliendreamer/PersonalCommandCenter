import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ModelsStatus } from '@pcc/contracts'
import { ModelsStatusTile } from './models-status-tile'

const status: ModelsStatus = {
  version: '0.30.9',
  installed: [{ name: 'llama3:latest', sizeBytes: 1 }],
  running: [{ name: 'llama3:latest', sizeVramBytes: 1 }],
  gpus: [
    {
      name: 'RTX 5070',
      utilizationPct: 15,
      temperatureC: 52,
      memoryUsedMb: 2048,
      memoryTotalMb: 8192,
    },
  ],
}

afterEach(cleanup)

describe('ModelsStatusTile', () => {
  it('shows counts and the GPU summary', () => {
    render(<ModelsStatusTile status={status} />)
    expect(screen.getByText(/1 models · 1 loaded/)).toBeDefined()
    expect(screen.getByText(/GPU 15% · 52°C/)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<ModelsStatusTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
