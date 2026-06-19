## Context

`apps/web/src/routes/_authenticated.tsx` renders a header bar + `<Outlet/>`. The home route
`index.tsx` renders `PluginShell`, which owns the vertical nav **and** the hero + tile grid. Plugin
routes (`coding.tsx`, `models.tsx`, …) render `<Box p="lg"><Title/>…<View/></Box>` — no nav, no width
cap. So the nav is home-only and plugin pages stretch the full viewport. Mantine v9 ships `AppShell`
(+ `useDisclosure` in `@mantine/hooks`), both already available.

## Goals / Non-Goals

**Goals:**
- Header + sidebar nav visible on every authenticated page.
- Active route highlighted in the nav.
- Plugin pages constrained to a readable width and styled as cards.
- One shared layout + one shared page wrapper; no per-page bespoke chrome.

**Non-Goals:**
- No backend/contract/loader-data changes (only `_authenticated` additionally loads existing manifests).
- No change to tile content, health logic, or the dashboard grid composition.
- No new routes; no auth changes.

## Decisions

**1. Mantine `AppShell` in `_authenticated`.** `<AppShell header={{height:56}} navbar={{width:240,
breakpoint:'sm', collapsed:{mobile:!opened}}} padding="md">` with `AppShell.Header`, `AppShell.Navbar`
(`<Sidebar/>`), `AppShell.Main` (`<Outlet/>`). `useDisclosure(false)` + a `Burger` (hidden `from="sm"`)
toggles the navbar on mobile. Rationale: idiomatic, responsive collapse for free. Alternative (custom
flex) was simpler but the user chose AppShell for the built-in mobile behavior.

**2. `_authenticated` loads the manifests.** Add `loader: () => settle(getPlugins())` to the
`_authenticated` route; `Sidebar` reads them from the route loader data. `beforeLoad` (auth gate) is
unchanged. The home route keeps its own loader for tile data.

**3. Split `PluginShell` → `Sidebar` + `DashboardGrid`.** `Sidebar` = brand + plugin `NavLink`s
(lucide icons) with active highlight via `useRouterState({select: s => s.location.pathname})` compared
to each `manifest.routeBase`. `DashboardGrid` = the hero slot + uniform `SimpleGrid` of health-accented
tiles (everything `PluginShell` did minus the nav). `index.tsx` renders `DashboardGrid`.

**4. Shared `PluginPage` wrapper.** `PluginPage({title, children})` = `<Container size="lg" px={0}>
<Title order={1} mb="md">{title}</Title>{children}</Container>`. Every plugin route swaps its
`<Box p="lg"><Title/>…` for `<PluginPage title="…">…`. `Container size="lg"` (~960px) caps width so
label·value rows don't span the viewport.

**5. Card-style the heavy views.** `coding-view` + `models-view` wrap each section (week summary, per-
day, projects, languages / GPU, loaded, installed) in `<Paper withBorder radius="md" p="md">` and lay
out breakdown rows as `<Group justify="space-between">` **inside the capped container** so they read as
cards, not edge-to-edge text. Other views (list-shaped) are fixed adequately by the width cap alone.

## Risks / Trade-offs

- **AppShell + SSR/hydration** → AppShell is SSR-safe; the only client state is `useDisclosure` (mobile
  toggle), which defaults closed and matches the server render. Keep the blocking color-scheme script.
- **Renaming `plugin-shell` breaks imports/tests** → update `index.tsx` import and split the test file
  into `sidebar.test` + `dashboard-grid.test`; grep for other `PluginShell` references first.
- **Nav needs manifests on every route** → the `_authenticated` loader `settle()`s `getPlugins()`; a
  manifest outage degrades to an empty nav with the page still rendering (existing graceful-degrade rule).
- **Touching all 12 plugin pages** → mechanical (swap the wrapper); covered by typecheck + existing
  route tests + an E2E that the nav shows on `/coding`.

## Migration Plan

1. `Sidebar` + `DashboardGrid` (from `PluginShell`) + their tests.
2. `PluginPage` wrapper + test.
3. `_authenticated` → AppShell with header + `Sidebar` + manifests loader.
4. `index.tsx` → `DashboardGrid`; every plugin page → `PluginPage`.
5. Card-restyle `coding-view` + `models-view`.
6. Gates green + E2E (nav on `/coding`) + visual check.

Rollback = revert; no persisted state.

## Open Questions

- None.
