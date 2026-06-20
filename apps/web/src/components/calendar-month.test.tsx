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

function renderMonth(
  props: Partial<React.ComponentProps<typeof CalendarMonth>> = {},
) {
  const handlers = {
    onSelectDay: vi.fn(),
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onPrevYear: vi.fn(),
    onNextYear: vi.fn(),
    onToday: vi.fn(),
  }
  render(
    <CalendarMonth
      month={month}
      selected={selected}
      events={[]}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

afterEach(cleanup)

describe('CalendarMonth', () => {
  it('shows the month and year header', () => {
    renderMonth()
    expect(screen.getByText(/June 2026/)).toBeDefined()
  })

  it('selects a day when its cell is clicked', () => {
    const { onSelectDay } = renderMonth()
    fireEvent.click(screen.getByTestId('day-2026-6-21'))
    expect(onSelectDay).toHaveBeenCalledTimes(1)
    expect(onSelectDay.mock.calls[0][0].getDate()).toBe(21)
  })

  it('marks days that have events', () => {
    renderMonth({ events: [event] })
    expect(
      screen.getByTestId('day-2026-6-10').getAttribute('data-has-events'),
    ).toBe('true')
    expect(
      screen.getByTestId('day-2026-6-11').getAttribute('data-has-events'),
    ).toBe('false')
  })

  it('navigates months', () => {
    const { onPrevMonth, onNextMonth } = renderMonth()
    fireEvent.click(screen.getByLabelText('Previous month'))
    fireEvent.click(screen.getByLabelText('Next month'))
    expect(onPrevMonth).toHaveBeenCalledTimes(1)
    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })

  it('navigates years', () => {
    const { onPrevYear, onNextYear } = renderMonth()
    fireEvent.click(screen.getByLabelText('Previous year'))
    fireEvent.click(screen.getByLabelText('Next year'))
    expect(onPrevYear).toHaveBeenCalledTimes(1)
    expect(onNextYear).toHaveBeenCalledTimes(1)
  })
})
