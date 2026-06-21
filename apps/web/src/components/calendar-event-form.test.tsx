import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import { CalendarEventForm } from './calendar-event-form'

function renderForm(ui: React.ReactNode) {
  return render(ui)
}

afterEach(cleanup)

describe('CalendarEventForm', () => {
  it('renders Mantine inputs', () => {
    renderForm(<CalendarEventForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/Title/).className).toContain('mantine-')
  })

  it('submits the entered fields as a CalendarEventInput', () => {
    const onSubmit = vi.fn()
    renderForm(<CalendarEventForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: 'Lunch' },
    })
    fireEvent.change(screen.getByLabelText(/Start/), {
      target: { value: '2026-06-15T12:00' },
    })
    fireEvent.change(screen.getByLabelText(/End/), {
      target: { value: '2026-06-15T13:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const input = onSubmit.mock.calls[0][0]
    expect(input.title).toBe('Lunch')
    expect(new Date(input.start).getTime()).toBe(
      new Date('2026-06-15T12:00').getTime(),
    )
    expect(input.allDay).toBe(false)
  })

  it('blocks submit and shows an error when end is not after start', () => {
    const onSubmit = vi.fn()
    renderForm(<CalendarEventForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: 'Bad range' },
    })
    fireEvent.change(screen.getByLabelText(/Start/), {
      target: { value: '2026-06-15T13:00' },
    })
    fireEvent.change(screen.getByLabelText(/End/), {
      target: { value: '2026-06-15T12:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/end must be after start/i)).toBeDefined()
  })

  it('pre-fills when editing an existing event', () => {
    renderForm(
      <CalendarEventForm
        onSubmit={vi.fn()}
        submitLabel="Update"
        initial={{
          uid: 'e1',
          title: 'Standup',
          start: '2026-06-15T09:00:00Z',
          end: '2026-06-15T09:30:00Z',
          allDay: false,
        }}
      />,
    )

    expect(screen.getByDisplayValue('Standup')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Update' })).toBeDefined()
  })
})
