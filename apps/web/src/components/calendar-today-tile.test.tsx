import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { CalendarEvent } from '@pcc/contracts'
import { CalendarTodayTile } from './calendar-today-tile'

function at(hour: number): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const todayEvent: CalendarEvent = {
  uid: 'a',
  title: 'Standup',
  start: at(9),
  end: at(10),
  allDay: false,
}

afterEach(cleanup)

describe('CalendarTodayTile', () => {
  it("lists today's events", () => {
    render(<CalendarTodayTile events={[todayEvent]} />)

    expect(screen.getByText('Standup')).toBeDefined()
  })

  it('shows an empty state when nothing is today', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const future: CalendarEvent = {
      uid: 'b',
      title: 'Later',
      start: tomorrow.toISOString(),
      end: tomorrow.toISOString(),
      allDay: false,
    }

    render(<CalendarTodayTile events={[future]} />)

    expect(screen.getByText(/nothing today/i)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<CalendarTodayTile error />)

    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
