import { Button, Checkbox, Group, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import type { CalendarEvent, CalendarEventInput } from '@pcc/contracts'

export interface CalendarEventFormProps {
  onSubmit: (input: CalendarEventInput) => void
  onCancel?: () => void
  /** When provided, the form edits this event (fields pre-filled). */
  initial?: CalendarEvent
  /** Create mode: seed start/end from this day (e.g. the day clicked on the calendar). */
  initialStart?: string
  submitLabel?: string
}

// <input type="datetime-local"> wants `YYYY-MM-DDTHH:mm` in local time.
function toLocalInput(iso: string | undefined): string {
  if (!iso) {
    return ''
  }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// One hour after the given instant, as a datetime-local string (default event end).
function oneHourAfter(iso: string | undefined): string {
  if (!iso) {
    return ''
  }
  return toLocalInput(
    new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString(),
  )
}

/** Create/edit form for a calendar event. Presentational — the page wires `onSubmit` to a mutation. */
export function CalendarEventForm({
  onSubmit,
  onCancel,
  initial,
  initialStart,
  submitLabel = 'Save',
}: CalendarEventFormProps) {
  const form = useForm({
    initialValues: {
      title: initial?.title ?? '',
      start: toLocalInput(initial?.start ?? initialStart),
      end: toLocalInput(initial?.end) || oneHourAfter(initialStart),
      allDay: initial?.allDay ?? false,
      location: initial?.location ?? '',
    },
  })

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          title: values.title,
          start: new Date(values.start).toISOString(),
          end: new Date(values.end).toISOString(),
          allDay: values.allDay,
          location: values.location || undefined,
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
          required
          type="datetime-local"
          label="Start"
          key={form.key('start')}
          {...form.getInputProps('start')}
        />
        <TextInput
          required
          type="datetime-local"
          label="End"
          key={form.key('end')}
          {...form.getInputProps('end')}
        />
        <Checkbox
          label="All day"
          key={form.key('allDay')}
          {...form.getInputProps('allDay', { type: 'checkbox' })}
        />
        <TextInput
          label="Location"
          key={form.key('location')}
          {...form.getInputProps('location')}
        />
        <Group gap="sm" mt="xs">
          <Button type="submit">{submitLabel}</Button>
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
