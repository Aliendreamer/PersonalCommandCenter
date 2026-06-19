import { vi } from 'vitest'

// jsdom lacks these browser APIs that Mantine relies on. Polyfill them globally so component
// tests can render inside MantineProvider. Individual tests may still override matchMedia to
// simulate OS color-scheme preferences. Guarded so node-environment tests (server fns) are unaffected.
if (typeof window !== 'undefined') {
  const { getComputedStyle } = window
  window.getComputedStyle = (elt) => getComputedStyle(elt)

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  window.HTMLElement.prototype.scrollIntoView = vi.fn()

  // Mantine's FloatingIndicator (used by SegmentedControl) needs ResizeObserver.
  if (typeof window.ResizeObserver !== 'function') {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
}
