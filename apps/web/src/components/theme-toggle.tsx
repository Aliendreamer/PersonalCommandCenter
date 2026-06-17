import { useEffect, useState } from 'react'

import { THEME_COOKIE, resolveTheme, themeClass } from '../lib/theme'
import type { ThemePref } from '../lib/theme'

const OPTIONS: ReadonlyArray<{
  pref: ThemePref
  label: string
  glyph: string
}> = [
  { pref: 'light', label: 'Light', glyph: '☀' },
  { pref: 'dark', label: 'Dark', glyph: '☾' },
  { pref: 'system', label: 'System', glyph: '◑' },
]

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function readPref(): ThemePref {
  if (typeof document === 'undefined') {
    return 'system'
  }
  const match = document.cookie
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${THEME_COOKIE}=`))
  const value = match?.slice(THEME_COOKIE.length + 1)
  return value === 'light' || value === 'dark' ? value : 'system'
}

/** Persist the preference and apply it to the document immediately (no reload). */
function applyPref(pref: ThemePref): void {
  // One year; app-scoped; Lax — a non-sensitive UI preference, readable by this client toggle.
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`
  const resolved = resolveTheme(pref, systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle('dark', themeClass(resolved) === 'dark')
  root.dataset.theme = resolved
}

/** Header control: choose Light / Dark / System; persists to the `pcc_theme` cookie. */
export function ThemeToggle() {
  // Start at `system` so SSR and the first client render match (no hydration mismatch); the real
  // preference (and the active highlight) is read from the cookie after mount. The actual theme is
  // already correct — the pre-paint head script applied it from the cookie.
  const [pref, setPref] = useState<ThemePref>('system')

  useEffect(() => {
    setPref(readPref())
  }, [])

  const choose = (next: ThemePref) => {
    setPref(next)
    applyPref(next)
  }

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.pref}
          type="button"
          aria-label={option.label}
          aria-pressed={pref === option.pref}
          title={`${option.label} theme`}
          onClick={() => choose(option.pref)}
          className={
            pref === option.pref
              ? 'rounded px-1.5 py-0.5 text-foreground'
              : 'rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground'
          }
        >
          {option.glyph}
        </button>
      ))}
    </div>
  )
}
