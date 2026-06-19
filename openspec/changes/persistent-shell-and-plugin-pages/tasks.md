## 1. Sidebar + DashboardGrid (split PluginShell)

- [ ] 1.1 Write `sidebar.test.tsx`: renders a NavLink per manifest; marks the active route — watch fail
- [ ] 1.2 Implement `components/sidebar.tsx` (brand + plugin NavLinks + lucide icons + active highlight
  via `useRouterState`) until green
- [ ] 1.3 Move the hero + tile grid from `plugin-shell.tsx` into `components/dashboard-grid.tsx` (drop
  the nav); migrate the tile/health/hero tests to `dashboard-grid.test.tsx`; delete `plugin-shell.*`

## 2. PluginPage wrapper

- [ ] 2.1 Write `plugin-page.test.tsx`: renders the title + children inside a constrained container — fail
- [ ] 2.2 Implement `components/plugin-page.tsx` (`Container size="lg"` + `Title`) until green

## 3. AppShell layout

- [ ] 3.1 Add `loader: () => settle(getPlugins())` to `routes/_authenticated.tsx`
- [ ] 3.2 Rebuild `_authenticated` with Mantine `AppShell` (Header: brand+burger+account/theme/logout;
  Navbar: `<Sidebar manifests=… />`; Main: `<Outlet/>`) + `useDisclosure` for the mobile toggle

## 4. Apply across pages

- [ ] 4.1 `routes/_authenticated/index.tsx` → render `<DashboardGrid …/>` (no nav)
- [ ] 4.2 Wrap every plugin route page (`coding, models, calendar, tasks, devices, weather, rss,
  goodreads, uptime, notifications, system, search`) in `<PluginPage title=…>`
- [ ] 4.3 Card-restyle `coding-view.tsx` + `models-view.tsx` (Paper sections, aligned label·value rows);
  keep their existing tests green

## 5. Verify

- [ ] 5.1 Frontend gates green: `nx typecheck lint test build` (web + contracts) · `prettier --check .`
- [ ] 5.2 Rebuild the web image + boot; visually confirm the nav is on every page and `/coding`/`/models`
  read as tidy cards
- [ ] 5.3 Extend/add an E2E asserting the sidebar nav is visible on `/coding`
- [ ] 5.4 Archive the change
