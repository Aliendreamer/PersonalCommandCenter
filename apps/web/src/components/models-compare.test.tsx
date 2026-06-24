import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'

import { render } from '../test/render'
import { ModelsCompare } from './models-compare'

// The component calls compareModels (a server fn) — mock the whole module so tests stay pure
vi.mock('../lib/server/api', () => ({
  compareModels: vi.fn(),
  pullModel: vi.fn(),
  deleteModel: vi.fn(),
}))

afterEach(cleanup)

const MODELS = ['llama3:8b', 'mistral:7b', 'phi3:mini']

describe('ModelsCompare', () => {
  it('renders_prompt_input_and_run_button', () => {
    render(<ModelsCompare installedModels={MODELS} />)

    expect(screen.getByRole('textbox', { name: /prompt/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /run/i })).toBeDefined()
  })

  it('run_button_disabled_without_selection', () => {
    render(<ModelsCompare installedModels={MODELS} />)

    const runButton = screen.getByRole('button', { name: /run/i })
    // No model selected and no prompt → button should be disabled
    expect((runButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows_empty_state_when_no_models_installed', () => {
    render(<ModelsCompare installedModels={[]} />)

    expect(screen.getByText(/no models installed/i)).toBeDefined()
    // No run button should be rendered
    expect(screen.queryByRole('button', { name: /run/i })).toBeNull()
  })
})
