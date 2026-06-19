## Why

The plugin nav lives inside the home-page `PluginShell`, so it only appears on `/` — every plugin
page (`/coding`, `/models`, …) loses the sidebar and renders as bare, full-viewport-width text where
values float to the far edge. The app feels broken off the dashboard. This change makes the header +
sidebar a persistent app shell and gives plugin pages a consistent, readable, card-styled layout.

## What Changes

- Adopt **Mantine `AppShell`** in `_authenticated.tsx`: a persistent header (brand + Account/theme/
  logout) and a persistent sidebar nav, with `<Outlet/>` in the main area, on **every** authenticated
  page. Responsive — the navbar collapses behind a burger on small screens.
- The `_authenticated` route loads the plugin manifests so the **nav renders on every page** (not just
  the dashboard).
- The sidebar nav gains **active-route highlighting** (now meaningful since it is always visible).
- Split the home `PluginShell`: the nav moves to a new `Sidebar`; the dashboard content (hero + uniform
  tile grid) becomes `DashboardGrid` used by `index.tsx`.
- Add a shared **`PluginPage`** wrapper (width-constrained `Container` + page title) used by **all**
  plugin route pages, so content stops stretching edge-to-edge.
- Restyle the data-heavy views (`coding-view`, `models-view`) into `Paper` card sections with tidy
  label·value rows.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `web-shell`: the authenticated app gains a persistent header + sidebar shell (nav on every route,
  active highlight, responsive collapse), and plugin pages render in a shared width-constrained,
  card-styled wrapper rather than full-width text.

## Impact

- **New web**: `components/sidebar.tsx`, `components/dashboard-grid.tsx` (from `PluginShell`),
  `components/plugin-page.tsx`.
- **Touched web**: `routes/_authenticated.tsx` (AppShell + plugins loader), `routes/_authenticated/
  index.tsx` (use `DashboardGrid`), every `routes/_authenticated/<plugin>.tsx` (wrap in `PluginPage`),
  `components/coding-view.tsx` + `components/models-view.tsx` (card sections), and the `plugin-shell`
  test split into `sidebar`/`dashboard-grid` tests.
- **Removed/renamed**: `components/plugin-shell.tsx` → `dashboard-grid.tsx` (nav extracted to `Sidebar`).
- **Tests**: `sidebar`, `dashboard-grid`, `plugin-page`, updated view tests; an E2E asserting the nav
  is present on a plugin page (`/coding`). No backend/contract changes.
