## ADDED Requirements

### Requirement: Mantine as the component library

The FE SHALL use **Mantine v9** (current major; native CSS since v7) (`@mantine/core` + `@mantine/hooks`) as PersonalCommandCenter's UI
component library. New and migrated UI SHALL be built from Mantine components and the shared Mantine theme
rather than hand-rolled markup, and additional Mantine packages (`@mantine/form`, `@mantine/dates`,
`@mantine/notifications`) SHALL be added when the first component that needs them is migrated.

#### Scenario: A migrated component renders Mantine components

- **WHEN** a component that has been migrated (e.g. the pilot tile) is rendered
- **THEN** its output is composed of Mantine components styled by the shared theme, with no bespoke
  Tailwind utility classes remaining on that component

### Requirement: SSR provider wiring

The FE SHALL wire Mantine for SSR in the TanStack Start root document: `@mantine/core/styles.css` SHALL be
imported, a `MantineProvider` configured with the shared theme SHALL wrap the application, and the color
scheme SHALL be delivered before first paint (see the `theming` capability). Server-rendered output SHALL be
styled (Mantine CSS present) without any client-side style-extraction step.

#### Scenario: Server render is styled

- **WHEN** a page is server-rendered
- **THEN** Mantine's stylesheet is present in the response and components render with their themed styles
  (no flash of unstyled Mantine content on hydration)

#### Scenario: App is wrapped in the provider

- **WHEN** any route renders
- **THEN** its components are inside a single `MantineProvider` carrying the shared PCC theme

### Requirement: Shared theme as the design-system source of truth

The FE SHALL define one Mantine theme object (`createTheme`) that is PCC's design-system source of truth —
colors, spacing, radius, and fonts — and all components SHALL derive their styling from it (theme tokens /
props), not from a parallel token system. The theme SHALL preserve the prior design intent (the
background/foreground/card/muted/border/accent and status warning/danger/success roles).

#### Scenario: Theme drives component styling

- **WHEN** the theme's primary color or radius is changed
- **THEN** components reflect the change without per-component edits

### Requirement: Incremental migration with coexistence

The migration to Mantine SHALL proceed one component at a time, beginning with a pilot tile, with the
project's quality gates green at each step. Until the migration completes, Mantine and the legacy Tailwind
layer SHALL coexist safely (Mantine wrapped in a CSS `@layer` so its styles are not overridden). When the
last component is migrated, Tailwind and the RAK token CSS SHALL be removed.

#### Scenario: Pilot tile proves the pattern first

- **WHEN** the pilot tile (`system-tile`) is migrated
- **THEN** it renders correctly under SSR with the themed color scheme and its test passes, before any
  further components are migrated

#### Scenario: Coexistence keeps the app shippable mid-migration

- **WHEN** some components are migrated to Mantine and others still use Tailwind
- **THEN** the app builds and renders correctly, with Mantine components unaffected by Tailwind's utilities
