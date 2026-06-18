import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import type { TodoItem } from '@pcc/contracts'
import { TasksOpenTile } from './tasks-open-tile'

const open: TodoItem = { uid: 'a', title: 'Do it', completed: false }
const done: TodoItem = { uid: 'b', title: 'Done', completed: true }

afterEach(cleanup)

describe('TasksOpenTile', () => {
  it('counts open tasks', () => {
    render(<TasksOpenTile tasks={[open, done]} />)

    expect(screen.getByText(/1 open/)).toBeDefined()
  })

  it('shows an all-clear state when nothing is open', () => {
    render(<TasksOpenTile tasks={[done]} />)

    expect(screen.getByText(/all clear/i)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<TasksOpenTile error />)

    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
