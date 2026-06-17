import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeToggle } from './theme-toggle'

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

beforeEach(() => {
  document.documentElement.className = ''
  document.cookie = 'pcc_theme=; path=/; max-age=0'
  setSystemPrefersDark(false)
})
afterEach(cleanup)

describe('ThemeToggle', () => {
  it('offers light, dark, and system', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /light/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /dark/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /system/i })).toBeDefined()
  })

  it('selecting Dark stores the cookie and adds the dark class', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.cookie).toContain('pcc_theme=dark')
  })

  it('selecting Light stores the cookie and removes the dark class', () => {
    document.documentElement.classList.add('dark')
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /light/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.cookie).toContain('pcc_theme=light')
  })

  it('selecting System stores system and follows the OS preference', () => {
    setSystemPrefersDark(true)
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /system/i }))
    expect(document.cookie).toContain('pcc_theme=system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
