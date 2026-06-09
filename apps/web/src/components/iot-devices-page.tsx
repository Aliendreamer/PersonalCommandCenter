import { useEffect, useState } from 'react'
import type { IotEntity } from '@pcc/contracts'
import { api } from '../lib/api'
import { IotDeviceList } from './iot-device-list'

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; entities: IotEntity[] }
  | { kind: 'error' }

/** The Devices page, lazy-loaded by the /devices route. */
export default function IotDevicesPage() {
  const [state, setState] = useState<PageState>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    api.getIotEntities().then(
      (entities) => {
        if (active) setState({ kind: 'ready', entities })
      },
      () => {
        if (active) setState({ kind: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Devices</h1>
      {state.kind === 'loading' ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <IotDeviceList
          entities={state.kind === 'ready' ? state.entities : []}
          error={state.kind === 'error' ? 'unreachable' : undefined}
        />
      )}
    </div>
  )
}
