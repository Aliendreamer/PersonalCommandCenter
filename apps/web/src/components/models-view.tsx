import { useRouter } from '@tanstack/react-router'
import { Group, Paper, Stack, Tabs, Text, Title } from '@mantine/core'
import type { CatalogueEntry, ModelsStatus } from '@pcc/contracts'

import { ModelsCookbook } from './models-cookbook'
import { ModelsCompare } from './models-compare'

export interface ModelsViewProps {
  status: ModelsStatus | null
  error?: string
  library: CatalogueEntry[]
}

function gb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

/** The /models page body: tabbed view of Status, Compare, and Cookbook. */
export function ModelsView({ status, error, library }: ModelsViewProps) {
  const router = useRouter()

  const installedModels = status?.installed.map((m) => m.name) ?? []

  const handleRefresh = () => {
    void router.invalidate()
  }

  return (
    <Tabs defaultValue="status">
      <Tabs.List mb="md">
        <Tabs.Tab value="status">Status</Tabs.Tab>
        <Tabs.Tab value="compare">Compare</Tabs.Tab>
        <Tabs.Tab value="cookbook">Cookbook</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="status">
        {error || !status ? (
          <Text role="status" size="sm" c="yellow.7">
            Models unavailable
          </Text>
        ) : (
          <Stack gap="md">
            <Paper component="section" withBorder radius="md" p="md">
              <Title order={3} size="h5" mb="sm">
                GPU
              </Title>
              {status.gpus.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No GPU telemetry
                </Text>
              ) : (
                <Stack gap="xs">
                  {status.gpus.map((g) => (
                    <Group
                      key={g.name}
                      justify="space-between"
                      gap="md"
                      wrap="nowrap"
                    >
                      <Text size="sm" fw={500}>
                        {g.name}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {Math.round(g.utilizationPct)}% ·{' '}
                        {Math.round(g.temperatureC)}°C ·{' '}
                        {Math.round(g.memoryUsedMb)}/
                        {Math.round(g.memoryTotalMb)} MB
                      </Text>
                    </Group>
                  ))}
                </Stack>
              )}
            </Paper>

            <Paper component="section" withBorder radius="md" p="md">
              <Title order={3} size="h5" mb="sm">
                Loaded ({status.running.length})
              </Title>
              {status.running.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Nothing loaded
                </Text>
              ) : (
                <Stack gap="xs">
                  {status.running.map((m) => (
                    <Group
                      key={m.name}
                      justify="space-between"
                      gap="md"
                      wrap="nowrap"
                    >
                      <Text size="sm">{m.name}</Text>
                      <Text size="sm" c="dimmed">
                        {gb(m.sizeVramBytes)} VRAM
                      </Text>
                    </Group>
                  ))}
                </Stack>
              )}
            </Paper>

            <Paper component="section" withBorder radius="md" p="md">
              <Title order={3} size="h5" mb="sm">
                Installed ({status.installed.length})
              </Title>
              {status.installed.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No models pulled
                </Text>
              ) : (
                <Stack gap="xs">
                  {status.installed.map((m) => (
                    <Group
                      key={m.name}
                      justify="space-between"
                      gap="md"
                      wrap="nowrap"
                    >
                      <Text size="sm">
                        {m.name}
                        {m.parameterSize ? (
                          <Text span c="dimmed">
                            {' '}
                            · {m.parameterSize}
                          </Text>
                        ) : null}
                        {m.quantization ? (
                          <Text span c="dimmed">
                            {' '}
                            · {m.quantization}
                          </Text>
                        ) : null}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {gb(m.sizeBytes)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        )}
      </Tabs.Panel>

      <Tabs.Panel value="compare">
        <ModelsCompare installedModels={installedModels} />
      </Tabs.Panel>

      <Tabs.Panel value="cookbook">
        <ModelsCookbook
          entries={library}
          installedNames={installedModels}
          onRefresh={handleRefresh}
        />
      </Tabs.Panel>
    </Tabs>
  )
}
