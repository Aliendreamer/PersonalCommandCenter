## 1. Theme-resolve util (TDD)

- [x] 1.1 (test-first) Add `apps/web/src/lib/theme.ts` — `type ThemePref = 'light'|'dark'|'system'`,
      `resolveTheme(pref, systemPrefersDark): 'light'|'dark'`, and a cookie name constant
      (`pcc_theme`) + parse helper. Unit-test all branches (explicit light/dark, system→dark, system→
      light, absent→system default).

## 2. ThemeToggle component (TDD)

- [x] 2.1 (test-first) `apps/web/src/components/theme-toggle.tsx` — a header control with Light/Dark/
      System. On select it writes the `pcc_theme` cookie (`document.cookie`) and flips the `<html>`
      `dark` class + `data-theme`. Component test (vitest + testing-library): renders the 3 options,
      selecting Dark sets the cookie + adds the class, selecting System removes the explicit class and
      stores `system`. Use Serena for the TS edits.

## 3. Token layer (styles.css)

- [x] 3.1 In `apps/web/src/styles.css` add the Tailwind v4 `dark` custom-variant and the semantic CSS
      variables for `:root` (light) and `.dark` (dark): `--background, --foreground, --card,
      --card-foreground, --muted, --muted-foreground, --border, --accent, --accent-foreground` + status
      `--warning, --danger, --success` (+ foregrounds as needed). Expose to Tailwind with
      `@theme inline { --color-background: var(--background); … }` so the semantic utilities exist.
      Light values match today's look; dark = a slate palette with legible status colors.

## 4. SSR delivery — no flash (`__root.tsx`)

- [x] 4.1 In `apps/web/src/routes/__root.tsx` read the `pcc_theme` cookie server-side (request header)
      and render the document element with the `dark` class for an explicit dark choice. Add a tiny
      inline `<head>` script that, for `system`/missing cookie, sets the `dark` class from
      `prefers-color-scheme` **before** the body paints. Cookie is app-scoped, `SameSite=Lax`, not
      HttpOnly.

## 5. Migrate components to tokens

- [x] 5.1 Replace hardcoded color utilities across the dashboard tiles, list components, plugin pages,
      and the shell/header with semantic tokens (`text-gray-* → text-muted-foreground`, page/card bg →
      `bg-background`/`bg-card`, `text-amber-700 → text-warning`, `text-red-700 → text-danger`,
      `text-green-700 → text-success`, borders → `border-border`, `bg-gray-900` → an accent/foreground
      token). Update existing component tests that assert color classes. Grep-sweep for residual
      `(bg|text|border)-(gray|amber|green|red|sky|slate)-\d+` and clear them.
- [x] 5.2 Mount `ThemeToggle` in the `_authenticated` header next to the Logout button.

## 6. Verify + done gate

- [x] 6.1 FE gates green: `nx run-many -t typecheck lint test build` (or `affected`) + prettier.
- [x] 6.2 Live E2E (Playwright): login → select Dark → `<html>` has `dark` → reload → still dark
      (cookie persisted) → select System (follows OS); browser only hits `app.`/`keycloak.`.
- [x] 6.3 Update `CLAUDE.md` (theming: semantic tokens + `pcc_theme` cookie + no-flash SSR script);
      mark complete; ready for `/opsx:archive`.
