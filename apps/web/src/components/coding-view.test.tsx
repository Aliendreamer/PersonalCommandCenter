import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import type { CodingStatus } from '@pcc/contracts'
import { CodingView } from './coding-view'

const status: CodingStatus = {
  range: 'week',
  totalSeconds: 3600,
  todaySeconds: 1200,
  days: [
    {
      date: '2026-06-15', // Mon
      seconds: 2400,
      projects: [{ name: 'Alpha', seconds: 2400 }],
      languages: [{ name: 'Go', seconds: 2400 }],
    },
    {
      date: '2026-06-18', // Thu
      seconds: 1200,
      projects: [{ name: 'Beta', seconds: 1200 }],
      languages: [{ name: 'C#', seconds: 1200 }],
    },
  ],
  projects: [
    { name: 'Alpha', seconds: 2400 },
    { name: 'Beta', seconds: 1200 },
  ],
  languages: [
    { name: 'Go', seconds: 2400 },
    { name: 'C#', seconds: 1200 },
  ],
}

afterEach(cleanup)

describe('CodingView', () => {
  it('shows the range total, a range control, day bars, and breakdowns', () => {
    render(<CodingView status={status} range="week" onRangeChange={() => {}} />)

    expect(screen.getByText('This week')).toBeDefined()
    expect(screen.getByText('Month')).toBeDefined() // range control option
    expect(screen.getByRole('table')).toBeDefined() // languages table
    // Aggregate breakdown shows both projects.
    expect(screen.getByText('Alpha')).toBeDefined()
    expect(screen.getByText('Beta')).toBeDefined()
  })

  it('switches range via the control', () => {
    const onRangeChange = vi.fn()
    render(
      <CodingView status={status} range="week" onRangeChange={onRangeChange} />,
    )

    fireEvent.click(screen.getByText('Month'))

    expect(onRangeChange).toHaveBeenCalledWith('month')
  })

  it('filters the breakdown to a clicked day, then clears', () => {
    render(<CodingView status={status} range="week" onRangeChange={() => {}} />)

    // Click the Thursday bar → only that day's project (Beta) remains.
    fireEvent.click(screen.getByRole('button', { name: /Thu/ }))
    expect(screen.getByText('Beta')).toBeDefined()
    expect(screen.queryByText('Alpha')).toBeNull()

    // Clear → back to the whole-range aggregate.
    fireEvent.click(screen.getByRole('button', { name: /whole week/i }))
    expect(screen.getByText('Alpha')).toBeDefined()
  })

  it('degrades on error', () => {
    render(
      <CodingView
        status={null}
        error="unreachable"
        range="week"
        onRangeChange={() => {}}
      />,
    )
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
