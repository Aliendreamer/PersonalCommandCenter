## Why

The roadmap's #2 platform capability is an **alert-bus**: a place plugins and the host raise alerts
to, so the command center can surface "something needs your attention" — and, eventually, push it to
your phone. This change builds the bus + an in-app notification center, **and** stands up a
self-hosted **ntfy** push service (internal for now; external reachability/domain comes later) so
delivery works end to end.

## What Changes

- **Host-level alert-bus** (platform capability, always on): a `Notification` EF entity in core-api
  (`Id`, `Source`, `Severity` Info/Warning/Error, `Title`, `Message?`, `CreatedAt`, `ReadAt?`) + an
  EF migration. An **`INotificationPublisher`** abstraction in `libs/plugin-abstractions`
  (`PublishAsync(source, severity, title, message?)`) any plugin/host code can inject. A host
  `NotificationService` over `PccDbContext` implements publish + a read/manage surface (list, unread
  count, mark one read, mark all read). Registered regardless of the plugin's enabled flag.
- **ntfy delivery**: a self-hosted **`ntfy`** service in `docker-compose` (internal on the compose
  network + a `ntfy.pcc.localhost` Traefik route to view its web UI). On publish, `NotificationService`
  **best-effort** POSTs the notification to an ntfy topic (`{BaseUrl}/{Topic}`); an ntfy failure
  never breaks the in-app save. Config `Notifications:Ntfy:{BaseUrl,Topic}`.
- New **`notifications` plugin** (`plugins/notifications/notifications.api`, id `notifications`; nav
  "Notifications", `routeBase` `/notifications`, widget `notifications-unread`). FastEndpoints under
  `api/notifications`: list (newest first, with unread count), `POST {id}/read`, `POST read-all`.
  Registered in the three compile-time places + Dockerfile copy; endpoints require auth.
- **Producer (v1)**: on host startup, publish one "Command center online" Info notification — it
  lands in the store **and** in ntfy, exercising the whole path once per boot (spam-safe).
- `@pcc/contracts`: a `Notification` type + client methods (`getNotifications`/`markRead`/
  `markAllRead`).
- **Web (SSR-BFF)**: `lib/server` `getNotifications` loader + `markRead`/`markAllRead` POST
  mutations; a `/notifications` route (SSR loader) listing notifications with per-item "mark read" +
  "mark all read" then `router.invalidate()`; a `notifications-unread` dashboard tile (unread count,
  degraded on error).

## Capabilities

### New Capabilities

- `notifications`: an in-app alert-bus + notification center with best-effort ntfy push — the
  publish abstraction + store, the `api/notifications` list/mark-read endpoints, the ntfy delivery
  channel, config-driven UI activation, graceful degradation, and the "Notifications" nav/page/
  `notifications-unread` tile.

### Modified Capabilities

<!-- None. `web-shell` and `plugin-host` already cover plugin nav/tiles/SSR loaders + compile-time
     registration generically. The bus/store is new host infrastructure, not a requirement change. -->

## Impact

- **Infra**: new `ntfy` compose service (internal + `ntfy.pcc.localhost` Traefik route) + a config
  volume; **external reachability/domain deferred**. core-api gains `Notifications:Ntfy:*` config + a
  named ntfy `HttpClient`.
- **Data**: a `Notification` table + an EF migration (applies on startup outside Development; tests
  use InMemory). First non-auth EF entity.
- **Abstractions**: `libs/plugin-abstractions` gains `INotificationPublisher` (so plugins can raise
  alerts — wiring a real plugin producer is a follow-up).
- **Backend**: new `plugins/notifications/notifications.api` project + 3 registration points +
  Dockerfile copy; host `NotificationService` registration.
- **Contracts/Web**: `@pcc/contracts` gains `Notification`; new `_authenticated/notifications` route,
  server functions, dashboard tile, and mark-read UI.
- **Tests**: store/service unit tests (InMemory EF + a stubbed ntfy client), `api/notifications`
  integration tests, contracts client tests, web component/loader tests, and a live E2E.

## Non-Goals (v1)

External reachability/domain for ntfy (phone push from outside the network), email/browser-push
channels, plugin producers (IoT/calendar raising alerts), per-user notification routing/filtering,
and real-time push (SSE/websocket — the page is loader-refreshed). Notifications are global, not
per-user, given the single-user harness.
