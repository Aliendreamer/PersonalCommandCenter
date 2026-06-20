import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import type { CalendarEvent } from '@pcc/contracts'
import { CalendarMonth } from './calendar-month'

const month = new Date(2026, 5, 15) // June 2026
const selected = new Date(2026, 5, 15)

const event: CalendarEvent = {
  uid: 'e1',
  title: 'Standup',
  start: new Date(2026, 5, 10, 9, 0).toISOString(),
  end: new Date(2026, 5, 10, 9, 30).toISOString(),
  allDay: false,
}

afterEach(cleanup)

describe('CalendarMonth', () => {
  it('shows the month and year header', () => {
    render(
      <CalendarMonth
        month={month}
        selected={selected}
        events={[]}
        onSelectDay={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onToday={vi.fn()}
      />,
    )
    expect(screen.getByText(/June 2026/)).toBeDefined()
  })

  it('selects a day when its cell is clicked', () => {
    const onSelectDay = vi.fn()
    render(
      <CalendarMonth
        month={month}
        selected={selected}
        events={[]}
        onSelectDay={onSelectDay}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onToday={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('day-2026-6-21'))
    expect(onSelectDay).toHaveBeenCalledTimes(1)
    expect(onSelectDay.mock.calls[0][0].getDate()).toBe(21)
  })

  it('marks days that have events', () => {
    render(
      <CalendarMonth
        month={month}
        selected={selected}
        events={[event]}
        onSelectDay={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onToday={vi.fn()}
      />,
    )
    expect(
      screen.getByTestId('day-2026-6-10').getAttribute('data-has-events'),
    ).toBe('true')
    expect(
      screen.getByTestId('day-2026-6-11').getAttribute('data-has-events'),
    ).toBe('false')
  })

  it('navigates months', () => {
    const onPrevMonth = vi.fn()
    const onNextMonth = vi.fn()
    render(
      <CalendarMonth
        month={month}
        selected={selected}
        events={[]}
        onSelectDay={vi.fn()}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onToday={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Previous month'))
    fireEvent.click(screen.getByLabelText('Next month'))
    expect(onPrevMonth).toHaveBeenCalledTimes(1)
    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })
})
