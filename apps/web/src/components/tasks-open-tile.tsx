import { Text } from '@mantine/core'
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
      <Text role="status" size="sm" c="yellow.7">
        Tasks unavailable
      </Text>
    )
  }

  const open = tasks.filter((task) => !task.completed)
  if (open.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        All clear
      </Text>
    )
  }

  const overdue = open.filter(isOverdue).length
  return (
    <Text size="sm">
      {open.length} open{overdue > 0 ? ` · ${overdue} overdue` : ''}
    </Text>
  )
}
