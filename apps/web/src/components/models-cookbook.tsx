import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import type { CatalogueEntry } from '@pcc/contracts'

import { deleteModel, pullModel } from '../lib/server/api'

export interface ModelsCookbookProps {
  entries: CatalogueEntry[]
  installedNames: string[]
  onRefresh: () => void
}

const fitsBadgeColor: Record<CatalogueEntry['fits'], string> = {
  yes: 'green',
  marginal: 'yellow',
  no: 'red',
  unknown: 'gray',
}

const fitsBadgeLabel: Record<CatalogueEntry['fits'], string> = {
  yes: 'Fits VRAM',
  marginal: 'Marginal VRAM',
  no: 'Exceeds VRAM',
  unknown: 'VRAM ?',
}

function fitsLabel(entry: CatalogueEntry): string {
  const gb = `${entry.sizeGb.toFixed(1)} GB`
  return `${gb} · ${fitsBadgeLabel[entry.fits]}`
}

/** Model catalogue / cookbook tab: browse, pull, and delete Ollama models. */
export function ModelsCookbook({
  entries,
  installedNames,
  onRefresh,
}: ModelsCookbookProps) {
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState<string | null>(null)
  const [pulling, setPulling] = useState<string | null>(null)
  const [pullError, setPullError] = useState<string | null>(null)

  const families = useMemo(() => {
    const unique = Array.from(new Set(entries.map((e) => e.family))).sort()
    return unique.map((f) => ({ value: f, label: f }))
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (familyFilter && e.family !== familyFilter) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.family.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [entries, search, familyFilter])

  const handlePull = async (name: string) => {
    setPulling(name)
    setPullError(null)
    try {
      await pullModel({ data: name })
      onRefresh()
    } catch (err) {
      setPullError(err instanceof Error ? err.message : 'Pull failed')
    } finally {
      setPulling(null)
    }
  }

  const handleDelete = async (name: string) => {
    try {
      await deleteModel({ data: name })
      onRefresh()
    } catch {
      // silently ignore — the list will re-sync on next refresh
    }
  }

  return (
    <Stack gap="md">
      <Group gap="sm">
        <TextInput
          placeholder="Search by name, family, or tag…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
          aria-label="Search models"
        />
        <Select
          placeholder="All families"
          data={families}
          value={familyFilter}
          onChange={setFamilyFilter}
          clearable
          style={{ minWidth: 160 }}
          aria-label="Filter by family"
        />
      </Group>

      {filtered.length === 0 ? (
        <Text size="sm" c="dimmed">
          No models match your search.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {filtered.map((entry) => {
            const installed = installedNames.includes(entry.name)
            return (
              <Card key={entry.name} withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Text fw={700} size="sm">
                    {entry.name}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {entry.description}
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    <Badge size="xs" variant="light">
                      {entry.parameterSize}
                    </Badge>
                    <Badge size="xs" variant="outline">
                      {entry.family}
                    </Badge>
                    <Badge
                      size="xs"
                      color={fitsBadgeColor[entry.fits]}
                      variant="light"
                    >
                      {fitsLabel(entry)}
                    </Badge>
                  </Group>
                  <Group mt="xs">
                    {installed ? (
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(entry.name)}
                      >
                        Delete
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handlePull(entry.name)}
                        disabled={pulling !== null}
                        loading={pulling === entry.name}
                      >
                        Pull
                      </Button>
                    )}
                  </Group>
                </Stack>
              </Card>
            )
          })}
        </SimpleGrid>
      )}

      {/* Pull progress modal */}
      <Modal
        opened={pulling !== null}
        onClose={() => {}}
        title={`Pulling ${pulling ?? ''}`}
        centered
        withCloseButton={false}
      >
        <Stack gap="sm">
          <Text size="sm">Downloading…</Text>
          <Progress value={100} animated striped />
          {pullError && (
            <Text size="sm" c="red">
              {pullError}
            </Text>
          )}
        </Stack>
      </Modal>
    </Stack>
  )
}
