# web-shell Specification

## Purpose

The TanStack Start shell that discovers enabled plugins from the manifest and renders their
nav entries, dashboard tiles, and lazy-loaded routes, degrading gracefully when the manifest
is unavailable.
## Requirements
### Requirement: Shell renders enabled plugins from the manifest

The web shell SHALL fetch the plugin manifest **server-side** via a server function that calls the
API over the internal network (forwarding the session cookie) and render a nav entry and dashboard
tile for each enabled plugin; the browser SHALL NOT call the API directly. The initial HTML SHALL be
server-rendered with the manifest already present.

#### Scenario: Enabled plugin appears in the UI

- **WHEN** the user is authenticated and the manifest contains the `system` plugin
- **THEN** the server-rendered shell shows a "System" nav entry and a System dashboard tile

#### Scenario: Disabled plugin is absent from the UI

- **WHEN** the manifest does not contain the `system` plugin
- **THEN** the shell shows no System nav entry and no System tile

### Requirement: Lazy-loaded plugin routes

The web shell SHALL lazy-load each enabled plugin's UI routes from its matching `*.ui`
library, loading a plugin's UI code only when its route is navigated to.

#### Scenario: Plugin route loads on navigation

- **WHEN** the user navigates to an enabled plugin's route base
- **THEN** the shell loads that plugin's UI and renders its page

### Requirement: Graceful degradation

The web shell SHALL tolerate an unreachable or partial manifest by rendering an empty dashboard with
a non-blocking error indicator rather than failing to load.

#### Scenario: Manifest fetch fails

- **WHEN** the server function that fetches the manifest fails
- **THEN** the shell still loads, shows an empty dashboard, and surfaces a non-blocking error

### Requirement: Whole shell behind login

The web shell SHALL gate the entire app server-side: an `_authenticated` layout route's `beforeLoad`
SHALL resolve the current identity via a server function and, when unauthenticated, redirect the
browser to the login proxy (`/api/auth/login?returnTo=<path>`); the identity SHALL be available via
router context. There SHALL be no client-side `/me` probe.

#### Scenario: Unauthenticated visitor is sent to login

- **WHEN** an unauthenticated browser loads any app route
- **THEN** `beforeLoad` redirects to `/api/auth/login` preserving the requested path as `returnTo`

#### Scenario: Authenticated visitor sees the dashboard

- **WHEN** the identity resolves during `beforeLoad`
- **THEN** the dashboard renders server-side with the plugin manifest and identity present

### Requirement: Identity and logout affordance

The web shell SHALL surface the authenticated user's identity (name/email) and roles, and a
logout action that navigates to `api/auth/logout`.

#### Scenario: Nav shows identity and logout

- **WHEN** the user is authenticated
- **THEN** the shell shows the user's name/email and roles and a Logout control that navigates to
  `api/auth/logout`

### Requirement: Pages render with data server-side

Plugin tiles and pages SHALL receive their data from route loaders (fetched server-side via server
functions), not from client-side fetches to the API; the initial server-rendered HTML SHALL include
the data.

#### Scenario: Devices page is server-rendered with entities

- **WHEN** an authenticated user navigates to `/devices`
- **THEN** the server-rendered HTML already contains the device list, with no client-side "Loading…"
  fetch to the API

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

### Requirement: Persistent app shell on every authenticated page

The authenticated app SHALL render a persistent header and sidebar navigation on every page (not only
the dashboard). The header SHALL carry the account identity, theme toggle, and logout; the sidebar
SHALL list the enabled plugins. On small screens the sidebar SHALL collapse behind a toggle.

#### Scenario: Nav is present on a plugin page

- **WHEN** an authenticated user navigates to a plugin page (e.g. `/coding`)
- **THEN** the sidebar nav and the header are visible, the same as on the dashboard

#### Scenario: Nav lists enabled plugins everywhere

- **WHEN** any authenticated page is loaded
- **THEN** the sidebar shows a nav entry for each enabled plugin from the manifest

### Requirement: Active route is highlighted in the nav

The sidebar SHALL indicate the currently active route by highlighting its nav entry.

#### Scenario: Current page is marked active

- **WHEN** the user is on `/coding`
- **THEN** the "Coding" nav entry is shown in an active state and the others are not

### Requirement: Plugin pages render in a constrained, styled wrapper

Each plugin page SHALL render its content inside a shared wrapper that constrains the content width and
shows the page title, so content does not stretch the full viewport. Data-heavy pages SHALL present
their sections as cards.

#### Scenario: Plugin page content is width-constrained

- **WHEN** a plugin page renders on a wide viewport
- **THEN** its content is constrained to a readable column rather than spanning the full width

#### Scenario: Breakdown sections render as cards

- **WHEN** the coding or models page renders its breakdowns
- **THEN** each section is shown as a bordered card with aligned label·value rows

