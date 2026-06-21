## Why

> Retroactive spec — shipped directly to `main` (commits `c7a0f13`, `2593994`, `732218f`) ahead of its
> proposal. Captured here to keep the `goodreads` spec the source of truth.

Two gaps in the read-only Goodreads shelf: (1) Goodreads' RSS endpoint returns an empty/blocked body
to a default `HttpClient` with no `User-Agent`, so the real shelf never loaded; (2) the Reading page
only listed books flatly with no way to see a book's detail without leaving the app.

## What Changes

- **The shelf RSS fetch sends a `User-Agent` header** so Goodreads returns the real feed body instead
  of an empty/blocked response.
- **The Reading page renders books as bordered, clickable cards** that open an **in-app book detail
  modal** (cover, title, author, description, and a link out to Goodreads). External links/covers route
  through `safeHref` + `rel="noreferrer noopener"`.

## Capabilities

### Modified Capabilities
- `goodreads`: the shelf fetch sends a `User-Agent`; the Reading UI gains clickable book cards and an
  in-app detail modal (external links via `safeHref`).

## Impact

- **.NET**: `GoodreadsClient` adds a `User-Agent` request header; `Book` carries the fields the modal
  shows (cover, author, description, link).
- **Web**: `goodreads` page/cards + a detail modal component; `safeHref` on covers and links.
- **Tests**: `GoodreadsClientTests` (UA header sent), the cards/modal component test.
