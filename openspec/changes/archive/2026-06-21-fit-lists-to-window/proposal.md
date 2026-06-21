## Why

List pages (Notifications especially) grow past the viewport and make the whole page scroll. The list
should fit the window: the page stays put and the list scrolls inside its own area.

## What Changes

- **`PluginPage` gains a `fill` mode**: the page becomes a viewport-bounded flex column (height =
  `100dvh − header − padding`) so the title stays fixed and the content area takes the remaining height.
  A `scroll` flag (default on) wraps the content in a Mantine `ScrollArea` that scrolls internally.
- **The 7 list pages opt into `fill`**: Notifications, Feeds (RSS), Search, Tasks, Reading, Devices,
  Uptime. Their lists scroll inside the bounded area — no page scroll. Full server-side rendering is
  preserved (all rows are still in the SSR HTML; they just scroll within the box).
- **Notifications is truly virtualized** with `@tanstack/react-virtual`: it can grow unbounded, so only
  the visible rows render (`fill scroll={false}`; the virtualizer owns the scroll). To keep SSR/hydration
  honest, it falls back to rendering all rows when no scroll height is measured yet (server + first paint).
- Dashboard, forms, calendar, coding, models pages are unchanged (not simple scroll lists).

## Capabilities

### Modified Capabilities
- `ui-kit`: `PluginPage` supports a window-fitting `fill` mode with internal scroll; the Notifications
  list is virtualized.

## Impact

- **Web**: `components/plugin-page.tsx` (`fill`/`scroll`); the 7 list routes (`fill`);
  `components/notification-list.tsx` (virtualized via `@tanstack/react-virtual`).
- **Dep**: `@tanstack/react-virtual` added to `web`.
- **Tests**: `plugin-page` (fill renders a bounded scroll region), `notification-list` (row content +
  empty/error states; renders all rows when unmeasured).
