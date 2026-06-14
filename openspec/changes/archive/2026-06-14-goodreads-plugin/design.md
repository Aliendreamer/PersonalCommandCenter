## Context

A read-only plugin that's a thin specialization of `rss`: same syndication parsing, but it targets
one Goodreads shelf RSS feed and maps Goodreads' **custom RSS elements** (author name, cover image)
into a `Book`. Kept a separate plugin (per request) even though it overlaps `rss`.

## Goals / Non-Goals

**Goals:** fetch + parse a configured Goodreads shelf RSS, map to `Book{title,author?,link,coverUrl?}`,
a `/goodreads` page + `goodreads-reading` tile.

**Non-Goals:** UI shelf selection, writes (no API), ratings/reviews/progress, multiple users, search.

## Decisions

- **Shelf RSS is the only path** — the Goodreads API is dead. URL:
  `https://www.goodreads.com/review/list_rss/{UserId}?shelf={Shelf}` (default `currently-reading`).
- **Parse with `System.ServiceModel.Syndication`** (same as `rss`). Goodreads puts book metadata in
  **custom elements** on each `<item>`: read them via `SyndicationItem.ElementExtensions` —
  `author_name`, `book_large_image_url`/`book_image_url` for the cover; `title` is the book title and
  the first link is the review URL.
- **`GoodreadsClient : IGoodreadsClient`** over a named `HttpClient` + `GoodreadsOptions{UserId,
  Shelf}`. Abstracted for lazy `Resolve<T>()` + test fakes. Unconfigured (`UserId` empty) or fetch
  failure → throw → `502`.
- **Web mirrors `search`/`rss`**: a `getGoodreads` loader server fn feeds the `/goodreads` route +
  the `goodreads-reading` tile (presentational; renders covers).
- **Relationship to `rss`** — both use `SyndicationFeed`; a shared `libs/feeds` could fold them
  together later, but v1 keeps them independent assemblies (the established per-plugin model).

## Risks / Trade-offs

- **Goodreads RSS format/availability** is unofficial and could change → map defensively (title +
  link required; author/cover optional), degrade to `502` on any failure; unit-test against a captured
  Goodreads RSS sample.
- **Custom-element parsing** → assert the `author_name`/`book_image_url` extraction in a unit test so
  a format drift is caught.
- **Duplication with `rss`** → accepted for v1; documented `libs/feeds` extraction path.
