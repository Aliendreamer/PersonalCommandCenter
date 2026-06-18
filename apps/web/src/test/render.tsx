import { render as rtlRender } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { ReactNode } from 'react'
import { mantineTheme } from '../lib/theme'

/**
 * Test render that wraps the UI in `MantineProvider` (Mantine components require it). Re-exports the
 * rest of `@testing-library/react`, so component tests import `render`/`screen`/`fireEvent` from here.
 */
function Providers({ children }: { children: ReactNode }) {
  return <MantineProvider theme={mantineTheme}>{children}</MantineProvider>
}

export * from '@testing-library/react'

export function render(
  ui: ReactNode,
  options?: Parameters<typeof rtlRender>[1],
) {
  return rtlRender(ui, { wrapper: Providers, ...options })
}
