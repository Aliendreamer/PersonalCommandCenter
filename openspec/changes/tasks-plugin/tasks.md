## 1. Backend — VTODO CalDAV client + `tasks` plugin (TDD)

- [ ] 1.1 (TDD) Create `plugins/tasks/tasks.api` classlib; add `ITaskClient` + a `TodoItem` model
      (`{ Uid, Title, Due?, Completed, Description? }`) + `TodoInput`. Hand-rolled `TaskIcs`
      (VTODO serialize/parse): UID, SUMMARY, optional DUE (date or UTC), STATUS + COMPLETED +
      PERCENT-COMPLETE, DESCRIPTION. Unit-test round-trip (with/without due; open vs completed).
- [ ] 1.2 Implement `TaskDavClient : ITaskClient` over a named `HttpClient` (Basic auth +
      `TaskOptions`): `ListAsync(includeCompleted)` via `REPORT` calendar-query (VTODO),
      `CreateAsync`/`UpdateAsync` via `PUT {uid}.ics`, `DeleteAsync` via `DELETE`, `MKCALENDAR`
      on demand (405/409 = exists). Unit-test request shaping with a stub `HttpMessageHandler`
      (incl. MKCALENDAR 409 → create still succeeds).
- [ ] 1.3 Implement `TasksPlugin : IPlugin` (id `tasks`; manifest nav "Tasks", `routeBase` `/tasks`,
      widget `tasks-open`; `Configure` registers `ITaskClient`, the named `HttpClient`, `TaskOptions`).
      Lazy `Resolve<T>()` in endpoints.
- [ ] 1.4 FastEndpoints under `api/tasks`: `GET tasks` (`?all=true`), `POST tasks` (blank title →
      `400`), `PUT tasks/{uid}` (incl. `completed` toggle), `DELETE tasks/{uid}`. Map client
      failure → `502`, unknown uid → `404`.
- [ ] 1.5 Register the plugin in `CoreApi.csproj`, `Program.cs` `pluginAssemblies`,
      `PersonalCommandCenter.slnx`; add `Plugins:Tasks:{Enabled,BaseUrl,Collection=/pcc/tasks/,
      Username,Password}` to `appsettings`/compose env; core-api `Dockerfile` copies the plugin.
- [ ] 1.6 (TDD) `CoreApi.Tests` integration tests (fake `ITaskClient`): open-only by default +
      `?all=true`; create → `201` + `uid`; blank title → `400`; toggle complete via `PUT`;
      delete + `404`; disabled plugin absent from `/api/plugins`; CalDAV failure → `502`.

## 2. Contracts — shared types + client (TDD)

- [ ] 2.1 (TDD) `@pcc/contracts`: add `TodoItem` (+ input shape) and client methods `getTasks` /
      `createTask` / `updateTask` / `deleteTask`; client tests against a mock fetch.

## 3. Web — read path (SSR-with-data)

- [ ] 3.1 (TDD) `lib/server`: a pure `loadTasks(fetchImpl, all?)` (401 → redirect, other non-ok →
      throw) + the `getTasks` server function wrapping it with `serverFetch`; unit-test the loader
      (mock fetch, assert URL + `all` flag).
- [ ] 3.2 `tasks-open` tile — presentational (`{ tasks?, error? }`): shows the open-task count (or
      an "All clear" empty state) and a degraded state on error; component test.
- [ ] 3.3 `_authenticated/tasks` route: loader calls `getTasks` (via `settle`); the page renders
      tasks **server-side**; the dashboard renders the `tasks-open` tile for the `tasks-open`
      widget. `pnpm --filter web generate-routes`.

## 4. Web — write path (mutations through the SSR-BFF, TDD)

- [ ] 4.1 (TDD) `lib/server`: `postTask`/`putTask`/`removeTask` pure helpers + `createTask`/
      `updateTask`/`deleteTask` server functions (`createServerFn({ method: 'POST' })`) forwarding
      the cookie; unit-test the helpers (method, body, URL).
- [ ] 4.2 `/tasks` page write UI: a create form, a per-task **complete checkbox** (calls `updateTask`
      with `completed`), and edit/delete actions — each calling the mutations then
      `router.invalidate()`. Component tests for the form + the complete toggle.

## 5. Verify + done gate

- [ ] 5.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build`
      (web + `@pcc/contracts`) + `prettier --check`.
- [ ] 5.2 .NET gates green: `dotnet build` (warnings = errors) + `dotnet test` (new tasks tests
      green, existing still green) + `dotnet format --verify-no-changes`.
- [ ] 5.3 E2E (Playwright, live stack): `docker compose up -d --build`; login; `/tasks` is
      **server-rendered with tasks**; create a task through the UI → it appears; toggle complete →
      it drops off the open list; delete; the browser only ever hit `app.`; `api.pcc.localhost`
      stays **404**.
- [ ] 5.4 Update `CLAUDE.md` (the `tasks` plugin + `Plugins:Tasks` config + `/pcc/tasks/` collection)
      and the plugin layout; mark tasks complete; ready for `/opsx:archive`.
