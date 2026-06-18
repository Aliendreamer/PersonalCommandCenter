## Context

`apps/web` is a TanStack Start (React 19, SSR) shell. Its UI is Tailwind v4 utilities over a committed
"RAK" semantic-token theme: `styles.css` defines tokens under `:root`/`.dark` exposed to Tailwind via
`@theme inline`, a `@custom-variant dark` drives class-based dark mode, `lib/theme.ts` resolves a
`pcc_theme` cookie (`light`/`dark`/`system`) to a concrete theme, and `theme-toggle.tsx` toggles the
`.dark` class + cookie. SSR delivers the theme flash-free via a blocking inline `<head>` script.

We are adopting **Mantine v9** (current major; native CSS since v7) as the component library + theme. Mantine v9 ships **native CSS** (no
Emotion), so SSR needs no style-extraction plumbing — the one SSR concern is delivering the color scheme
before hydration to avoid a flash + hydration mismatch (a cookie-driven pre-paint `<head>` script, since
Mantine's stock `ColorSchemeScript` is localStorage-only).
Constraint: the browser only ever talks to `app.pcc.localhost` (SSR-BFF); this change is entirely the
browser tier — no .NET/core-api impact.

## Goals / Non-Goals

**Goals:**
- Mantine v9 SSR-wired into TanStack Start with flash-free, cookie-driven color scheme that preserves the
  existing `pcc_theme` Light/Dark/System behavior.
- A single Mantine theme object as PCC's design-system source of truth.
- A proven, repeatable migration pattern (pilot tile first) so components move one at a time with green
  gates at each step, and Mantine + Tailwind coexist safely during the transition.
- End state: Tailwind + RAK token CSS fully removed.

**Non-Goals:**
- Redesigning the visual language / brand in this change (migration is structural; a separate design pass
  can refine the theme later).
- Migrating every component in one PR — incremental is the point.
- Any backend, auth, or plugin-contract changes.

## Decisions

- **Mantine v9, native-CSS, all-in (not Mantine+Tailwind long-term).** v9's native CSS makes SSR clean;
  going all-in avoids maintaining two token systems. Tailwind stays only transiently (CSS `@layer` so
  Mantine's styles aren't overridden) and is removed once the last component migrates.
  *Alternatives:* keep Tailwind + RAK (rejected — the whole point is faster polished components); run both
  permanently (rejected — dual token systems to keep in sync).
- **Color scheme via a cookie manager, not localStorage.** Mantine defaults to `localStorage`, which the
  server can't read → wrong first paint under SSR. Use a cookie-backed `MantineColorSchemeManager` over the
  existing `pcc_theme` cookie so the server renders the right scheme and `ColorSchemeScript` sets it before
  paint. This keeps the `pcc_theme` name/semantics (`light`/`dark`/`system`, default `system`) — the
  `theming` spec's externally observable behavior is preserved; only the mechanism (`data-mantine-color-scheme`
  attribute instead of a `.dark` class) changes. *Alternative:* default localStorage manager (rejected — FOUC
  + hydration mismatch on SSR).
- **SSR wiring lives in `__root.tsx`.** `import '@mantine/core/styles.css'`, wrap the app body in
  `<MantineProvider theme={theme} colorSchemeManager={cookieManager} defaultColorScheme="auto">`. Mantine's
  stock `ColorSchemeScript` reads localStorage, not cookies, so the existing blocking inline head script is
  **kept and adapted** to set `data-mantine-color-scheme` (in addition to the `.dark` class during
  coexistence) from the `pcc_theme` cookie — preserving cookie-based, server-readable preference.
- **Pilot tile = `system-tile`.** Smallest self-contained presentational tile; converting it exercises the
  full path (provider, theme tokens, color scheme, a test) before committing to the bulk migration.
- **Incremental migration order:** pilot (`system-tile`) → simple tiles/lists → forms (adopt `@mantine/form`)
  → notification center (`@mantine/notifications`) → date-bearing UI (`@mantine/dates`) → remove Tailwind/RAK.
  Extra Mantine packages are added when the first consumer needs them, not upfront.
- **Theme object replaces the token CSS.** Map the current RAK tokens (background/foreground/card/muted/
  border/accent/warning/danger/success) onto Mantine theme primaryColor + a custom color/`other` entries so
  existing intent survives the move.

## Risks / Trade-offs

- **FOUC / hydration mismatch on color scheme** → use the cookie color-scheme manager + the cookie pre-paint
  script so server and client agree on first paint; cover with a test asserting cookie-driven initial scheme.
- **Tailwind/Mantine specificity clashes during coexistence** → wrap Mantine in a CSS `@layer` per Mantine
  v9 guidance; migrate visibly-styled components fully (no half-Tailwind/half-Mantine markup) to limit overlap.
- **Bundle size grows** (Mantine runtime + CSS) → acceptable for a personal dashboard; net simplification once
  Tailwind is removed.
- **Large surface (20+ components)** → incremental migration with gates green per step bounds risk; a stalled
  migration still leaves a working app (coexistence is safe).
- **Wrong/hallucinated Mantine API** → lean on Mantine's `llms.txt`/strong TS types; gates (typecheck) catch
  bad props immediately.

## Migration Plan

1. Add Mantine deps; wire `__root.tsx` (provider + `ColorSchemeScript` + `styles.css` import) behind the
   Tailwind layer (coexistence).
2. Rewrite `theme.ts` as the Mantine theme + cookie color-scheme manager; rebuild `theme-toggle.tsx` on
   `useMantineColorScheme`; update their tests (TDD).
3. Convert the pilot tile (`system-tile`); confirm SSR render + color scheme + gates green.
4. Migrate remaining components in order, adding `@mantine/form`/`@mantine/dates`/`@mantine/notifications`
   as their first consumer arrives; keep each component's test green.
5. Remove Tailwind + RAK token CSS and the old resolver; drop the deps; final gates green.

**Rollback:** Mantine coexists with Tailwind until step 5, so any pre-step-5 state is shippable; revert via
git if a step regresses. Step 5 (Tailwind removal) is the only irreversible-ish cut and lands last, after
everything else is green.

## Open Questions

- Exact mapping of `accent`/status tokens onto Mantine's color scales (resolve during theme authoring in
  step 2) — does PCC want a custom primary color or one of Mantine's defaults?
