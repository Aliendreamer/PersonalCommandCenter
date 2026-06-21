## MODIFIED Requirements

### Requirement: Dashboard presents as an at-a-glance status board

The dashboard SHALL render as a status board: the existing vertical plugin nav and a symmetric
uniform card grid, with a hero strip above the grid. The card layout SHALL remain fixed (tiles are
not reordered by state). Each tile SHALL keep the same grid position regardless of its health. Each
tile SHALL act as a link to its plugin's page (its `routeBase`), so selecting a tile navigates there —
except a tile that owns its own interactive control (e.g. the search box), which keeps that control
instead of being a whole-card link.

#### Scenario: Hero strip renders above the grid

- **WHEN** the authenticated user loads the dashboard
- **THEN** a hero strip showing the current date/time and a greeting renders above the tile grid

#### Scenario: Layout is fixed

- **WHEN** one tile's data source is unhealthy and another's is healthy
- **THEN** every tile keeps its grid position (no reordering or promotion)

#### Scenario: A tile links to its plugin page

- **WHEN** the user selects a (non-interactive) dashboard tile
- **THEN** the app navigates to that plugin's `routeBase` page

#### Scenario: An interactive tile keeps its control

- **WHEN** the dashboard renders the search tile
- **THEN** the tile presents its search input/action rather than being a whole-card link
