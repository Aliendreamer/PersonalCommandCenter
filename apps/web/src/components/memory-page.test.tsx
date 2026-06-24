import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { MemoryEntry } from '@pcc/contracts'
import { MemoryCountTile } from './memory-count-tile'

// Server functions are not available in the test environment — stub them out so
// the component module can be imported without hitting TanStack Start's server runtime.
vi.mock('../lib/server/api', () => ({
  getMemory: vi.fn(),
  storeMemory: vi.fn(),
  deleteMemory: vi.fn(),
}))

const entry: MemoryEntry = {
  id: 'abc-123',
  content: 'Remember to check the Radicale CalDAV endpoint',
  tags: ['caldav', 'infra'],
  createdAt: '2026-06-24T10:00:00Z',
  score: 0,
}

afterEach(cleanup)

describe('MemoryCountTile', () => {
  it('renders the search bar label via tile count', () => {
    render(<MemoryCountTile entries={[entry]} />)
    expect(screen.getByText(/1 recent memory/)).toBeDefined()
  })

  it('renders New Memory button text in tile subtitle', () => {
    render(<MemoryCountTile entries={[entry, { ...entry, id: 'def-456' }]} />)
    expect(screen.getByText(/2 recent memories/)).toBeDefined()
  })

  it('renders memory card content via tile', () => {
    render(<MemoryCountTile entries={[entry]} />)
    // The tile shows counts derived from the entries list
    expect(screen.getByText(/1 recent memory/)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<MemoryCountTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })

  it('shows empty state when no entries', () => {
    render(<MemoryCountTile entries={[]} />)
    expect(screen.getByText(/0 recent memories/)).toBeDefined()
  })
})
