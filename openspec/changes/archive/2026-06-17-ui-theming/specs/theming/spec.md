## ADDED Requirements

### Requirement: Light/dark theme via semantic tokens

The FE SHALL define a semantic design-token layer (background, foreground, card, muted, border, accent,
and status warning/danger/success) with light values under `:root` and dark values under `.dark`, wired
to Tailwind so component utilities resolve from the tokens. Toggling the `.dark` class on the document
element SHALL re-theme the entire UI without per-component changes.

#### Scenario: Dark class re-themes the app

- **WHEN** the document element has the `dark` class
- **THEN** components rendered with semantic utilities (e.g. `bg-background`, `text-muted-foreground`,
  `text-warning`) display their dark values; removing the class restores the light values

### Requirement: Theme preference resolution

The FE SHALL resolve the active theme from a `pcc_theme` preference of `light`, `dark`, or `system`
(default `system`): `light`/`dark` are used directly, and `system` resolves to dark when the OS prefers
a dark color scheme, otherwise light.

#### Scenario: Explicit preference wins

- **WHEN** the preference is `dark`
- **THEN** the resolved theme is dark regardless of the OS preference

#### Scenario: System follows the OS

- **WHEN** the preference is `system` (or absent) and the OS prefers dark
- **THEN** the resolved theme is dark; when the OS prefers light, the resolved theme is light

### Requirement: Flash-free SSR theme delivery

The theme SHALL be applied to the document element before first paint. A small blocking inline `<head>`
script SHALL read the `pcc_theme` cookie (or the OS `prefers-color-scheme` when `system`/absent), resolve
the theme, and set the `dark` class on the document element before the body renders — covering both the
SSR initial load and client navigation — so there is no flash of the wrong theme.

#### Scenario: Explicit dark applied before paint

- **WHEN** a document loads with `pcc_theme=dark`
- **THEN** the inline head script sets the `dark` class on the document element before the body paints

#### Scenario: System preference applied before paint

- **WHEN** there is no `pcc_theme` cookie and the OS prefers dark
- **THEN** the inline head script sets the `dark` class on the document element before the body paints

### Requirement: Theme toggle, persisted

The FE SHALL provide a theme toggle in the app header offering Light, Dark, and System. Selecting an
option SHALL persist the choice to the `pcc_theme` cookie and update the active theme immediately
without a page reload, and the choice SHALL survive reloads.

#### Scenario: Toggle to dark and persist

- **WHEN** the user selects Dark from the header toggle
- **THEN** the document element gains the `dark` class immediately and `pcc_theme=dark` is stored; after
  a reload the app is still dark

#### Scenario: Toggle to system

- **WHEN** the user selects System
- **THEN** the active theme follows the OS preference and `pcc_theme=system` is stored
