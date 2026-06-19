import { Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { ModelsStatus } from '@pcc/contracts'

export interface ModelsViewProps {
  status: ModelsStatus | null
  error?: string
}

function gb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

/** The /models page body: GPU panel + loaded + installed models, as cards. Degrades on error. */
export function ModelsView({ status, error }: ModelsViewProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Models unavailable
      </Text>
    )
  }

  return (
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
                  {Math.round(g.utilizationPct)}% · {Math.round(g.temperatureC)}
                  °C · {Math.round(g.memoryUsedMb)}/
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
  )
}
