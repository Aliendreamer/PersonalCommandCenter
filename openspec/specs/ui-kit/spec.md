# ui-kit Specification

## Purpose
Mantine v9 as PersonalCommandCenter's web UI component library and design-system source of
truth: the SSR provider wiring, the shared theme, and the convention that UI is built from
Mantine components + theme rather than hand-rolled markup.
## Requirements
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

### Requirement: Collection tiles present as bordered uniform grids

A dashboard tile that shows a collection of items (e.g. uptime targets, tasks) SHALL present those
items as a uniform grid of equal cells rather than a loose vertical stack, and tiles/cards SHALL use a
stark, clearly-visible border so each card is delineated on the status board. Both the grid and the
border SHALL be derived from the shared Mantine theme (tokens/props), not per-component CSS classes.

#### Scenario: A collection tile renders a uniform grid

- **WHEN** a tile that shows a collection (e.g. the uptime tile) renders with several items
- **THEN** the items are laid out as a uniform grid of equal cells

#### Scenario: Tiles are clearly bordered

- **WHEN** the dashboard renders its tile grid
- **THEN** each tile/card shows a stark, visible border separating it from its neighbors, sourced from
  the shared theme

### Requirement: List pages fit the window with internal scroll

A plugin list page SHALL fit within the viewport rather than growing the page: the page wrapper SHALL
offer a `fill` mode that bounds the content to the available window height (below the app header) so
the page itself does not scroll, and the list content SHALL scroll within its own area. Server-side
rendering of the list content SHALL be preserved (the rows are present in the initial HTML).

#### Scenario: A long list scrolls inside the page, not the window

- **WHEN** a list page in `fill` mode renders more rows than fit the viewport
- **THEN** the page stays fixed to the window height and the list area scrolls internally

#### Scenario: The Notifications list is virtualized

- **WHEN** the Notifications list renders many rows
- **THEN** only the rows near the viewport are rendered (virtualized), and when no scroll height has
  been measured yet (server render / first paint) it renders all rows so the content is not blank

