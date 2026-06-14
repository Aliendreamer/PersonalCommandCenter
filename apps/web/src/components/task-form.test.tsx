import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TaskForm } from './task-form'

afterEach(cleanup)

describe('TaskForm', () => {
  it('submits the title as a TodoInput', () => {
    const onSubmit = vi.fn()
    render(<TaskForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Buy milk' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].title).toBe('Buy milk')
  })

  it('includes a due date when set', () => {
    const onSubmit = vi.fn()
    render(<TaskForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Pay rent' },
    })
    fireEvent.change(screen.getByLabelText('Due'), {
      target: { value: '2026-07-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onSubmit.mock.calls[0][0].due).toContain('2026-07-01')
  })
})
