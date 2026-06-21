import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import { TaskForm } from './task-form'

function renderForm(ui: React.ReactNode) {
  return render(ui)
}

afterEach(cleanup)

describe('TaskForm', () => {
  it('renders Mantine inputs', () => {
    renderForm(<TaskForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/Title/).className).toContain('mantine-')
  })

  it('submits the title as a TodoInput', () => {
    const onSubmit = vi.fn()
    renderForm(<TaskForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: 'Buy milk' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].title).toBe('Buy milk')
  })

  it('includes a due date when set', () => {
    const onSubmit = vi.fn()
    renderForm(<TaskForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: 'Pay rent' },
    })
    fireEvent.change(screen.getByLabelText('Due'), {
      target: { value: '2026-07-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onSubmit.mock.calls[0][0].due).toContain('2026-07-01')
  })
})
