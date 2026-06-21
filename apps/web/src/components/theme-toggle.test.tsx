import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '../test/render'
import { ThemeToggle } from './theme-toggle'
import { pccColorSchemeManager } from '../lib/theme'

function setSystemPrefersDark(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function renderToggle() {
  return render(<ThemeToggle />, {
    mantineProps: {
      colorSchemeManager: pccColorSchemeManager(),
      defaultColorScheme: 'auto',
    },
  })
}

beforeEach(() => {
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-mantine-color-scheme')
  document.cookie = 'pcc_theme=; path=/; max-age=0'
  setSystemPrefersDark(false)
})
afterEach(cleanup)

describe('ThemeToggle', () => {
  it('offers light, dark, and system', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: /light/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /dark/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /system/i })).toBeDefined()
  })

  it('selecting Dark stores the cookie and adds the dark class', () => {
    renderToggle()
    fireEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(document.cookie).toContain('pcc_theme=dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('selecting Light stores the cookie and removes the dark class', () => {
    document.documentElement.classList.add('dark')
    renderToggle()
    fireEvent.click(screen.getByRole('button', { name: /light/i }))
    expect(document.cookie).toContain('pcc_theme=light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('selecting System stores system and follows the OS preference', () => {
    setSystemPrefersDark(true)
    renderToggle()
    fireEvent.click(screen.getByRole('button', { name: /system/i }))
    expect(document.cookie).toContain('pcc_theme=system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
