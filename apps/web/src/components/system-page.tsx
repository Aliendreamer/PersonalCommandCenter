import { SystemTile } from './system-tile'

/** The system plugin's detail page, lazy-loaded by the /system route. */
export default function SystemPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">System</h1>
      <div className="max-w-sm rounded border p-4">
        <SystemTile />
      </div>
    </div>
  )
}
