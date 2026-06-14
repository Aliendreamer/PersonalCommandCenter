# search Specification

## Purpose
TBD - created by archiving change search-plugin. Update Purpose after archive.
## Requirements
### Requirement: Metasearch query

The `search` plugin SHALL accept `GET /api/search?q=<query>`, query the configured SearXNG instance
for that query, and return the top results mapped to `{ title, url, content?, engine? }`.

#### Scenario: Returns mapped results

- **WHEN** a client requests `GET /api/search?q=tanstack` and SearXNG returns results
- **THEN** the response is a list of `{ title, url, content?, engine? }` entries

#### Scenario: Sends the query as a JSON-format request

- **WHEN** the plugin queries SearXNG
- **THEN** the request targets `{BaseUrl}/search` with the query `q` and `format=json`

#### Scenario: Blank query is rejected

- **WHEN** a client requests `GET /api/search?q=` (empty/whitespace)
- **THEN** the response is `400` and SearXNG is not queried

### Requirement: Config-driven activation

The `search` plugin SHALL activate only when `Plugins:Search:Enabled` is `true`, and SHALL appear in
`/api/plugins` with a "Search" nav entry and `search-box` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Search:Enabled = false`
- **THEN** `GET /api/search` is not served and `search` is absent from `/api/plugins`

### Requirement: Graceful degradation on SearXNG failure

When SearXNG is unreachable or not configured, the `search` plugin SHALL respond with `502`, and the
UI SHALL show a degraded state without breaking the dashboard.

#### Scenario: SearXNG unreachable

- **WHEN** the SearXNG request fails or no base URL is configured
- **THEN** `GET /api/search?q=…` responds with `502` and the search UI shows a degraded state

### Requirement: Search UI surfaces (read-only, query-driven via the SSR-BFF)

The `search` plugin SHALL contribute a "Search" nav entry, a `/search` page with a query box whose
results are **server-rendered** for the current `q` search param, and a `search-box` dashboard tile
that navigates to `/search`. Reads SHALL go through the SSR server (a server function) — the browser
SHALL NOT call core-api directly.

#### Scenario: Results are server-rendered for the query

- **WHEN** `/search?q=tanstack` is requested with results available
- **THEN** the server-rendered HTML already lists the results (no client-only loading state)

#### Scenario: Empty query shows no results, not an error

- **WHEN** `/search` is requested with no `q`
- **THEN** the page renders the search box with no results and does not call the API

#### Scenario: Dashboard tile starts a search

- **WHEN** the user submits the `search-box` tile on the dashboard
- **THEN** they navigate to `/search?q=<query>` and the results render server-side

