## ADDED Requirements

### Requirement: Task listing

The `tasks` plugin SHALL fetch VTODO items from the configured CalDAV collection and expose them at
`GET /api/tasks`, mapped to `{ uid, title, due?, completed, description? }`. By default it SHALL
return only open tasks (not `COMPLETED`); `?all=true` SHALL include completed tasks.

#### Scenario: Returns open tasks by default

- **WHEN** the collection holds one open and one completed VTODO, and a client requests `GET /api/tasks`
- **THEN** the response contains only the open task, mapped with `uid`, `title`, and `completed=false`

#### Scenario: Includes completed when requested

- **WHEN** a client requests `GET /api/tasks?all=true`
- **THEN** the response includes both the open and the completed task

### Requirement: Create task

The `tasks` plugin SHALL accept `POST /api/tasks` with `{ title, due?, description? }`, write a
VTODO (status `NEEDS-ACTION`) to the CalDAV collection, and return the created task with its
server-assigned `uid`.

#### Scenario: Created task is persisted

- **WHEN** a client POSTs a valid task
- **THEN** the response is `201` with the created task (including a `uid` and `completed=false`),
  and a subsequent `GET /api/tasks` includes it

#### Scenario: Empty title is rejected

- **WHEN** a client POSTs a task with a blank `title`
- **THEN** the response is `400` and nothing is written to CalDAV

### Requirement: Update task

The `tasks` plugin SHALL accept `PUT /api/tasks/{uid}` and update the matching VTODO's fields,
including toggling completion: `completed=true` SHALL set status `COMPLETED` (with a completion
timestamp and `PERCENT-COMPLETE:100`), `completed=false` SHALL set status `NEEDS-ACTION`.

#### Scenario: Marking complete

- **WHEN** a client PUTs `completed=true` for an existing task's `uid`
- **THEN** the response is `200` and a subsequent default listing no longer includes it (it is
  completed), while `?all=true` shows it as completed

#### Scenario: Unknown uid

- **WHEN** a client PUTs to a `uid` that does not exist
- **THEN** the response is `404`

### Requirement: Delete task

The `tasks` plugin SHALL accept `DELETE /api/tasks/{uid}` and remove the matching VTODO.

#### Scenario: Delete removes the task

- **WHEN** a client DELETEs an existing task's `uid`
- **THEN** the response is `204` and a subsequent listing no longer includes it

#### Scenario: Unknown uid

- **WHEN** a client DELETEs a `uid` that does not exist
- **THEN** the response is `404`

### Requirement: Config-driven activation

The `tasks` plugin SHALL activate only when `Plugins:Tasks:Enabled` is `true`, and SHALL appear in
`/api/plugins` with a "Tasks" nav entry and `tasks-open` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Tasks:Enabled = false`
- **THEN** the `api/tasks/*` endpoints are not served and `tasks` is absent from `/api/plugins`

### Requirement: Graceful degradation on CalDAV failure

When the CalDAV server is unreachable or not configured, the `tasks` plugin's endpoints SHALL
respond with `502`, and the UI SHALL show a degraded state without breaking the dashboard.

#### Scenario: CalDAV unreachable

- **WHEN** the CalDAV request fails or no base URL/credentials are configured
- **THEN** `GET /api/tasks` responds with `502` and the Tasks tile/page show a degraded state

### Requirement: Tasks UI surfaces (read + write via the SSR-BFF)

The `tasks` plugin SHALL contribute a "Tasks" nav entry, a `/tasks` page that is server-rendered
with tasks and supports create / toggle-complete / delete, and a `tasks-open` dashboard tile showing
the open-task count. All reads and writes SHALL go through the SSR server (server functions) — the
browser SHALL NOT call core-api directly — and after a successful write the affected view SHALL
refresh.

#### Scenario: Tasks page is server-rendered

- **WHEN** the `/tasks` page is requested with tasks available
- **THEN** the server-rendered HTML already lists the tasks (no client-only loading state)

#### Scenario: Open-tasks tile shows a count

- **WHEN** the dashboard renders with the `tasks` plugin enabled and open tasks available
- **THEN** the `tasks-open` tile shows the number of open tasks, degrading to a "Tasks unavailable"
  state on error

#### Scenario: Completing a task from the UI refreshes the view

- **WHEN** the user checks a task complete on the `/tasks` page
- **THEN** the update goes through an SSR server function (the browser only talks to the app origin)
  and the view refreshes to reflect the completion
