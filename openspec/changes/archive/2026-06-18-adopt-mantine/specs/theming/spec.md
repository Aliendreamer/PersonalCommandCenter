## MODIFIED Requirements

### Requirement: Theme preference resolution

The FE SHALL resolve the active color scheme from a `pcc_theme` preference of `light`, `dark`, or
`system` — **defaulting to `dark`** when no preference is set. `light`/`dark` are used directly; `system`
resolves to dark when the OS prefers a dark color scheme, otherwise light; and an absent/invalid
preference resolves to `dark` (not the OS preference).

#### Scenario: Explicit preference wins

- **WHEN** the preference is `light`
- **THEN** the resolved color scheme is light regardless of the OS preference

#### Scenario: Default is dark when no preference is set

- **WHEN** there is no `pcc_theme` cookie
- **THEN** the resolved color scheme is dark, regardless of the OS preference

#### Scenario: System follows the OS

- **WHEN** the preference is explicitly `system` and the OS prefers light
- **THEN** the resolved color scheme is light

### Requirement: Flash-free SSR theme delivery

The theme SHALL be applied to the document element before first paint via a blocking inline `<head>`
script (Mantine's stock `ColorSchemeScript` reads localStorage, not cookies, so PCC keeps a cookie-driven
script). It SHALL read the resolved color scheme — from the `pcc_theme` cookie, or the OS
`prefers-color-scheme` when `system`/absent — and set the `data-mantine-color-scheme` attribute on the
document element before the body renders, covering both the SSR initial load and client navigation, so
there is no flash of the wrong theme and no hydration mismatch. The Mantine color scheme SHALL be driven
by a cookie-backed `MantineColorSchemeManager` over the same `pcc_theme` cookie (mapping `system` ↔ Mantine
`auto`).

#### Scenario: Explicit dark applied before paint

- **WHEN** a document loads with `pcc_theme=dark`
- **THEN** the pre-paint script sets `data-mantine-color-scheme="dark"` on the document element before the
  body paints

#### Scenario: System preference applied before paint

- **WHEN** `pcc_theme=system` and the OS prefers dark
- **THEN** the pre-paint script sets `data-mantine-color-scheme="dark"` on the document element before the
  body paints

#### Scenario: Dark default applied before paint

- **WHEN** there is no `pcc_theme` cookie
- **THEN** the pre-paint script sets `data-mantine-color-scheme="dark"` on the document element before the
  body paints

### Requirement: Theme toggle, persisted

The FE SHALL provide a theme toggle in the app header offering Light, Dark, and System, built on Mantine's
`useMantineColorScheme`. Selecting an option SHALL update Mantine's color scheme immediately without a page
reload and persist the choice to the `pcc_theme` cookie (via the cookie color-scheme manager), and the
choice SHALL survive reloads.

#### Scenario: Toggle to dark and persist

- **WHEN** the user selects Dark from the header toggle
- **THEN** the document's `data-mantine-color-scheme` becomes `dark` immediately and `pcc_theme=dark` is
  stored; after a reload the app is still dark

#### Scenario: Toggle to system

- **WHEN** the user selects System
- **THEN** the active color scheme follows the OS preference and `pcc_theme=system` is stored

## REMOVED Requirements

### Requirement: Light/dark theme via semantic tokens

**Reason**: The Tailwind semantic-token mechanism (`:root`/`.dark` CSS variables exposed via `@theme inline`
and toggled by a `.dark` class) is retired in favor of Mantine's theme object and color-scheme system. The
light/dark re-theming behavior is preserved but now provided by `MantineProvider` + the shared Mantine theme
(see the `ui-kit` capability) and the `data-mantine-color-scheme` attribute instead of the `.dark` class.

**Migration**: Components style via Mantine theme tokens/props; the document color scheme is set by
`MantineProvider`/`ColorSchemeScript` (`data-mantine-color-scheme`) rather than the `.dark` class. The
`pcc_theme` cookie and Light/Dark/System preference are unchanged.
