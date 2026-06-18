## 1. Install & SSR wiring

- [x] 1.1 Add `@mantine/core` and `@mantine/hooks` to `apps/web` (exact-pinned `9.3.2`, matching repo convention)
- [x] 1.2 Import Mantine styles **unlayered** in `styles.css` so they win over Tailwind's layered base (coexistence)
- [x] 1.3 Import `@mantine/core/styles.css`; adapt the cookie pre-paint `<head>` script to set `data-mantine-color-scheme` (stock `ColorSchemeScript` is localStorage-only)
- [x] 1.4 Wrap the app body in `<MantineProvider>` (theme + cookie color-scheme manager, `defaultColorScheme="auto"`) in `__root.tsx`
- [x] 1.5 Verify gates green (typecheck · lint · test · build · prettier) with the app still rendering

## 2. Theme & color-scheme (TDD)

- [x] 2.1 Write failing tests for the cookie color-scheme manager (reads/writes `pcc_theme`, system↔auto)
- [x] 2.2 Add the Mantine theme object (`createTheme`, sky accent) + cookie color-scheme manager to `lib/theme.ts`
      (old resolver kept for coexistence, removed in task 5)
- [x] 2.3 Write failing test for `theme-toggle` on `useMantineColorScheme` (toggle updates scheme + persists cookie)
- [x] 2.4 Rebuild `theme-toggle.tsx` on `useMantineColorScheme`/`useComputedColorScheme` (ActionIcon); make tests pass
- [x] 2.5 Flash-free SSR delivery via the cookie pre-paint script (sets `data-mantine-color-scheme` before paint)
- [x] 2.6 Gates green

## 3. Pilot migration

- [x] 3.1 Update `system-tile.test.tsx` to assert Mantine-rendered output + add the jsdom MantineProvider setup (red)
- [x] 3.2 Convert `system-tile.tsx` to Mantine components (Stack/Group/Text); test green
- [x] 3.3 Verified live: full Playwright E2E suite (12/12) renders every page through the SSR-BFF in Mantine, dark default + toggle persistence confirmed

## 4. Incremental component migration

- [x] 4.1 Migrated the remaining dashboard tiles (iot-summary, weather-today, rss-latest, goodreads-reading,
      tasks-open, notifications-unread, uptime-status, models-status, search-box, calendar-today)
- [x] 4.2 Migrated the list components (book-list, calendar-event-list, iot-device-list, notification-list,
      rss-item-list, search-result-list, task-list, uptime-list, models-view) — `safeHref`+`rel` preserved
- [x] 4.3 Migrate the forms with `@mantine/form` (calendar-event-form, task-form); added `@mantine/form@9.3.2`
- [x] 4.4 Notification center migrated as a Mantine list (notification-list); no toast consumer →
      `@mantine/notifications` not added
- [x] 4.5 Date/time fields: kept native `type="datetime-local"`/`type="date"` on Mantine `TextInput` —
      `@mantine/dates` (calendar popover) not adopted; it would change the value contract (Date vs ISO
      string) the callers/tests rely on for no UX gain here
- [x] 4.6 Migrated `plugin-shell.tsx` and all `_authenticated*` route pages to Mantine layout primitives
- [x] 4.7 Kept each migrated component's vitest test green (added shared `test/render.tsx` + jsdom setup)

## 5. Retire Tailwind / RAK

- [x] 5.1 Confirmed no `className=` remains anywhere in `apps/web/src`
- [x] 5.2 Reduced `styles.css` to the Mantine import + a minimal `min-height` (removed RAK tokens,
      `@custom-variant dark`, `@theme inline`, base border layer)
- [x] 5.3 Removed `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/typography` and the Vite plugin wiring
- [x] 5.4 Removed dead theme code (`resolveTheme`, `themeClass`, `ResolvedTheme`) + their tests
- [x] 5.5 Final gates green (typecheck · lint · test · build · prettier)

## 6. Close out

- [x] 6.1 Updated CLAUDE.md gotchas/stack notes for Mantine (SSR wiring, cookie color scheme, theme source)
- [x] 6.2 Validated `--strict`; live-verified via full E2E (12/12); committed; archived

## 7. Live-verification fixes (found by E2E)

- [x] 7.1 SSR color-scheme hydration: read `pcc_theme` server-side (`initialColorScheme` + root
      `createServerFn`/`getRequestHeader`) → feed `MantineProvider` `defaultColorScheme` so SSR matches
      the client (toggle pressed-state no longer hydrates stale)
- [x] 7.2 Restored `<ul>/<li>` semantics across all list components (Mantine `component` prop) — the
      Stack/Group migration had dropped list markup, breaking `locator('li')` E2E + list a11y
- [x] 7.3 Updated `theme.spec.ts` for the dark default (light persists over dark) with hydration-safe
      idempotent retries
