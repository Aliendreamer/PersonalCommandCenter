## 1. Backend (TDD)

- [x] 1.1 `GoodreadsClientTests`: the shelf fetch sends a `User-Agent` header; the feed parses to books
- [x] 1.2 `GoodreadsClient` sets a `User-Agent` on the request; `Book` exposes cover/author/description/link

## 2. Reading UI (TDD)

- [x] 2.1 Component test: books render as clickable cards; clicking opens a detail modal with the book's
  fields; external links/covers go through `safeHref`
- [x] 2.2 Implement bordered clickable book cards + the in-app detail modal

## 3. Gates

- [x] 3.1 All `dotnet` + `pnpm` gates green
