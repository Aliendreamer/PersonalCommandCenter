## Why

The dashboard tiles look like cards but aren't clickable — you can't get from a tile to its plugin
page. And the Reading tile renders the book title as an external link (out to Goodreads), which both
competes with the tile-as-navigation and isn't what the title should do on the dashboard.

## What Changes

- **Each dashboard tile is a clickable link to its plugin page** (`routeBase`), matching the sidebar's
  plain-anchor navigation. The **Search tile is the exception** — it owns an input + button, so the
  whole card can't be an anchor; it keeps its in-tile search action.
- **The Reading tile's book title is plain text, not a link.** The tile navigates to `/goodreads` like
  the others; the out-to-Goodreads link stays on the Reading page / book modal (which keep `safeHref`).

## Capabilities

### Modified Capabilities
- `web-shell`: dashboard tiles navigate to their plugin page on click (Search excepted); the Reading
  tile title is non-linking text.

## Impact

- **Web**: `components/dashboard-grid.tsx` (optional `tileHref`; renders the card as an anchor),
  `routes/_authenticated/index.tsx` (passes `tileHref`, Search excluded),
  `components/goodreads-reading-tile.tsx` (title → `Text`).
- **Tests**: `dashboard-grid` (tile is a link to routeBase; no link without href),
  `goodreads-reading-tile` (title is not a link).
