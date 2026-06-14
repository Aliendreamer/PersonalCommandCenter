import { createFileRoute } from '@tanstack/react-router'

import {
  getIotEntities,
  getPlugins,
  getSystemStatus,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { PluginShell } from '../../components/plugin-shell'
import { SystemTile } from '../../components/system-tile'
import { IotSummaryTile } from '../../components/iot-summary-tile'

export const Route = createFileRoute('/_authenticated/')({
  // SSR-with-data: the dashboard renders fully populated. Each source is settled independently so
  // one plugin's outage (e.g. IoT 502 without an HA token) degrades only its tile.
  loader: async () => {
    const [plugins, system, iot] = await Promise.all([
      settle(getPlugins()),
      settle(getSystemStatus()),
      settle(getIotEntities()),
    ])
    return { plugins, system, iot }
  },
  component: Home,
})

function Home() {
  const { plugins, system, iot } = Route.useLoaderData()
  return (
    <PluginShell
      manifests={plugins.data ?? []}
      error={plugins.error ? 'plugins unavailable' : undefined}
      renderTile={(manifest) => {
        if (manifest.widgets.includes('system-status')) {
          return <SystemTile status={system.data} error={system.error} />
        }
        if (manifest.widgets.includes('iot-summary')) {
          return <IotSummaryTile entities={iot.data} error={iot.error} />
        }
        return null
      }}
    />
  )
}
