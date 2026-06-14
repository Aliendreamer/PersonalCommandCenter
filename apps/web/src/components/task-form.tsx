import { useState } from 'react'
import type { TodoInput } from '@pcc/contracts'

export interface TaskFormProps {
  onSubmit: (input: TodoInput) => void
  onCancel?: () => void
}

/** Create form for a to-do. Presentational — the page wires `onSubmit` to a mutation. */
export function TaskForm({ onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [description, setDescription] = useState('')

  return (
    <form
      className="mb-6 grid max-w-md gap-2 rounded border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          title,
          due: due ? new Date(due).toISOString() : undefined,
          description: description || undefined,
        })
      }}
    >
      <label className="grid gap-1 text-sm">
        Title
        <input
          required
          aria-label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Due
        <input
          type="date"
          aria-label="Due"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Notes
        <input
          aria-label="Notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          className="rounded bg-gray-900 px-3 py-1 text-sm text-white"
        >
          Add task
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm underline"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
