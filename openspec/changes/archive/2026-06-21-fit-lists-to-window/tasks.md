## 1. PluginPage fill mode (TDD) — DONE

- [x] 1.1 `plugin-page.test`: `fill` renders title + children in a bounded scroll region; `scroll={false}`
  variant; default unchanged
- [x] 1.2 `PluginPage` gains `fill?` + `scroll?` (default true): viewport-bounded flex column;
  `ScrollArea` content region when scroll, plain `flex:1 minHeight:0` region when not

## 2. Virtualized notifications (TDD) — DONE

- [x] 2.1 `notification-list.test`: row title/severity; mark-read callback; empty + error; renders all
  rows when unmeasured (jsdom fallback)
- [x] 2.2 `NotificationList` virtualized via `@tanstack/react-virtual` (dynamic measure + all-rows
  fallback); extracted pure `NotificationRow`

## 3. Apply fill to the list pages — DONE

- [x] 3.1 Notifications: `PluginPage fill scroll={false}` (virtual list owns the scroll)
- [x] 3.2 RSS, Search, Tasks, Reading, Devices, Uptime: `PluginPage fill` (internal ScrollArea)

## 4. Gates + deploy — DONE

- [x] 4.1 `pnpm typecheck`/`lint`/`test` (145 web + 17 contracts)/`build`/`format:check` green
- [x] 4.2 `pnpm fe:rebuild`
