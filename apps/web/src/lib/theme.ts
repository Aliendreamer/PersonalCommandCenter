/** The user's theme preference; `system` follows the OS `prefers-color-scheme`. */
export type ThemePref = 'light' | 'dark' | 'system'

/** The concrete theme actually applied to the document. */
export type ResolvedTheme = 'light' | 'dark'

/** Non-HttpOnly, app-scoped cookie holding the preference (the client toggle reads/writes it). */
export const THEME_COOKIE = 'pcc_theme'

const PREFS: readonly ThemePref[] = ['light', 'dark', 'system']

function isThemePref(value: string | undefined): value is ThemePref {
  return value !== undefined && (PREFS as readonly string[]).includes(value)
}

/** Resolve the preference to a concrete theme; `system`/undefined defer to the OS preference. */
export function resolveTheme(
  pref: ThemePref | undefined,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') {
    return pref
  }
  return systemPrefersDark ? 'dark' : 'light'
}

/** The class to put on the document element for a resolved theme (`dark` is opt-in). */
export function themeClass(resolved: ResolvedTheme): string {
  return resolved === 'dark' ? 'dark' : ''
}

/** Read the `pcc_theme` preference from a Cookie header; defaults to `system`. */
export function parseThemeCookie(cookieHeader: string | undefined): ThemePref {
  if (!cookieHeader) {
    return 'system'
  }
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === THEME_COOKIE) {
      const value = rest.join('=')
      return isThemePref(value) ? value : 'system'
    }
  }
  return 'system'
}
