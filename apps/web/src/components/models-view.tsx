import { Box, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { ModelsStatus } from '@pcc/contracts'

export interface ModelsViewProps {
  status: ModelsStatus | null
  error?: string
}

function gb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

/** The /models page body: GPU panel + loaded + installed models. Degrades on error. */
export function ModelsView({ status, error }: ModelsViewProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Models unavailable
      </Text>
    )
  }

  return (
    <Stack gap="lg">
      <section>
        <Title order={3} mb="xs">
          GPU
        </Title>
        {status.gpus.length === 0 ? (
          <Text size="sm" c="dimmed">
            No GPU telemetry
          </Text>
        ) : (
          <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
            {status.gpus.map((g) => (
              <Text component="li" key={g.name} size="sm">
                <Text span fw={500}>
                  {g.name}
                </Text>{' '}
                — {Math.round(g.utilizationPct)}% util ·{' '}
                {Math.round(g.temperatureC)}°C · {Math.round(g.memoryUsedMb)}/
                {Math.round(g.memoryTotalMb)} MB
              </Text>
            ))}
          </Box>
        )}
      </section>

      <section>
        <Title order={3} mb="xs">
          Loaded ({status.running.length})
        </Title>
        {status.running.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nothing loaded
          </Text>
        ) : (
          <Paper withBorder radius="md">
            <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
              {status.running.map((m, i) => (
                <Box component="li" key={m.name} style={rowBorder(i)}>
                  <Group justify="space-between" px="sm" py="xs">
                    <Text size="sm">{m.name}</Text>
                    <Text size="sm" c="dimmed">
                      {gb(m.sizeVramBytes)} VRAM
                    </Text>
                  </Group>
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </section>

      <section>
        <Title order={3} mb="xs">
          Installed ({status.installed.length})
        </Title>
        {status.installed.length === 0 ? (
          <Text size="sm" c="dimmed">
            No models pulled
          </Text>
        ) : (
          <Paper withBorder radius="md">
            <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
              {status.installed.map((m, i) => (
                <Box component="li" key={m.name} style={rowBorder(i)}>
                  <Group justify="space-between" px="sm" py="xs">
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
                </Box>
              ))}
            </Box>
          </Paper>
        )}
      </section>
    </Stack>
  )
}
