import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { PluginManifest } from '@pcc/contracts'
import { api } from '../lib/api'
import { PluginShell } from '../components/plugin-shell'
import { SystemTile } from '../components/system-tile'
import { IotSummaryTile } from '../components/iot-summary-tile'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [manifests, setManifests] = useState<PluginManifest[]>([])
  const [error, setError] = useState<string>()

  // Client-side (BFF): fetched browser → API with the session cookie, after the auth gate.
  useEffect(() => {
    let active = true
    api.getPlugins().then(
      (loaded) => {
        if (active) setManifests(loaded)
      },
      (err: Error) => {
        if (active) setError(err.message)
      },
    )
    return () => {
      active = false
    }
  }, [])

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
