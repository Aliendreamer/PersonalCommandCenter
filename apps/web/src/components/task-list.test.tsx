import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import type { TodoItem } from '@pcc/contracts'
import { TaskList } from './task-list'

const task: TodoItem = {
  uid: 'a1',
  title: 'Write the report',
  due: '2026-06-25T00:00:00.000Z',
  completed: false,
  description: 'Quarterly summary',
}

afterEach(cleanup)

describe('TaskList', () => {
  it('renders each task as its own tile', () => {
    render(<TaskList tasks={[task]} />)
    expect(screen.getByTestId('task-tile-a1')).toBeDefined()
    expect(screen.getByText('Write the report')).toBeDefined()
  })

  it('toggles completion via the checkbox', () => {
    const onToggle = vi.fn()
    render(<TaskList tasks={[task]} onToggle={onToggle} />)
    fireEvent.click(screen.getByLabelText('Complete Write the report'))
    expect(onToggle).toHaveBeenCalledWith(task)
  })

  it('exposes a delete action', () => {
    const onDelete = vi.fn()
    render(<TaskList tasks={[task]} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(task)
  })

  it('shows a degraded state on error', () => {
    render(<TaskList tasks={[]} error="unreachable" />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
