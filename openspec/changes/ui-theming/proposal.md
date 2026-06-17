## Why

The FE has a single hardcoded light look — every component bakes in colors (`text-gray-500`,
`text-amber-700`). Users want a dark theme. This adds a light/dark theme system (defaulting to the OS
preference) and, by moving to semantic design tokens, gives the app a real theming foundation — the
platform "themes" capability.

## What Changes

- **Semantic token layer** in `apps/web/src/styles.css`: a Tailwind v4 `dark` custom-variant plus
  semantic CSS variables (`--background, --foreground, --card, --muted(-foreground), --border, --accent`
  + status `--warning/--danger/--success`) defined for `:root` (light) and `.dark` (dark), exposed to
  Tailwind via `@theme inline` so utilities like `bg-background`/`text-muted-foreground`/`text-warning`
  exist. Light values match today's look; dark is a slate palette.
- **Cookie-driven SSR delivery (no flash)**: a `pcc_theme` cookie (`light|dark|system`, default
  `system`). `__root.tsx` reads it server-side and renders `<html class="dark">` when resolved dark; a
  tiny inline `<head>` script resolves `system`/first-visit via `prefers-color-scheme` before paint.
- **`ThemeToggle`** in the top header (next to Logout): 3-way Light/Dark/System; on change writes the
  cookie and flips the `<html>` class instantly (no reload).
- **Component migration**: swap hardcoded color utilities across the dashboard tiles, list components,
  plugin pages, and shell/header for the semantic tokens.

## Capabilities

### New Capabilities

- `theming`: a user-selectable light/dark theme (default = OS preference) for the FE — semantic design
  tokens driving every surface, cookie-persisted choice with flash-free SSR, and a header toggle.

### Modified Capabilities

<!-- None — additive FE capability; no existing spec's REQUIREMENTS change. -->

## Impact

- **Frontend (`apps/web`) only** — no core-api/.NET change. `styles.css` (token layer), `__root.tsx`
  (SSR cookie read + no-flash script), a new `ThemeToggle` component + a `theme` util, the
  `_authenticated` shell/header (mount the toggle), and the ~dozen color-using components migrated to
  tokens.
- **Cookie**: a new non-HttpOnly, app-scoped `pcc_theme` cookie (UI preference; client toggle reads/
  writes it). Independent of the `mp_sid` session cookie.
- **Tests**: unit tests for the theme-resolve util + `ThemeToggle`; existing component tests updated
  where they assert color classes; a live Playwright E2E (toggle dark → `<html>.dark` → reload persists
  → System).

## Non-Goals (v1)

No per-user server-side theme persistence in Postgres (cookie only). Only light + dark + system —
additional named palettes are a later easy add on the token layer. The Keycloak login page is not
themed. No high-contrast/accessibility-specific themes beyond standard dark. No per-plugin theming.
