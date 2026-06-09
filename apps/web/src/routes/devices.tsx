import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

const IotDevicesPage = lazy(() => import('../components/iot-devices-page'))

export const Route = createFileRoute('/devices')({
  component: () => (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <IotDevicesPage />
    </Suspense>
  ),
})
