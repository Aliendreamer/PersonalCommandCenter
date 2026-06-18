## ADDED Requirements

### Requirement: Dashboard presents as an at-a-glance status board

The dashboard SHALL render as a status board: the existing vertical plugin nav and a symmetric
uniform card grid, with a hero strip above the grid. The card layout SHALL remain fixed (tiles are
not reordered by state). Each tile SHALL keep the same grid position regardless of its health.

#### Scenario: Hero strip renders above the grid

- **WHEN** the authenticated user loads the dashboard
- **THEN** a hero strip showing the current date/time and a greeting renders above the tile grid

#### Scenario: Layout is fixed

- **WHEN** one tile's data source is unhealthy and another's is healthy
- **THEN** every tile keeps its grid position (no reordering or promotion)

### Requirement: Each tile shows a derived health indicator

Each dashboard tile SHALL show a health indicator (`ok`, `degraded`, or `down`) derived
**client-side** from that tile's load result: a load error SHALL be `down`; a successfully loaded but
partial/empty-from-source result SHALL be `degraded`; an otherwise successful load SHALL be `ok`. The
indicator SHALL be presented consistently across tiles (a colored accent and a status dot). A valid
result that simply contains no activity (e.g. a zero-activity coding week) SHALL be `ok`, not
`degraded`.

#### Scenario: Healthy tile

- **WHEN** a tile's server function returns data without error
- **THEN** the tile shows the `ok` (green) indicator

#### Scenario: Source error tile

- **WHEN** a tile's server function returns an error (e.g. an upstream 502)
- **THEN** the tile shows the `down` (red) indicator

#### Scenario: Degraded tile

- **WHEN** a tile loads but its source is partial (e.g. some feeds failed)
- **THEN** the tile shows the `degraded` (amber) indicator

### Requirement: Hero shows an aggregate health count

The hero strip SHALL show an aggregate health readout — the number of tiles whose derived health is
`ok` out of the total number of tiles — computed from the same per-tile health values used for the
tile indicators (a single source of truth).

#### Scenario: All sources healthy

- **WHEN** every dashboard tile loads without error
- **THEN** the hero shows a count equal to total over total (e.g. "12/12")

#### Scenario: Count reflects an unhealthy source

- **WHEN** one tile's source errors while the rest are healthy
- **THEN** the hero count is reduced by one and matches the number of green tiles
