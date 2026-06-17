import { describe, expect, it } from 'vitest'
import {
  THEME_COOKIE,
  parseThemeCookie,
  resolveTheme,
  themeClass,
} from './theme'

describe('resolveTheme', () => {
  it('uses an explicit light/dark choice regardless of the OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the OS preference for system/undefined', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme(undefined, true)).toBe('dark')
    expect(resolveTheme(undefined, false)).toBe('light')
  })
})

describe('themeClass', () => {
  it('maps the resolved theme to the html class', () => {
    expect(themeClass('dark')).toBe('dark')
    expect(themeClass('light')).toBe('')
  })
})

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
