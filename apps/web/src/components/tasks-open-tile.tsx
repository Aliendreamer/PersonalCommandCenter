import type { TodoItem } from '@pcc/contracts'

export interface TasksOpenTileProps {
  /** Provided by the route loader (SSR-with-data); absent when the source is degraded. */
  tasks?: TodoItem[]
  error?: boolean
}

function isOverdue(task: TodoItem): boolean {
  return task.due != null && new Date(task.due).getTime() < Date.now()
}

/** Dashboard tile showing the open-task count, with a degraded state when unavailable. */
export function TasksOpenTile({ tasks, error }: TasksOpenTileProps) {
  if (error || !tasks) {
    return (
      <p role="status" className="text-sm text-warning">
        Tasks unavailable
      </p>
    )
  }

  const open = tasks.filter((task) => !task.completed)
  if (open.length === 0) {
    return <p className="text-sm text-muted-foreground">All clear</p>
  }

  const overdue = open.filter(isOverdue).length
  return (
    <p className="text-sm">
      {open.length} open{overdue > 0 ? ` · ${overdue} overdue` : ''}
    </p>
  )
}
