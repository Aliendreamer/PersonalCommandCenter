import { Box, Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { IotEntity } from '@pcc/contracts'

export interface IotDeviceListProps {
  entities: IotEntity[]
  error?: string
}

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

/** Lists Home Assistant entities grouped by domain; degrades on error. */
export function IotDeviceList({ entities, error }: IotDeviceListProps) {
  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Devices unavailable
      </Text>
    )
  }

  const byDomain = new Map<string, IotEntity[]>()
  for (const entity of entities) {
    const list = byDomain.get(entity.domain) ?? []
    list.push(entity)
    byDomain.set(entity.domain, list)
  }

  return (
    <Stack gap="lg">
      {[...byDomain.entries()].map(([domain, list]) => (
        <section key={domain} data-testid={`domain-${domain}`}>
          <Title order={4} tt="capitalize" mb="xs">
            {domain}
          </Title>
          <Paper withBorder radius="md">
            <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
              {list.map((entity, i) => (
                <Box component="li" key={entity.entityId} style={rowBorder(i)}>
                  <Group justify="space-between" px="sm" py="xs">
                    <Text size="sm">{entity.name}</Text>
                    <Text size="sm" c="dimmed">
                      {entity.state}
                      {entity.unit ? ` ${entity.unit}` : ''}
                    </Text>
                  </Group>
                </Box>
              ))}
            </Box>
          </Paper>
        </section>
      ))}
    </Stack>
  )
}
