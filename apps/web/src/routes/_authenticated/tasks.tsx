import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Box, Button, Group, Title } from '@mantine/core'
import type { TodoInput, TodoItem } from '@pcc/contracts'

import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { TaskList } from '../../components/task-list'
import { TaskForm } from '../../components/task-form'

export const Route = createFileRoute('/_authenticated/tasks')({
  loader: async () => settle(getTasks()),
  component: TasksPage,
})

function TasksPage() {
  const tasks = Route.useLoaderData()
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function refresh() {
    setCreating(false)
    await router.invalidate()
  }

  async function onCreate(input: TodoInput) {
    await createTask({ data: input })
    await refresh()
  }

  async function onToggle(task: TodoItem) {
    await updateTask({
      data: {
        uid: task.uid,
        task: {
          title: task.title,
          due: task.due ?? undefined,
          completed: !task.completed,
          description: task.description ?? undefined,
        },
      },
    })
    await refresh()
  }

  async function onDelete(task: TodoItem) {
    await deleteTask({ data: task.uid })
    await refresh()
  }

  return (
    <Box p="lg">
      <Group justify="space-between" mb="md">
        <Title order={1}>Tasks</Title>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            Add task
          </Button>
        )}
      </Group>

      {creating && (
        <TaskForm onSubmit={onCreate} onCancel={() => setCreating(false)} />
      )}

      <TaskList
        tasks={tasks.data ?? []}
        error={tasks.error ? 'unreachable' : undefined}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </Box>
  )
}
