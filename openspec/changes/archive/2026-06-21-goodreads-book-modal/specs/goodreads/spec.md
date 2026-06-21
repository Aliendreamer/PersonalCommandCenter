## MODIFIED Requirements

### Requirement: Shelf listing

The `goodreads` plugin SHALL fetch the configured user's shelf RSS feed
(`goodreads.com/review/list_rss/{UserId}?shelf={Shelf}`) **with a `User-Agent` request header** (Goodreads
returns an empty/blocked body to a header-less client), parse it, and expose `GET /api/goodreads`
returning the books mapped to `{ title, author?, link, coverUrl?, description? }`.

#### Scenario: Returns the shelf's books

- **WHEN** a client requests `GET /api/goodreads` and the shelf RSS returns books
- **THEN** the response lists `{ title, author?, link, coverUrl?, description? }` entries

#### Scenario: Requests the configured user + shelf with a User-Agent

- **WHEN** the plugin fetches the feed
- **THEN** the request targets `…/review/list_rss/{UserId}` with the configured `shelf` query and a
  `User-Agent` header

### Requirement: Reading UI surfaces (read-only via the SSR-BFF)

The `goodreads` plugin SHALL contribute a "Reading" nav entry, a `/goodreads` page server-rendered
with the shelf's books as **bordered, clickable cards** (cover + title + author), and a
`goodreads-reading` dashboard tile showing what's currently on the shelf. Selecting a card SHALL open
an **in-app book detail modal** (cover, title, author, description, and an external link to the book on
Goodreads). All external links and cover URLs SHALL be routed through `safeHref` with
`rel="noreferrer noopener"`. Reads SHALL go through the SSR server — the browser SHALL NOT call core-api
directly.

#### Scenario: Reading page is server-rendered

- **WHEN** the `/goodreads` page is requested with books available
- **THEN** the server-rendered HTML already lists the books as cards

#### Scenario: Clicking a book opens its detail modal

- **WHEN** the user clicks a book card
- **THEN** an in-app modal shows that book's cover, title, author, description, and an external link
  (routed through `safeHref`) to Goodreads

#### Scenario: Tile shows the shelf

- **WHEN** the dashboard renders with the `goodreads` plugin enabled and books available
- **THEN** the `goodreads-reading` tile shows the current shelf (titles/count), degrading to a
  "Reading unavailable" state on error
