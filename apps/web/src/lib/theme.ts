import { createTheme } from '@mantine/core'
import type {
  MantineColorScheme,
  MantineColorSchemeManager,
  MantineColorsTuple,
} from '@mantine/core'

/** The user's theme preference; `system` follows the OS `prefers-color-scheme`. */
export type ThemePref = 'light' | 'dark' | 'system'

/** Non-HttpOnly, app-scoped cookie holding the preference (the client toggle reads/writes it). */
export const THEME_COOKIE = 'pcc_theme'

const PREFS: readonly ThemePref[] = ['light', 'dark', 'system']

function isThemePref(value: string | undefined): value is ThemePref {
  return value !== undefined && (PREFS as readonly string[]).includes(value)
}

/**
 * Read the `pcc_theme` preference from a Cookie header; defaults to `dark` when the cookie is
 * absent or invalid — matching the documented "no cookie → dark" default used by
 * `initialColorScheme` and the blocking inline head script in `__root.tsx`.
 */
export function parseThemeCookie(cookieHeader: string | undefined): ThemePref {
  if (!cookieHeader) {
    return 'dark'
  }
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === THEME_COOKIE) {
      const value = rest.join('=')
      return isThemePref(value) ? value : 'dark'
    }
  }
  return 'dark'
}

// ── Mantine integration ───────────────────────────────────────────────────────

/** Sky accent (Tailwind `sky` scale, lightest→darkest) — preserves the prior RAK accent intent. */
const SKY: MantineColorsTuple = [
  '#f0f9ff',
  '#e0f2fe',
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8', // 400 — dark-mode accent
  '#0ea5e9',
  '#0284c7',
  '#0369a1', // 700 — light-mode accent
  '#075985',
  '#0c4a6e',
]

/** PCC's Mantine theme — the design-system source of truth (replaces the Tailwind RAK tokens). */
export const mantineTheme = createTheme({
  primaryColor: 'sky',
  // Match the RAK accent: sky-700 in light, sky-400 in dark.
  primaryShade: { light: 7, dark: 4 },
  colors: { sky: SKY },
})

/**
 * Resolve the SSR-initial Mantine color scheme from a Cookie header — the value `MantineProvider`'s
 * `defaultColorScheme` must use so the server render matches the client (no cookie → **dark**). Read
 * server-side so `colorScheme` (and the toggle's pressed state) is correct on first paint; without
 * this, SSR renders `dark` and the prod React build keeps that stale DOM on hydration mismatch.
 */
export function initialColorScheme(
  cookieHeader: string | undefined,
): MantineColorScheme {
  const pref = cookieHeader ? rawPref(cookieHeader) : undefined
  return pref ? prefToScheme(pref) : 'dark'
}

/** Find the raw `pcc_theme` value in a cookie string, or `undefined` when absent/invalid. */
function rawPref(cookie: string): ThemePref | undefined {
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === THEME_COOKIE) {
      const value = rest.join('=')
      return isThemePref(value) ? value : undefined
    }
  }
  return undefined
}

/** `pcc_theme` cookie (light/dark/system) ↔ Mantine color scheme (light/dark/auto). */
function prefToScheme(pref: ThemePref): MantineColorScheme {
  return pref === 'system' ? 'auto' : pref
}
function schemeToPref(scheme: MantineColorScheme): ThemePref {
  return scheme === 'auto' ? 'system' : scheme
}

/**
 * Cookie-backed Mantine color-scheme manager over the `pcc_theme` cookie. Mantine's stock
 * `ColorSchemeScript`/manager use localStorage; PCC uses a cookie so the preference is
 * server-readable and a single source drives both Mantine and (during migration) the Tailwind
 * `.dark` class. `document` is guarded so it is inert during SSR.
 */
export function pccColorSchemeManager(): MantineColorSchemeManager {
  let handler: ((event: StorageEvent) => void) | undefined

  return {
    get: (defaultValue) => {
      if (typeof document === 'undefined') {
        return defaultValue
      }
      const pref = rawPref(document.cookie)
      return pref ? prefToScheme(pref) : defaultValue
    },
    set: (value) => {
      if (typeof document === 'undefined') {
        return
      }
      // One year; app-scoped; Lax — a non-sensitive UI preference.
      document.cookie = `${THEME_COOKIE}=${schemeToPref(value)}; path=/; max-age=31536000; samesite=lax`
    },
    subscribe: (onUpdate) => {
      if (typeof window === 'undefined') {
        return
      }
      handler = (event) => {
        if (event.key === THEME_COOKIE && event.newValue) {
          onUpdate(prefToScheme(schemeFromValue(event.newValue)))
        }
      }
      window.addEventListener('storage', handler)
    },
    unsubscribe: () => {
      if (handler && typeof window !== 'undefined') {
        window.removeEventListener('storage', handler)
        handler = undefined
      }
    },
    clear: () => {
      if (typeof document === 'undefined') {
        return
      }
      document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`
    },
  }
}

/** Coerce an arbitrary stored string to a valid preference (defaults to `system`). */
function schemeFromValue(value: string): ThemePref {
  return isThemePref(value) ? value : 'system'
}
