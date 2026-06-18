import { Button, Group, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import type { TodoInput } from '@pcc/contracts'

export interface TaskFormProps {
  onSubmit: (input: TodoInput) => void
  onCancel?: () => void
}

/** Create form for a to-do. Presentational — the page wires `onSubmit` to a mutation. */
export function TaskForm({ onSubmit, onCancel }: TaskFormProps) {
  const form = useForm({
    initialValues: { title: '', due: '', description: '' },
  })

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          title: values.title,
          due: values.due ? new Date(values.due).toISOString() : undefined,
          description: values.description || undefined,
        }),
      )}
    >
      <Stack gap="sm" maw={420} mb="lg">
        <TextInput
          required
          label="Title"
          key={form.key('title')}
          {...form.getInputProps('title')}
        />
        <TextInput
          type="date"
          label="Due"
          key={form.key('due')}
          {...form.getInputProps('due')}
        />
        <TextInput
          label="Notes"
          key={form.key('description')}
          {...form.getInputProps('description')}
        />
        <Group gap="sm" mt="xs">
          <Button type="submit">Add task</Button>
          {onCancel && (
            <Button type="button" variant="subtle" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Group>
      </Stack>
    </form>
  )
}
