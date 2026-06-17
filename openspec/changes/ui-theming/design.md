## Context

`apps/web` is TanStack Start (React, SSR) styled with **Tailwind v4** (CSS-first: `@import 'tailwindcss'`
in `styles.css`, `@theme`; no JS config). Components currently hardcode color utilities
(`text-gray-500`, `text-amber-700`, `bg-gray-900`), so there is no theming seam. The app is the public
SSR-BFF tier — HTML is server-rendered, so the theme must be known server-side to avoid a flash of the
wrong theme on first paint. This change adds a light/dark theme (default = OS preference) on a semantic
token foundation.

## Goals / Non-Goals

**Goals:** light + dark + system theme; a header toggle; flash-free SSR; a semantic-token layer that
makes future themes cheap.

**Non-Goals:** Postgres per-user persistence (cookie only); palettes beyond light/dark/system; theming
the Keycloak login page; high-contrast/a11y-specific themes; per-plugin theming.

## Decisions

- **Semantic design tokens over `dark:` variants.** Define a small token set once
  (`--background, --foreground, --card(-foreground), --muted(-foreground), --border, --accent(-foreground)`
  + status `--warning/--danger/--success`) in `:root` (light) and `.dark` (dark) in `styles.css`, wired
  to Tailwind v4 via `@theme inline { --color-background: var(--background); … }` so `bg-background`,
  `text-muted-foreground`, `text-warning`, etc. are real utilities. Toggling a `.dark` class on `<html>`
  re-themes everything — no per-component dark classes. *(Alternative — `dark:` variants on every color
  in every component — rejected: verbose, easy to miss, doesn't scale past two themes.)*

- **Cookie + SSR, with an inline no-flash script.** Persist the choice in a `pcc_theme` cookie
  (`light|dark|system`, default `system`), app-scoped, `SameSite=Lax`, **not** HttpOnly (it's a
  non-sensitive UI preference the client toggle reads/writes). `__root.tsx` reads the cookie on the
  server (request header) and emits `<html class="dark">` for an explicit dark choice. For `system` or
  a missing cookie, a tiny **inline `<head>` script** reads `window.matchMedia('(prefers-color-scheme:
  dark)')` and sets the class **before first paint** — the only reliable way to honor the OS preference
  without a flash (the server can't read the OS preference). *(Alternative — localStorage + client-only
  apply — rejected: guarantees a flash under SSR.)*

- **Pure resolve util, testable in isolation.** `resolveTheme(cookieValue, systemPrefersDark)
  -> 'light' | 'dark'` (and a helper to map that to the `<html>` class) is a pure function unit-tested
  without a DOM; the toggle and SSR both call it. Keeps the branching logic out of the React/SSR glue.

- **Toggle is a thin client component.** `ThemeToggle` (3-way Light/Dark/System) lives in the
  `_authenticated` header next to Logout; on change it writes the cookie via `document.cookie` and flips
  the `<html>` class + `data-theme` immediately (no `router.invalidate()` — pure client class swap).

- **Migrate components to tokens as part of this change.** The ~dozen color-using components/pages move
  from hardcoded utilities to semantic ones; existing component tests that assert specific color classes
  are updated to the token classes. This is the bulk of the diff but mechanical.

## Risks / Trade-offs

- **Flash of wrong theme (FOUC)** → mitigated by the inline pre-paint script (system) + server-rendered
  class (explicit). The script is tiny and runs before the body renders.
- **Token migration misses a hardcoded color** → a stray `text-gray-500` simply won't theme; caught by
  a grep sweep for residual `(bg|text|border)-(gray|amber|green|red|sky|slate)-\d` after migration and
  by visual check in the E2E. Status colors (warning/danger/success) get explicit dark values so
  degraded/error/ok states stay legible in dark.
- **Non-HttpOnly cookie** → acceptable: it carries only a theme name, no security value; kept separate
  from `mp_sid`.
- **Dark palette taste** → values are tokens in one file, trivially tunable after first look; v1 ships a
  sensible slate dark.

## Migration Plan

Additive, FE-only. No data migration. Rollback = remove the toggle + revert tokens; components using
semantic utilities still render (tokens resolve to the light values under `:root`). Ship behind nothing
— it's on by default with `system`.

## Open Questions

- Exact dark palette hex values (settled during implementation against the running UI; tokens make this
  a one-file tweak). Whether the toggle is a cycle button vs a small segmented control — a presentational
  detail decided when building `ThemeToggle`.
