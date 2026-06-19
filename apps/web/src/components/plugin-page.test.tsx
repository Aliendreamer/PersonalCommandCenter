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
})
