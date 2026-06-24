import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { Search, Trash2 } from 'lucide-react'
import type { MemoryEntry } from '@pcc/contracts'

import { deleteMemory, getMemory, storeMemory } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/memory')({
  loader: async () => settle(getMemory()),
  component: MemoryPage,
})

interface NewMemoryForm {
  content: string
  tags: string
}

function MemoryPage() {
  const result = Route.useLoaderData()

  const [entries, setEntries] = useState<MemoryEntry[]>(result.data ?? [])
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync from loader data when route revalidates
  useEffect(() => {
    if (result.data) {
      setEntries(result.data)
    }
  }, [result.data])

  // Debounced search: 400 ms after the user stops typing, call the server fn
  useEffect(() => {
    if (!query.trim()) {
      // Restore the loader's initial data when the query is cleared
      setEntries(result.data ?? [])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const hits = await getMemory({ data: query.trim() })
        setEntries(hits)
      } catch {
        // Silently keep the previous results on search error
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query, result.data])

  const form = useForm<NewMemoryForm>({
    initialValues: { content: '', tags: '' },
    validate: {
      content: (v) => (v.trim().length === 0 ? 'Content is required' : null),
    },
  })

  const handleSave = async (values: NewMemoryForm) => {
    setSaving(true)
    try {
      const tags = values.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await storeMemory({ data: { content: values.content.trim(), tags } })
      // Re-fetch the full list after save
      const fresh = await getMemory()
      setEntries(fresh)
      form.reset()
      setModalOpen(false)
    } catch {
      // Let the user retry — the modal stays open
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    // Optimistic removal
    setEntries((prev) => prev.filter((e) => e.id !== id))
    try {
      await deleteMemory({ data: id })
    } catch {
      // Restore on failure
      const fresh = await getMemory()
      setEntries(fresh)
    }
  }

  return (
    <PluginPage
      title="Memory"
      fill
      actions={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          New Memory
        </Button>
      }
    >
      {/* Search bar */}
      <TextInput
        placeholder="Search memories…"
        leftSection={searching ? <Loader size={14} /> : <Search size={14} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="md"
        aria-label="Search memories"
      />

      {/* Entry list */}
      {result.error && !entries.length ? (
        <Text role="status" size="sm" c="yellow.7">
          Memory unavailable
        </Text>
      ) : entries.length === 0 ? (
        <Text size="sm" c="dimmed">
          No memories yet
        </Text>
      ) : (
        <Stack gap="sm">
          {entries.map((entry) => (
            <Paper key={entry.id} withBorder p="sm" radius="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {entry.content}
                  </Text>
                  <Group gap={4} wrap="wrap">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} size="xs" variant="light">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      {new Date(entry.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    {entry.score > 0 && (
                      <Text size="xs" c="dimmed">
                        ({(entry.score * 100).toFixed(0)}% match)
                      </Text>
                    )}
                  </Group>
                </Stack>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label="Delete memory"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 size={14} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {/* New Memory modal */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false)
          form.reset()
        }}
        title="New Memory"
        centered
      >
        <form onSubmit={form.onSubmit(handleSave)}>
          <Stack gap="sm">
            <Textarea
              label="Content *"
              placeholder="What do you want to remember?"
              autosize
              minRows={3}
              {...form.getInputProps('content')}
            />
            <TextInput
              label="Tags"
              placeholder="comma, separated, tags"
              {...form.getInputProps('tags')}
            />
            <Group justify="flex-end" mt="xs">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpen(false)
                  form.reset()
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </PluginPage>
  )
}
