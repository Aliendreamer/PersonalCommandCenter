import {
  Anchor,
  Checkbox,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core'
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

/** A responsive grid of task tiles, each with a completion checkbox; degrades on error. */
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
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {tasks.map((task) => {
        const accent = task.completed ? 'green' : 'sky'
        return (
          <Paper
            key={task.uid}
            component="section"
            data-testid={`task-tile-${task.uid}`}
            radius="md"
            p="sm"
            shadow="xs"
            style={{
              border:
                '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))',
              borderLeft: `4px solid var(--mantine-color-${accent}-6)`,
            }}
          >
            <Group align="flex-start" wrap="nowrap" gap="xs">
              <Checkbox
                aria-label={`Complete ${task.title}`}
                checked={task.completed}
                disabled={!onToggle}
                onChange={() => onToggle?.(task)}
                mt={2}
              />
              <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                <Text
                  size="sm"
                  fw={600}
                  td={task.completed ? 'line-through' : undefined}
                  c={task.completed ? 'dimmed' : undefined}
                >
                  {task.title}
                </Text>
                {task.due && (
                  <Text size="xs" c="dimmed">
                    Due {dueLabel(task.due)}
                  </Text>
                )}
                {task.description && (
                  <Text size="xs" c="dimmed" lineClamp={3} mt={2}>
                    {task.description}
                  </Text>
                )}
                {(onEdit || onDelete) && (
                  <Group gap="sm" wrap="nowrap" mt={4}>
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
              </Stack>
            </Group>
          </Paper>
        )
      })}
    </SimpleGrid>
  )
}
