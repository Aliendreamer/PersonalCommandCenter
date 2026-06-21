import { render as rtlRender } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { MantineProviderProps } from '@mantine/core'
import type { ReactNode } from 'react'
import { mantineTheme } from '../lib/theme'

/** Extra `MantineProvider` props (e.g. a `colorSchemeManager`/`defaultColorScheme`) for tests that need them. */
type RenderOptions = Parameters<typeof rtlRender>[1] & {
  mantineProps?: Omit<MantineProviderProps, 'theme' | 'children'>
}

/**
 * Test render that wraps the UI in `MantineProvider` (Mantine components require it). Re-exports the
 * rest of `@testing-library/react`, so component tests import `render`/`screen`/`fireEvent` from here.
 */
export * from '@testing-library/react'

export function render(ui: ReactNode, options?: RenderOptions) {
  const { mantineProps, ...rtlOptions } = options ?? {}
  function Providers({ children }: { children: ReactNode }) {
    return (
      <MantineProvider theme={mantineTheme} {...mantineProps}>
        {children}
      </MantineProvider>
    )
  }
  return rtlRender(ui, { wrapper: Providers, ...rtlOptions })
}
