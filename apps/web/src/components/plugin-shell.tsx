import type { ReactNode } from 'react'
import type { PluginManifest } from '@pcc/contracts'

export interface PluginShellProps {
  manifests: PluginManifest[]
  error?: string
  /** Optional renderer for a plugin's dashboard tile body (e.g. the live system status). */
  renderTile?: (manifest: PluginManifest) => ReactNode
}

/**
 * The dashboard shell: renders a nav entry and a dashboard tile for each enabled plugin.
 * Plugins absent from the manifest are not rendered. A manifest-load failure surfaces a
 * non-blocking error banner instead of breaking the page.
 */
export function PluginShell({
  manifests,
  error,
  renderTile,
}: PluginShellProps) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-48 shrink-0 border-r p-4" aria-label="Plugins">
        <ul>
          {manifests.map((manifest) => (
            <li key={manifest.id}>
              <a href={manifest.routeBase}>{manifest.navLabel}</a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6">
        {error ? (
          <div
            role="alert"
            className="mb-4 rounded border border-amber-400 bg-amber-50 p-3"
          >
            Some data could not be loaded: {error}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {manifests.map((manifest) => (
            <section
              key={manifest.id}
              data-testid={`tile-${manifest.id}`}
              className="rounded border p-4"
            >
              <h2 className="mb-2 font-semibold">{manifest.navLabel}</h2>
              {renderTile?.(manifest)}
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
