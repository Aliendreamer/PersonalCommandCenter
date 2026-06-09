import { createFileRoute } from '@tanstack/react-router'
import type { PluginManifest } from '@pcc/contracts'
import { api } from '../lib/api'
import { PluginShell } from '../components/plugin-shell'
import { SystemTile } from '../components/system-tile'
import { IotSummaryTile } from '../components/iot-summary-tile'

interface DashboardData {
  manifests: PluginManifest[]
  error?: string
}

export const Route = createFileRoute('/')({
  loader: async (): Promise<DashboardData> => {
    try {
      return { manifests: await api.getPlugins() }
    } catch (error) {
      // Graceful degradation: empty dashboard with a non-blocking error.
      return { manifests: [], error: (error as Error).message }
    }
  },
  component: Home,
})

function Home() {
  const { manifests, error } = Route.useLoaderData()

  return (
    <PluginShell
      manifests={manifests}
      error={error}
      renderTile={(manifest) => {
        if (manifest.widgets.includes('system-status')) return <SystemTile />
        if (manifest.widgets.includes('iot-summary')) return <IotSummaryTile />
        return null
      }}
    />
  )
}
