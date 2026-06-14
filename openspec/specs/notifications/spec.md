# notifications Specification

## Purpose
TBD - created by archiving change notifications-plugin. Update Purpose after archive.
## Requirements
### Requirement: Publish to the alert-bus

The host SHALL expose an `INotificationPublisher.PublishAsync(source, severity, title, message?)`
that persists a notification (with a generated id, `CreatedAt`, and no `ReadAt`) and best-effort
delivers it to the configured ntfy topic. A delivery failure SHALL NOT prevent the notification from
being persisted.

#### Scenario: Publishing persists and is deliverable

- **WHEN** code calls `PublishAsync("system", Info, "Online", null)`
- **THEN** a notification is stored (unread) and a POST is attempted to `{Ntfy:BaseUrl}/{Ntfy:Topic}`

#### Scenario: ntfy failure does not lose the notification

- **WHEN** the ntfy POST fails (unreachable)
- **THEN** the notification is still persisted and `PublishAsync` does not throw

### Requirement: Notification listing

The `notifications` plugin SHALL expose `GET /api/notifications` returning notifications newest-first,
each mapped to `{ id, source, severity, title, message?, createdAt, readAt? }`, together with the
current unread count.

#### Scenario: Lists newest first with an unread count

- **WHEN** two notifications exist (one read, one unread) and a client requests `GET /api/notifications`
- **THEN** the response lists both newest-first and reports an unread count of `1`

### Requirement: Mark read

The `notifications` plugin SHALL expose `POST /api/notifications/{id}/read` (mark one) and
`POST /api/notifications/read-all` (mark all). Marking SHALL set `ReadAt`; an unknown id SHALL
return `404`.

#### Scenario: Mark one read

- **WHEN** a client POSTs `/api/notifications/{id}/read` for an unread notification
- **THEN** the response is `204`, the notification's `readAt` is set, and the unread count drops by one

#### Scenario: Mark all read

- **WHEN** a client POSTs `/api/notifications/read-all` with two unread notifications
- **THEN** the response is `204` and a subsequent listing reports an unread count of `0`

#### Scenario: Unknown id

- **WHEN** a client POSTs `/api/notifications/{id}/read` for an id that does not exist
- **THEN** the response is `404`

### Requirement: Startup notification

On host startup the system SHALL publish exactly one "Command center online" Info notification,
exercising the store and ntfy delivery once per boot.

#### Scenario: Startup raises one notification

- **WHEN** the host starts
- **THEN** a single Info notification with source `system` is present in the store

### Requirement: Config-driven activation

The `notifications` plugin SHALL activate only when `Plugins:Notifications:Enabled` is `true`, and
SHALL appear in `/api/plugins` with a "Notifications" nav entry and `notifications-unread` widget
when enabled. The bus/store (publish) remains available to the host regardless.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Notifications:Enabled = false`
- **THEN** the `api/notifications/*` endpoints are not served and `notifications` is absent from
  `/api/plugins`

### Requirement: Notifications UI surfaces (read + mark-read via the SSR-BFF)

The `notifications` plugin SHALL contribute a "Notifications" nav entry, a `/notifications` page that
is server-rendered with the notifications and supports per-item mark-read + mark-all-read, and a
`notifications-unread` dashboard tile showing the unread count. All reads and writes SHALL go through
the SSR server (server functions) — the browser SHALL NOT call core-api directly — and after a
successful mark the affected view SHALL refresh.

#### Scenario: Notifications page is server-rendered

- **WHEN** the `/notifications` page is requested with notifications available
- **THEN** the server-rendered HTML already lists them (no client-only loading state)

#### Scenario: Unread tile shows the count

- **WHEN** the dashboard renders with the `notifications` plugin enabled and unread notifications
- **THEN** the `notifications-unread` tile shows the unread count, degrading to a "Notifications
  unavailable" state on error

#### Scenario: Marking read refreshes the view

- **WHEN** the user marks a notification read on the `/notifications` page
- **THEN** the mark goes through an SSR server function (the browser only talks to the app origin)
  and the view refreshes (the unread count drops)

