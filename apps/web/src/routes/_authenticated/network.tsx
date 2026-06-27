import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Badge,
  Chip,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { NetworkDevice } from '@pcc/contracts'

import { getNetwork } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { PluginPage } from '../../components/plugin-page'
import { NetworkNodeCard } from '../../components/network-node-card'

export const Route = createFileRoute('/_authenticated/network')({
  loader: async () => settle(getNetwork()),
  component: NetworkPage,
})

function connectionLabel(type: string | null | undefined): string {
  switch (type) {
    case 'wired':
      return '🔌 Wired'
    case 'wireless_2_4_ghz':
      return '📶 2.4 GHz'
    case 'wireless_5_ghz':
      return '📶 5 GHz'
    case 'wireless_6_ghz':
      return '📶 6 GHz'
    default:
      return type ?? '—'
  }
}

function NetworkDeviceRow({ device }: { device: NetworkDevice }) {
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500}>
          {device.name}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {device.ip ?? '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{connectionLabel(device.connectionType)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          ↓ {device.downKbps?.toFixed(1) ?? '—'} / ↑{' '}
          {device.upKbps?.toFixed(1) ?? '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {device.rssiDbm != null ? `${device.rssiDbm} dBm` : '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge color={device.home ? 'green' : 'gray'} size="sm">
          {device.home ? 'Home' : 'Away'}
        </Badge>
      </Table.Td>
    </Table.Tr>
  )
}

function NetworkPage() {
  const result = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [showHome, setShowHome] = useState<'all' | 'home' | 'away'>('all')

  if (!result.data) {
    return (
      <PluginPage title="Network">
        <Text c="yellow.7" role="status">
          Network data unavailable — Home Assistant may not be configured.
        </Text>
      </PluginPage>
    )
  }

  const { nodes, devices } = result.data

  const filtered = devices.filter((d) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.ip?.toLowerCase().includes(q) ?? false) ||
      (d.mac?.toLowerCase().includes(q) ?? false)
    const matchesFilter =
      showHome === 'all' ||
      (showHome === 'home' && d.home) ||
      (showHome === 'away' && !d.home)
    return matchesSearch && matchesFilter
  })

  return (
    <PluginPage title="Network">
      <Stack gap="xl">
        {nodes.length > 0 && (
          <section>
            <Title order={3} size="h5" mb="sm">
              Nodes
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {nodes.map((node) => (
                <NetworkNodeCard key={node.name} node={node} />
              ))}
            </SimpleGrid>
          </section>
        )}

        <section>
          <Title order={3} size="h5" mb="sm">
            Devices ({filtered.length})
          </Title>
          <Group mb="sm">
            <TextInput
              placeholder="Search name, IP or MAC…"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: 1 }}
              size="sm"
            />
            <Chip.Group<false, 'all' | 'home' | 'away'>
              value={showHome}
              onChange={(v) => setShowHome(v)}
            >
              <Group gap="xs">
                <Chip value="all" size="sm">
                  All
                </Chip>
                <Chip value="home" size="sm">
                  Home
                </Chip>
                <Chip value="away" size="sm">
                  Away
                </Chip>
              </Group>
            </Chip.Group>
          </Group>
          {filtered.length === 0 ? (
            <Text size="sm" c="dimmed">
              No devices match the filter.
            </Text>
          ) : (
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>IP</Table.Th>
                  <Table.Th>Connection</Table.Th>
                  <Table.Th>Bandwidth KB/s</Table.Th>
                  <Table.Th>Signal</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((device) => (
                  <NetworkDeviceRow
                    key={device.mac ?? device.name}
                    device={device}
                  />
                ))}
              </Table.Tbody>
            </Table>
          )}
        </section>
      </Stack>
    </PluginPage>
  )
}
