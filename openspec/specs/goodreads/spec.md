# goodreads Specification

## Purpose
TBD - created by archiving change goodreads-plugin. Update Purpose after archive.
## Requirements
### Requirement: Shelf listing

The `goodreads` plugin SHALL fetch the configured user's shelf RSS feed
(`goodreads.com/review/list_rss/{UserId}?shelf={Shelf}`), parse it, and expose `GET /api/goodreads`
returning the books mapped to `{ title, author?, link, coverUrl? }`.

#### Scenario: Returns the shelf's books

- **WHEN** a client requests `GET /api/goodreads` and the shelf RSS returns books
- **THEN** the response lists `{ title, author?, link, coverUrl? }` entries

#### Scenario: Requests the configured user + shelf

- **WHEN** the plugin fetches the feed
- **THEN** the request targets `…/review/list_rss/{UserId}` with the configured `shelf` query

### Requirement: Config-driven activation

The `goodreads` plugin SHALL activate only when `Plugins:Goodreads:Enabled` is `true`, and SHALL
appear in `/api/plugins` with a "Reading" nav entry and `goodreads-reading` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Goodreads:Enabled = false`
- **THEN** `GET /api/goodreads` is not served and `goodreads` is absent from `/api/plugins`

### Requirement: Graceful degradation

When the shelf RSS is unreachable or no user is configured, the `goodreads` plugin SHALL respond with
`502`, and the UI SHALL show a degraded state without breaking the dashboard.

#### Scenario: Feed unreachable

- **WHEN** the Goodreads request fails or no `UserId` is configured
- **THEN** `GET /api/goodreads` responds with `502` and the Reading tile/page show a degraded state

### Requirement: Reading UI surfaces (read-only via the SSR-BFF)

The `goodreads` plugin SHALL contribute a "Reading" nav entry, a `/goodreads` page server-rendered
with the shelf's books (cover + title + author, linking out), and a `goodreads-reading` dashboard
tile showing what's currently on the shelf. Reads SHALL go through the SSR server — the browser SHALL
NOT call core-api directly.

#### Scenario: Reading page is server-rendered

- **WHEN** the `/goodreads` page is requested with books available
- **THEN** the server-rendered HTML already lists the books

#### Scenario: Tile shows the shelf

- **WHEN** the dashboard renders with the `goodreads` plugin enabled and books available
- **THEN** the `goodreads-reading` tile shows the current shelf (titles/count), degrading to a
  "Reading unavailable" state on error

