import { Anchor, Box, Checkbox, Group, Paper, Text } from '@mantine/core'
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

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

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
      <Text role="status" size="sm" c="yellow.7">
        Tasks unavailable
      </Text>
    )
  }

  if (tasks.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No tasks
      </Text>
    )
  }

  return (
    <Paper withBorder radius="md">
      <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
        {tasks.map((task, i) => (
          <Box component="li" key={task.uid} style={rowBorder(i)}>
            <Group justify="space-between" wrap="nowrap" px="sm" py="xs">
              <Checkbox
                aria-label={`Complete ${task.title}`}
                checked={task.completed}
                disabled={!onToggle}
                onChange={() => onToggle?.(task)}
                styles={{ body: { minWidth: 0, alignItems: 'center' } }}
                label={
                  <Group gap="xs" wrap="nowrap">
                    <Text
                      size="sm"
                      truncate
                      td={task.completed ? 'line-through' : undefined}
                      c={task.completed ? 'dimmed' : undefined}
                    >
                      {task.title}
                    </Text>
                    {task.due && (
                      <Text size="sm" c="dimmed" style={{ flex: 'none' }}>
                        {dueLabel(task.due)}
                      </Text>
                    )}
                  </Group>
                }
              />
              {(onEdit || onDelete) && (
                <Group gap="sm" wrap="nowrap" style={{ flex: 'none' }}>
                  {onEdit && (
                    <Anchor
                      component="button"
                      type="button"
                      size="sm"
                      onClick={() => onEdit(task)}
                    >
                      Edit
                    </Anchor>
                  )}
                  {onDelete && (
                    <Anchor
                      component="button"
                      type="button"
                      size="sm"
                      c="red"
                      onClick={() => onDelete(task)}
                    >
                      Delete
                    </Anchor>
                  )}
                </Group>
              )}
            </Group>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
