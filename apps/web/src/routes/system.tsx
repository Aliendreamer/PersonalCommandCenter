import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

// Lazy-loaded so a plugin's UI code is only fetched when its route is visited.
const SystemPage = lazy(() => import('../components/system-page'))

export const Route = createFileRoute('/system')({
  component: () => (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <SystemPage />
    </Suspense>
  ),
})
