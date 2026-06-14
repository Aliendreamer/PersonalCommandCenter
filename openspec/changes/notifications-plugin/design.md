## Context

PCC has three plugins plus host-level auth (EF `PccDbContext` over Postgres). `notifications` is the
first **platform capability**: a host-owned alert-bus + store that other code publishes to, surfaced
by a thin plugin (nav, tile, page). It also adds the first **non-auth EF entity** and a self-hosted
**ntfy** push service. External reachability (a domain so phones get push from outside) is
explicitly deferred — ntfy runs internal-only for now.

## Goals / Non-Goals

**Goals:**

- A host `INotificationPublisher` any plugin/host code can inject to raise alerts.
- A persistent store (Postgres) + a `/notifications` center + an unread tile, mirroring the
  read+write SSR-BFF pattern from calendar/tasks.
- Best-effort **ntfy** delivery from day one (internal), so the push path is real and verifiable.

**Non-Goals:**

- ntfy external reachability/domain, email/browser-push channels, plugin producers (IoT raising
  alerts), per-user routing/filtering, and real-time push (SSE/websocket). Notifications are global.

## Decisions

- **Store = Postgres via `PccDbContext`** (a `Notification` entity + EF migration), consistent with
  auth sessions. Migration applies on startup outside Development; integration tests use the InMemory
  provider (no migration), like the existing auth tests.
- **Abstractions live in `libs/plugin-abstractions`** so plugins reference them without referencing
  the host: `NotificationSeverity` enum, a plain `NotificationDto` record, `INotificationPublisher`
  (write), and `INotificationStore` (read/manage: list, unread count, mark one, mark all). The host
  `NotificationService` implements **both** over EF (mapping the entity ↔ DTO). The `notifications`
  plugin endpoints `Resolve<INotificationStore>()`; producers inject `INotificationPublisher`.
- **The bus is host infrastructure, registered unconditionally** (not gated by the plugin's enabled
  flag) — publishing must work even if the notifications UI is disabled. Only the plugin's endpoints/
  nav/tile are config-gated.
- **ntfy delivery is best-effort and isolated.** `NotificationService.PublishAsync` first persists,
  then POSTs to `{Ntfy:BaseUrl}/{Ntfy:Topic}` via a named `HttpClient`; the POST is wrapped so any
  failure is logged and swallowed — the in-app notification is the source of truth, ntfy is a
  delivery side-effect. (ntfy accepts an anonymous publish: `POST /{topic}` with the message body and
  `Title`/`Priority` headers.)
- **ntfy is a self-hosted compose service**, internal on the network + a `ntfy.pcc.localhost` Traefik
  file-provider route to view its web UI / poll its JSON API for verification. core-api reaches it as
  `http://ntfy:80`. No auth in v1 (internal); auth + a real domain come with external reachability.
- **Startup producer**: after `app.Build()`, the host opens a scope, resolves
  `INotificationPublisher`, and publishes one "Command center online" Info notification — once per
  boot, exercising store + ntfy. (This runs in all environments; tests asserting an empty store boot
  with the notifications plugin disabled or tolerate the seed.)
- **Web mirrors calendar/tasks**: `getNotifications` loader server fn + `markRead`/`markAllRead` POST
  mutations; `/notifications` page + `notifications-unread` tile; the page calls the mutations then
  `router.invalidate()`. The list response carries the unread count so the tile and page share one
  fetch shape.

## Risks / Trade-offs

- **EF migration churn** → a single `AddNotifications` migration; the entity is small and additive,
  no impact on the auth tables. Tests stay on InMemory.
- **Startup notification accumulates one row per boot** → Accepted for v1 (low frequency, and it's
  the only producer); a future producer story can add dedup/retention. The E2E uses its presence as
  a fixture and marks it read.
- **ntfy delivery coupling** → Mitigated by best-effort isolation: ntfy down ⇒ in-app still works.
  Unit-tested with a stub ntfy `HttpClient` (publish persists even when the POST throws).
- **Global (not per-user) notifications** → Fine for the single-user harness; a `UserId` column +
  routing is the documented next step alongside external delivery.
- **Another container** → ntfy is tiny (a single Go binary); same operational story as Radicale/HA.
