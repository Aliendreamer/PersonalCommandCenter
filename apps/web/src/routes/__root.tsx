import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { MantineProvider } from '@mantine/core'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import type { Me } from '../lib/server/api-loaders'
import {
  initialColorScheme,
  mantineTheme,
  pccColorSchemeManager,
} from '../lib/theme'
import appCss from '../styles.css?url'

// Cookie-backed color-scheme manager (single instance; document-guarded so it is inert during SSR).
const colorSchemeManager = pccColorSchemeManager()

// Read the `pcc_theme` cookie server-side so SSR renders the same color scheme the client will
// (default dark) — otherwise the toggle's pressed state hydrates stale on a mismatch.
const getInitialColorScheme = createServerFn().handler(() =>
  initialColorScheme(getRequestHeader('cookie')),
)

/** Router context. `me` is populated by the `_authenticated` guard's `beforeLoad`. */
export interface RouterContext {
  me: Me | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Personal Command Center',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  loader: () => getInitialColorScheme(),
  shellComponent: RootDocument,
})

// Resolves `pcc_theme` (cookie) and applies it before paint: the `.dark` class (Tailwind, during
// migration) and Mantine's `data-mantine-color-scheme` — one cookie, both systems. Default is dark
// (no cookie -> dark); only an explicit `system` preference defers to the OS color scheme.
const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )pcc_theme=([^;]+)/);var p=m?m[1]:'dark';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.dataset.theme=d?'dark':'light';e.setAttribute('data-mantine-color-scheme',d?'dark':'light');}catch(e){}})();`

function RootDocument({ children }: { children: React.ReactNode }) {
  // SSR-resolved from the cookie so the server render matches the client (no hydration mismatch).
  const colorScheme = Route.useLoaderData()
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking pre-paint theme init — applies .dark from the cookie (or OS pref) before
            the body renders, so there is no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <MantineProvider
          theme={mantineTheme}
          colorSchemeManager={colorSchemeManager}
          defaultColorScheme={colorScheme}
        >
          {children}
        </MantineProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
