## 1. Infra — ntfy service

- [x] 1.1 Add a `ntfy` service to `docker-compose.yml` (image `binwiederhier/ntfy`, `serve`; config/
      cache volume; `NTFY_BASE_URL=http://ntfy.pcc.localhost`, `NTFY_BEHIND_PROXY=true`). Add a
      `ntfy.pcc.localhost` route to `harness/traefik/dynamic.yml` (→ `ntfy:80`). Internal publish at
      `http://ntfy:80`; external domain deferred.
- [x] 1.2 `docker compose config` valid; bring `ntfy` up and confirm a `POST /{topic}` is accepted
      and readable via its JSON poll API (smoke).

## 2. Host alert-bus — abstractions, entity, service (TDD)

- [x] 2.1 `libs/plugin-abstractions`: add `NotificationSeverity` (Info/Warning/Error), a plain
      `NotificationDto` record, `INotificationPublisher` (`PublishAsync(source, severity, title,
      message?)`), and `INotificationStore` (`ListAsync`, `UnreadCountAsync`, `MarkReadAsync(id)`,
      `MarkAllReadAsync`).
- [x] 2.2 core-api `Data`: a `Notification` EF entity (Id Guid, Source, Severity, Title, Message?,
      CreatedAt, ReadAt?) + `DbSet` on `PccDbContext` + an `AddNotifications` migration
      (`dotnet ef migrations add`).
- [x] 2.3 (TDD) Host `NotificationService : INotificationPublisher, INotificationStore` over
      `PccDbContext` + a named ntfy `HttpClient` (`NtfyOptions{BaseUrl,Topic}`): publish persists then
      best-effort POSTs to ntfy (swallow failures); list newest-first; unread count; mark one / all.
      Unit-test with InMemory EF + a stub ntfy handler (persist-even-when-ntfy-throws; mark read).
- [x] 2.4 `Program.cs`: register `NotificationService` (scoped) as both interfaces + the ntfy
      `HttpClient` + `NotificationsOptions`; after build, open a scope and publish one "Command center
      online" Info notification.

## 3. notifications plugin — endpoints (TDD)

- [x] 3.1 New `plugins/notifications/notifications.api` classlib implementing `IPlugin` (id
      `notifications`; nav "Notifications", `routeBase` `/notifications`, widget `notifications-unread`).
      Register in `CoreApi.csproj`, `Program.cs` `pluginAssemblies`, `PersonalCommandCenter.slnx`,
      Dockerfile; `Plugins:Notifications:Enabled` config. Lazy `Resolve<INotificationStore>()`.
- [x] 3.2 FastEndpoints under `api/notifications`: `GET` list (newest-first + unread count),
      `POST {id}/read`, `POST read-all`. Unknown id → `404`; require auth.
- [x] 3.3 (TDD) `CoreApi.Tests` integration tests (real `NotificationService` on InMemory EF, stub
      ntfy): list with unread count; mark one read → count drops + `404` unknown; mark all → count 0;
      requires auth; disabled plugin absent from `/api/plugins`.

## 4. Contracts + web (read + mark-read, TDD)

- [x] 4.1 (TDD) `@pcc/contracts`: `Notification` type + `getNotifications`/`markRead`/`markAllRead`
      client methods; client tests against a mock fetch.
- [x] 4.2 (TDD) `lib/server`: `loadNotifications` pure loader + `getNotifications` server fn;
      `markNotificationRead`/`markAllNotificationsRead` POST server functions + pure helpers; unit-test
      the helpers (method/URL).
- [x] 4.3 `notifications-unread` tile — presentational (`{ unread?, error? }`): shows the unread
      count (or "No notifications") and a degraded state on error; component test.
- [x] 4.4 `_authenticated/notifications` route: loader calls `getNotifications` (via `settle`); page
      renders notifications **server-side** with per-item "mark read" + "mark all read" calling the
      mutations then `router.invalidate()`; dashboard renders the `notifications-unread` tile. A
      `NotificationList` presentational component + test. `generate-routes`.

## 5. Verify + done gate

- [ ] 5.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build`
      (web + `@pcc/contracts`) + `prettier --check`.
- [ ] 5.2 .NET gates green: `dotnet build` (warnings = errors) + `dotnet test` + `dotnet format
      --verify-no-changes`.
- [ ] 5.3 E2E (Playwright, live stack with `ntfy`): `docker compose up -d --build`; login;
      `/notifications` is **server-rendered** and shows the startup "Command center online"
      notification; mark it read → the `notifications-unread` tile drops to 0; the browser only ever
      hit `app.`; `api.pcc.localhost` stays **404**. (ntfy receipt verified via its JSON poll API.)
- [ ] 5.4 Update `CLAUDE.md` (the `notifications` plugin + alert-bus + `ntfy` service +
      `Notifications:Ntfy` config + the EF entity/migration) and the plugin layout; mark tasks
      complete; ready for `/opsx:archive`.
