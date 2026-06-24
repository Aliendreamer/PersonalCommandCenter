import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'

import { render } from '../test/render'
import type { CatalogueEntry } from '@pcc/contracts'
import { ModelsCookbook } from './models-cookbook'

vi.mock('../lib/server/api', () => ({
  compareModels: vi.fn(),
  pullModel: vi.fn(),
  deleteModel: vi.fn(),
}))

afterEach(cleanup)

const makeEntry = (
  overrides: Partial<CatalogueEntry> = {},
): CatalogueEntry => ({
  name: 'llama3:8b',
  description: 'A capable open model',
  parameterSize: '8B',
  quantization: 'Q4_0',
  sizeGb: 4.7,
  family: 'llama',
  tags: ['chat', 'code'],
  fits: 'yes',
  ...overrides,
})

const ENTRIES: CatalogueEntry[] = [
  makeEntry({ name: 'llama3:8b', family: 'llama' }),
  makeEntry({
    name: 'mistral:7b',
    description: 'Fast and efficient',
    parameterSize: '7B',
    family: 'mistral',
    tags: ['chat'],
    fits: 'marginal',
  }),
]

describe('ModelsCookbook', () => {
  it('renders_model_cards', () => {
    render(
      <ModelsCookbook
        entries={ENTRIES}
        installedNames={[]}
        onRefresh={() => {}}
      />,
    )

    expect(screen.getByText('llama3:8b')).toBeDefined()
    expect(screen.getByText('mistral:7b')).toBeDefined()
  })

  it('pull_button_shown_for_uninstalled', () => {
    render(
      <ModelsCookbook
        entries={[makeEntry({ name: 'llama3:8b' })]}
        installedNames={[]}
        onRefresh={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /pull/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('delete_button_shown_for_installed', () => {
    render(
      <ModelsCookbook
        entries={[makeEntry({ name: 'llama3:8b' })]}
        installedNames={['llama3:8b']}
        onRefresh={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /delete/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /pull/i })).toBeNull()
  })

  it('search_filters_cards', () => {
    render(
      <ModelsCookbook
        entries={ENTRIES}
        installedNames={[]}
        onRefresh={() => {}}
      />,
    )

    // Both cards visible initially
    expect(screen.getByText('llama3:8b')).toBeDefined()
    expect(screen.getByText('mistral:7b')).toBeDefined()

    // Type in the search box — filter to only llama
    const searchInput = screen.getByRole('textbox', { name: /search models/i })
    fireEvent.change(searchInput, { target: { value: 'llama' } })

    expect(screen.getByText('llama3:8b')).toBeDefined()
    expect(screen.queryByText('mistral:7b')).toBeNull()
  })
})
