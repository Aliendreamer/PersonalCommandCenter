## ADDED Requirements

### Requirement: Feed aggregation

The `rss` plugin SHALL fetch each configured feed URL, parse RSS/Atom, and expose `GET /api/rss`
returning the newest items aggregated across all feeds, mapped to `{ title, link, published, source }`
and sorted newest-first, capped at the configured maximum.

#### Scenario: Aggregates newest-first across feeds

- **WHEN** two configured feeds return items and a client requests `GET /api/rss`
- **THEN** the response lists items from both feeds, newest-first, mapped with `title`/`link`/
  `published`/`source`

#### Scenario: A single bad feed is skipped

- **WHEN** one configured feed is unreachable/invalid but another succeeds
- **THEN** `GET /api/rss` returns the items from the working feed (the bad feed is skipped, not fatal)

### Requirement: Config-driven activation

The `rss` plugin SHALL activate only when `Plugins:Rss:Enabled` is `true`, and SHALL appear in
`/api/plugins` with a "Feeds" nav entry and `rss-latest` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Rss:Enabled = false`
- **THEN** `GET /api/rss` is not served and `rss` is absent from `/api/plugins`

### Requirement: Graceful degradation

When no feeds are configured or every feed fails, the `rss` plugin SHALL respond with `502`, and the
UI SHALL show a degraded state without breaking the dashboard.

#### Scenario: All feeds fail

- **WHEN** no feeds are configured (or all configured feeds fail)
- **THEN** `GET /api/rss` responds with `502` and the Feeds tile/page show a degraded state

### Requirement: Feeds UI surfaces (read-only via the SSR-BFF)

The `rss` plugin SHALL contribute a "Feeds" nav entry, a `/rss` page server-rendered with the recent
items (title links out, with source + time), and an `rss-latest` dashboard tile showing the latest
headline (or item count). Reads SHALL go through the SSR server — the browser SHALL NOT call core-api
directly.

#### Scenario: Feeds page is server-rendered

- **WHEN** the `/rss` page is requested with items available
- **THEN** the server-rendered HTML already lists the items

#### Scenario: Latest tile shows the newest item

- **WHEN** the dashboard renders with the `rss` plugin enabled and items available
- **THEN** the `rss-latest` tile shows the newest headline (or count), degrading to a "Feeds
  unavailable" state on error
