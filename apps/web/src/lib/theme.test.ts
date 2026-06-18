import { afterEach, describe, expect, it } from 'vitest'
import {
  THEME_COOKIE,
  mantineTheme,
  parseThemeCookie,
  pccColorSchemeManager,
} from './theme'

describe('parseThemeCookie', () => {
  it('reads pcc_theme from a cookie header', () => {
    expect(parseThemeCookie('a=1; pcc_theme=dark; b=2')).toBe('dark')
    expect(parseThemeCookie('pcc_theme=light')).toBe('light')
    expect(parseThemeCookie('pcc_theme=system')).toBe('system')
  })

  it('defaults to system when missing or invalid', () => {
    expect(parseThemeCookie(undefined)).toBe('system')
    expect(parseThemeCookie('foo=bar')).toBe('system')
    expect(parseThemeCookie('pcc_theme=neon')).toBe('system')
  })

  it('exposes the cookie name', () => {
    expect(THEME_COOKIE).toBe('pcc_theme')
  })
})

describe('pccColorSchemeManager', () => {
  afterEach(() => {
    // Clear the pcc_theme cookie between cases (jsdom persists document.cookie).
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`
  })

  it('returns the default when no cookie is set', () => {
    const mgr = pccColorSchemeManager()
    expect(mgr.get('auto')).toBe('auto')
    expect(mgr.get('light')).toBe('light')
  })

  it('maps the pcc_theme cookie to a Mantine color scheme (system -> auto)', () => {
    const mgr = pccColorSchemeManager()
    document.cookie = `${THEME_COOKIE}=dark; path=/`
    expect(mgr.get('auto')).toBe('dark')
    document.cookie = `${THEME_COOKIE}=light; path=/`
    expect(mgr.get('auto')).toBe('light')
    document.cookie = `${THEME_COOKIE}=system; path=/`
    expect(mgr.get('light')).toBe('auto')
  })

  it('falls back to the default for an invalid cookie value', () => {
    const mgr = pccColorSchemeManager()
    document.cookie = `${THEME_COOKIE}=neon; path=/`
    expect(mgr.get('auto')).toBe('auto')
  })

  it('persists set() to the pcc_theme cookie (auto -> system)', () => {
    const mgr = pccColorSchemeManager()
    mgr.set('dark')
    expect(parseThemeCookie(document.cookie)).toBe('dark')
    mgr.set('auto')
    expect(parseThemeCookie(document.cookie)).toBe('system')
  })

  it('clears the cookie', () => {
    const mgr = pccColorSchemeManager()
    mgr.set('dark')
    mgr.clear()
    expect(parseThemeCookie(document.cookie)).toBe('system')
  })
})

describe('mantineTheme', () => {
  it('uses the sky accent as the primary color', () => {
    expect(mantineTheme.primaryColor).toBe('sky')
    expect(mantineTheme.colors?.sky).toHaveLength(10)
  })
})
