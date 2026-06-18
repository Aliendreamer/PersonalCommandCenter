## Why

PCC's UI is form- and widget-heavy (calendar/task forms, notification center, many tiles and lists),
but its current UI layer is hand-rolled Tailwind v4 utilities over a custom "RAK" semantic-token theme —
every input, modal, table, and date picker is bespoke. **Mantine v9** (current major; native CSS since v7) supplies these as polished,
accessible, batteries-included components with a real theme object, and — the deciding factor for a
solo project — first-class **LLM support** (`llms.txt`/`llms-full.txt`, strong TS types) so both the
claude.ai/design agent and Claude Code generate accurate, on-brand UI. Adopting it now, while the
theming layer is still young, makes "nice things" faster and keeps design + implementation speaking one
vocabulary.

## What Changes

- Add Mantine v9 (`@mantine/core`, `@mantine/hooks`) to `apps/web` and SSR-wire it in TanStack Start:
  `import '@mantine/core/styles.css'`, `<MantineProvider>` wrapping the app, and a cookie-driven pre-paint
  `<head>` script setting `data-mantine-color-scheme` (Mantine's stock `ColorSchemeScript` is
  localStorage-only, so PCC keeps a cookie script).
- Introduce a **Mantine theme** (`theme.ts` rewritten as a `createTheme` object) as PCC's design-system
  token source — colors, spacing, radius, fonts — replacing the Tailwind `@theme inline` token bridge.
- Replace the bespoke `.dark`-class color-scheme mechanism with Mantine's color-scheme system
  (`data-mantine-color-scheme`), driven by a **cookie color-scheme manager** that preserves the existing
  `pcc_theme` cookie + Light/Dark/System behavior and flash-free SSR first paint.
- Rebuild the header theme toggle on `useMantineColorScheme` (replacing `theme-toggle.tsx`'s manual
  cookie/class logic).
- Migrate components to Mantine **incrementally**, one at a time, starting with a **pilot tile**
  (`system-tile`) to prove the SSR + theme pattern end-to-end; Mantine and Tailwind coexist via CSS
  `@layer` during the transition.
- **BREAKING (internal):** once all components are migrated, **remove Tailwind v4** and the RAK token CSS
  (`styles.css` token layer, `@custom-variant dark`, `@theme inline`) and the `lib/theme.ts` resolver,
  retiring the `.dark`-class theming model.

## Capabilities

### New Capabilities
- `ui-kit`: Mantine as PCC's component library and its SSR integration with TanStack Start — provider
  wiring, the shared Mantine theme as the design-system source of truth, the documented usage convention
  for new components, and the incremental migration contract (pilot tile, Tailwind coexistence, retirement).

### Modified Capabilities
- `theming`: the light/dark capability is re-expressed in Mantine terms — color scheme via
  `MantineProvider`/`data-mantine-color-scheme` instead of a `.dark` class on semantic Tailwind tokens;
  preference still resolves from the `pcc_theme` cookie (Light/Dark/System) with flash-free SSR delivery
  via `ColorSchemeScript`; the toggle is rebuilt on `useMantineColorScheme`.

## Impact

- **Dependencies:** add `@mantine/core`, `@mantine/hooks` (and later `@mantine/form`, `@mantine/dates`,
  `@mantine/notifications` as components migrate); eventually remove `tailwindcss`, `@tailwindcss/vite`,
  `@tailwindcss/typography`.
- **Code:** `apps/web/src/routes/__root.tsx` (provider + head wiring), `apps/web/src/lib/theme.ts`
  (rewritten as Mantine theme + cookie manager), `apps/web/src/components/theme-toggle.tsx`, `styles.css`
  (token layer removed at the end), and every component under `apps/web/src/components/` migrated in turn.
- **Tests:** `theme.ts`/`theme-toggle` unit tests rewritten for the Mantine color-scheme path; each
  migrated component keeps/updates its vitest test; SSR flash-free + cookie behavior covered.
- **No backend/.NET impact** — this is entirely `apps/web` (SSR-BFF browser tier).
