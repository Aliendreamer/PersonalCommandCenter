## Context

`calendar` just shipped the full CalDAV + SSR-BFF read+write stack (FastEndpoints plugin,
`CalDavClient`, hand-rolled `CalendarIcs`, server-function loader + mutations, presentational tile +
page, live E2E). `tasks` is its near-twin for VTODO. Radicale, auth, Traefik, and the SSR-BFF all
already exist; this change adds a parallel self-contained plugin and a second collection.

## Goals / Non-Goals

**Goals:**

- A `tasks` plugin matching `calendar`/`iot`: FastEndpoints under `api/tasks`, config-driven
  activation, `502` degradation, nav + `/tasks` page + `tasks-open` tile.
- VTODO CRUD plus a first-class **toggle complete** (status transitions).
- Reuse the mutation-through-the-SSR-BFF pattern (`createServerFn` POST → cookie forward →
  `router.invalidate()`).

**Non-Goals:**

- Subtasks, RRULE/recurring tasks, reminders/alarms (VALARM), priority/ordering UX, tags, and
  multi-list selection — deferred. v1 is a single list with title + optional due date + completed +
  optional description.
- A shared CalDAV library. `TaskDavClient`/`TaskIcs` **mirror** `CalDavClient`/`CalendarIcs` rather
  than share code (plugins are independent assemblies). Extract a `libs/caldav` later if a third
  CalDAV plugin appears.

## Decisions

- **Separate `/pcc/tasks/` collection** (vs reusing `/pcc/calendar/`). VTODO and VEVENT are
  different component types; a dedicated collection keeps queries clean and mirrors how real CalDAV
  clients separate calendars from task lists. Same Radicale credentials.
- **`TaskIcs` (hand-rolled VTODO)**, same rationale as `CalendarIcs` (narrow subset, no `Ical.Net`,
  exhaustive round-trip tests). Fields: `UID`, `SUMMARY` (title), `DUE` (optional; `VALUE=DATE` or
  UTC), `STATUS` (`NEEDS-ACTION`/`COMPLETED`), `COMPLETED` timestamp + `PERCENT-COMPLETE:100` when
  done, `DESCRIPTION` (optional). `completed` is derived from `STATUS = COMPLETED`.
- **`TaskDavClient : ITaskClient`** over a named `HttpClient` — same operations as `CalDavClient`:
  `REPORT` calendar-query filtered to `VTODO`, `PUT {uid}.ics`, `DELETE`, `MKCALENDAR`-on-demand
  tolerating **405 and 409** (the Radicale gotcha calendar already paid for). Open-vs-all filtering
  is applied client-side after parsing so the contract is deterministic.
- **Toggle complete is an update.** No separate endpoint — `PUT /api/tasks/{uid}` with
  `completed=true|false` performs the status transition. The UI checkbox calls `updateTask`.
- **Validation/degradation = the calendar contract.** Blank title → `400`; unknown uid → `404`;
  client failure/unconfigured → `502`.
- **SSR-BFF symmetry.** `lib/server` gets `loadTasks` (pure) + `getTasks` server fn, and
  `createTask`/`updateTask`/`deleteTask` POST server fns that forward the cookie; the `/tasks` page
  and `tasks-open` tile mirror the calendar route/tile. core-api stays internal; `[Authorize]` is
  the real boundary.

## Risks / Trade-offs

- **VTODO `DUE` is optional and may be a date or datetime** → Mitigation: `TaskIcs` handles both
  (`VALUE=DATE` vs UTC) like `CalendarIcs`; unit-test round-trip with and without `DUE`.
- **Duplication with calendar** (two near-identical CalDAV clients/serializers) → Accepted for now;
  the independent-plugin model favors it. A `libs/caldav` extraction is the documented next step if a
  third CalDAV plugin lands.
- **"Open" filtering semantics** (default hides completed) → Make it explicit and tested; the tile
  counts open tasks so a completed task drops off immediately after toggle + invalidate.
- **Second collection bootstrap** → `MKCALENDAR /pcc/tasks/` on first write; 405/409 both mean
  "exists" (regression-tested), so no manual seeding.
