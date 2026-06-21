import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '../test/render'
import { PluginPage } from './plugin-page'

afterEach(cleanup)

describe('PluginPage', () => {
  it('renders the title and children', () => {
    render(
      <PluginPage title="Coding">
        <div data-testid="body">content</div>
      </PluginPage>,
    )

    expect(
      screen.getByRole('heading', { name: 'Coding', level: 1 }),
    ).toBeDefined()
    expect(screen.getByTestId('body')).toBeDefined()
  })

  it('renders the title and children in fill mode (window-fitting)', () => {
    render(
      <PluginPage title="Notifications" fill>
        <div data-testid="body">content</div>
      </PluginPage>,
    )

    expect(
      screen.getByRole('heading', { name: 'Notifications', level: 1 }),
    ).toBeDefined()
    expect(screen.getByTestId('body')).toBeDefined()
  })

  it('renders children without the internal scroll wrapper when scroll is false', () => {
    render(
      <PluginPage title="Notifications" fill scroll={false}>
        <div data-testid="body">content</div>
      </PluginPage>,
    )

    expect(screen.getByTestId('body')).toBeDefined()
  })
})
