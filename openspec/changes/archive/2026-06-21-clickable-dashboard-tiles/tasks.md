## 1. Clickable tiles (TDD) — DONE

- [x] 1.1 `dashboard-grid.test`: tile is an `<a href=routeBase>` with `tileHref`; a non-anchor
  `<section>` when it returns undefined
- [x] 1.2 `DashboardGrid` gains `tileHref?`; card renders `component="a" href` (inherit color, no
  underline, pointer, block) when a href is supplied, else `component="section"`
- [x] 1.3 `index.tsx` passes `tileHref` = routeBase for every tile except the search-box tile

## 2. Reading title is not a link (TDD) — DONE

- [x] 2.1 `goodreads-reading-tile.test`: title shown but NOT inside an `<a>`; dropped the old
  links-out / neutralizes-link tile tests
- [x] 2.2 Book title rendered as `Text` (removed the tile's `Anchor`/`safeHref`)

## 3. Gates + deploy — DONE

- [x] 3.1 `pnpm typecheck`/`lint`/`test` (138 web + 17 contracts)/`build`/`format:check` green
- [x] 3.2 `pnpm fe:rebuild`
