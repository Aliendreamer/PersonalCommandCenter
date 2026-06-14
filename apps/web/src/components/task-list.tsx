import type { TodoItem } from '@pcc/contracts'

export interface TaskListProps {
  tasks: TodoItem[]
  error?: string
  /** Optional write actions (wired by the page in the write-path phase). */
  onToggle?: (task: TodoItem) => void
  onEdit?: (task: TodoItem) => void
  onDelete?: (task: TodoItem) => void
}

function dueLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

/** Lists to-dos with a completion checkbox; degrades on error. */
export function TaskList({
  tasks,
  error,
  onToggle,
  onEdit,
  onDelete,
}: TaskListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Tasks unavailable
      </p>
    )
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-gray-500">No tasks</p>
  }

  return (
    <ul className="divide-y rounded border">
      {tasks.map((task) => (
        <li
          key={task.uid}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <label className="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Complete ${task.title}`}
              checked={task.completed}
              disabled={!onToggle}
              onChange={() => onToggle?.(task)}
            />
            <span
              className={
                task.completed
                  ? 'truncate text-gray-400 line-through'
                  : 'truncate'
              }
            >
              {task.title}
            </span>
            {task.due && (
              <span className="shrink-0 text-gray-500">
                {dueLabel(task.due)}
              </span>
            )}
          </label>
          {(onEdit || onDelete) && (
            <span className="flex shrink-0 gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="underline"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(task)}
                  className="text-red-700 underline"
                >
                  Delete
                </button>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
