## ADDED Requirements

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
