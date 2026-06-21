## Why

A whole-repo deep audit (2026-06-21) was run after a burst of un-spec'd direct-to-`main` work
(calendar month-calendar, goodreads modal, uptime-monitor-all, tile styling). All quality gates are
**green** (`dotnet build`/`test`/`format`, `pnpm typecheck`/`lint`/`test`/`build`/`format:check`) and
the BFF security invariants hold (CORS never `*`, `mp_sid` HttpOnly+SameSite, tokens server-side only,
PKCE S256 + nonce-bound state, `RequireHttpsMetadata` derived from scheme). But the audit found a set
of **real correctness bugs, defense-in-depth gaps, and infra-hygiene issues** that the gates don't
catch because they live in untested error paths and config. This change is the remediation backlog.

It also records the **process gap**: the recent calendar/goodreads/uptime/styling work shipped with no
OpenSpec proposal, violating the required workflow. Retroactive specs for that work are tracked
separately (the `calendar-month-calendar`, `goodreads-book-modal`, `uptime-monitor-all`, and
`tile-grid-styling` changes); this proposal is **fixes only**.

## What Changes

Triaged findings (full detail in `tasks.md`). Nothing here is a confirmed exploitable RCE; the
internal-only topology bounds the security items, but each is a one-edit regression risk.

- **Backend correctness (high):** `catch (Exception)` in every plugin endpoint swallows
  `OperationCanceledException`, turning a client-cancel into a 502 written to a closed response; uptime
  `new Uri(target.Url)` throws on a scheme-less/invalid target and 502s the **whole** board instead of
  marking that one target down ("down is data"); coding `TodaySeconds = days[^1]` is yesterday's value
  on any day with no activity yet; goodreads interpolates `UserId` into the URL without
  `Uri.EscapeDataString`; `CalendarIcs.ParseDate` throws on a `TZID`/malformed `DTSTART` so one bad
  event 502s the entire listing.
- **Auth hardening (medium, defense-in-depth):** concurrent token refresh races (two parallel SSR
  fetches both refresh; the single-use refresh token makes the second fail → transient logout);
  `ValidateAudience = false` accepts any realm client's JWT; access/refresh tokens persisted in
  plaintext; `PurgeAsync` never reaps sessions with a null `RefreshTokenExpiresAt`; no `http(s)` scheme
  check on operator-controlled outbound URLs (ntfy, goodreads).
- **Frontend correctness (medium):** the calendar loader fetches a fixed ±3-month window, so year
  navigation silently shows no event dots outside it; the event form never validates `end > start`;
  `CalendarEventList` keys day-sections by `list[0].start` instead of the day; `parseThemeCookie`
  defaults to `system` while the rest of the app defaults to `dark`; 4 component tests bypass the
  mandated shared `src/test/render.tsx` wrapper.
- **Infra hygiene (low/medium, local-only-bounded):** 13 images on `:latest` + home-assistant
  `:stable`; wakapi publishes `:3030` (undocumented host-port exposure); otel-collector binds
  `0.0.0.0`; dead Traefik docker labels + a misleading "docker provider" comment; missing
  `.env.example` entries (Grafana/pgAdmin/wakapi salt); radicale plaintext htpasswd (dev-only).
- **Agent config (low):** `enableAllProjectMcpServers: true` with no `.mcp.json` today — latent
  auto-trust if one is ever added.
- **Test coverage:** add tests for the error paths above (ParseDate TZID, uptime timeout/bad-URL,
  coding zero-days, goodreads 403, search missing-`q`, generator cross-assembly path, notification DB
  isolation) and anchor `PluginRegistrationCoverageTests` on a stable file, not the optional `.slnx`.

## Capabilities

### New Capabilities
<!-- none — this is a remediation/quality change, not a new feature -->

### Modified Capabilities
<!-- none — fixes preserve existing behavior; the only contract-visible change is more graceful
     degradation (per-target down vs whole-board 502) which the specs already imply -->

## Non-goals

- Timezone / TZID / RRULE support in the calendar (an existing documented non-goal of the hand-rolled
  `CalendarIcs`). The audit only asks that malformed/TZID dates **degrade gracefully**, not parse.
- Rewriting the CalDAV REPORT body via `XElement` (the current interpolation is not exploitable because
  FastEndpoints parses the range params to `DateTimeOffset`); tracked as optional defense-in-depth.

## Impact

- **.NET**: plugin endpoint `catch` filters (calendar/uptime/goodreads/coding), `HttpUptimeClient`,
  `CodingClient`, `GoodreadsClient`, `CalendarIcs`, `SessionService`, `Program.cs` JWT options,
  `NtfyClient`.
- **Web**: `routes/_authenticated/calendar.tsx`, `components/calendar-event-form.tsx`,
  `calendar-event-list.tsx`, `lib/theme.ts`, 4 `*.test.tsx` files.
- **Infra**: `docker-compose.yml`, `harness/traefik/dynamic.yml`, `.env.example`, `.claude/settings.json`.
- **Tests**: new cases across `CoreApi.Tests` (see `tasks.md` §7).
