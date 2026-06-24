import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Group,
  MultiSelect,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from '@mantine/core'
import type { CompareResult } from '@pcc/contracts'

import { compareModels } from '../lib/server/api'

export interface ModelsCompareProps {
  installedModels: string[]
}

/** Multi-model prompt comparison tab. */
export function ModelsCompare({ installedModels }: ModelsCompareProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<CompareResult[] | null>(null)

  if (installedModels.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No models installed. Pull a model from the Cookbook tab first.
      </Text>
    )
  }

  const canRun = selected.length > 0 && prompt.trim().length > 0 && !loading

  const handleRun = async () => {
    if (!canRun) return
    setLoading(true)
    try {
      const data = await compareModels({
        data: { prompt: prompt.trim(), models: selected },
      })
      setResults(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap="md">
      <MultiSelect
        label="Models"
        placeholder="Select models to compare"
        data={installedModels}
        value={selected}
        onChange={setSelected}
        maxValues={8}
      />
      <Textarea
        label="Prompt"
        placeholder="Enter a prompt to run against each selected model…"
        minRows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.currentTarget.value)}
      />
      <Group>
        <Button onClick={handleRun} disabled={!canRun} loading={loading}>
          Run
        </Button>
      </Group>

      {loading && results === null && (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
          {selected.map((m) => (
            <Card key={m} withBorder radius="md" p="md">
              <Skeleton height={16} mb="sm" />
              <Skeleton height={80} />
            </Card>
          ))}
        </SimpleGrid>
      )}

      {!loading && results === null && (
        <Text size="sm" c="dimmed">
          Select models and enter a prompt, then click Run to compare responses.
        </Text>
      )}

      {results !== null && (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
          {results.map((r) => (
            <Card key={r.model} withBorder radius="md" p="md">
              <Group justify="space-between" mb="sm" wrap="nowrap">
                <Text
                  fw={500}
                  size="sm"
                  style={{ minWidth: 0, flex: 1 }}
                  truncate
                >
                  {r.model}
                </Text>
                <Badge size="sm" variant="light">
                  {(r.durationMs / 1000).toFixed(1)}s
                </Badge>
              </Group>
              {r.error ? (
                <Text size="sm" c="red">
                  {r.error}
                </Text>
              ) : (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {r.content}
                </Text>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
