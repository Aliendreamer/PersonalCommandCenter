# Audit follow-ups (2026-06-21)

Implemented 2026-06-21, TDD, all gates green (.NET build/test/format · pnpm typecheck/lint/test/build/
format:check · `docker compose config`). `[x]` done, `[~]` deferred (rationale in the Deferred section).

## 1. Backend correctness (high) — DONE

- [x] 1.1 Plugin endpoints no longer swallow cancellation: `catch (Exception) when (!ct.IsCancellationRequested)`
  in `CalendarPlugin` (×4), `UptimePlugin`, `GoodreadsPlugin`, `CodingPlugin` — a client-cancel propagates;
  only a real upstream failure (incl. an HttpClient timeout, where `ct` did not fire) degrades to 502.
- [x] 1.2 `HttpUptimeClient` guards `Uri.TryCreate` + `port > 0` → a malformed/scheme-less/portless target
  is reported that-target-`down`, never a whole-board 502. (test: malformed URL among valid targets)
- [x] 1.3 `CodingClient.TodaySeconds` = the latest day only when it is actually today (UTC); 0 otherwise.
  (tests: zero-when-today-absent, reflects-today-when-present)
- [x] 1.4 `GoodreadsClient` wraps `UserId` in `Uri.EscapeDataString`. (test: escapes the user id)
- [x] 1.5 `CalendarIcs` parses dates with `TryParseExact` and skips an event with an unparseable
  `DTSTART`/`DTEND` instead of throwing the whole listing. (test: skips bad event, keeps the good one)
- [x] 1.6 `CalDavClient` parses the collection URI once in the ctor (fail-fast on a malformed BaseUrl).

## 2. Auth / security hardening — partial

- [x] 2.1 `SessionService` serializes token refresh per session (process-wide keyed `SemaphoreSlim` +
  re-read/double-check inside the gate) so concurrent SSR fetches don't each spend the single-use refresh
  token. (test: concurrent resolve refreshes only once)
- [~] 2.2 JWT audience — **deferred** (documented in `Program.cs`): the realm has no audience mapper, so
  tokens carry `aud="account"`; enabling `ValidateAudience` first needs that mapper added to the realm +
  live verification, else login breaks. Code now explains the deliberate `ValidateAudience = false`.
- [~] 2.3 Encrypt access/refresh tokens at rest — **deferred**: needs a persisted DataProtection keyring
  (an ephemeral container keyring would invalidate every session on restart). Tracked for a follow-up.
- [x] 2.4 `PurgeAsync` also reaps sessions with a null `RefreshTokenExpiresAt` + expired access token.
  (test: purge removes the no-refresh orphan)
- [x] 2.5 Outbound scheme guard (`http`/`https` only) on operator-controlled URLs: `NtfyClient`
  (no-op on a bad scheme) and `GoodreadsClient` (throws → 502). (tests: ntfy skip, goodreads throws)
- [~] 2.6 HMAC the OIDC `state` + forward the request body in `auth-proxy.ts` — **deferred** (optional;
  latent — `state` is nonce-bound + `returnTo` sanitized, and auth uses only GET today).

## 3. Frontend correctness — DONE

- [x] 3.1 `calendar.tsx` binds the viewed month to a `validateSearch`/`loaderDeps` search param so year/
  month navigation refetches the visible month (no more silently-empty event dots outside a fixed window).
- [x] 3.2 `calendar-event-form.tsx` validates `end > start` via `useForm` before submit. (test added)
- [x] 3.3 `calendar-event-list.tsx` keys day sections by `toDateString()` (the group key), not the ISO start.
- [x] 3.4 `theme.ts` `parseThemeCookie` no-cookie default aligned to `dark` (matches the inline script).
- [x] 3.5 `calendar-event-form`/`task-form`/`theme-toggle`/`system-tile` tests use the shared
  `src/test/render.tsx` wrapper (with an optional `mantineProps` pass-through).

## 4. Infra hygiene — DONE

- [x] 4.1 Pinned all 13 `:latest` images + home-assistant `:stable` to registry-verified tags.
- [x] 4.2 wakapi host port → `127.0.0.1:3030:3000` (loopback-only).
- [x] 4.3 otel-collector `4317`/`4318` → `127.0.0.1` bind.
- [x] 4.4 Removed dead Traefik docker labels (keycloak/home-assistant/web) + fixed the "docker provider" comment.
- [x] 4.5 `.env.example` gains `GRAFANA_ADMIN_PASSWORD`/`PGADMIN_PASSWORD`/`WAKAPI_PASSWORD_SALT` + a
  radicale-password note.

## 5. Agent config

- [~] 5.1 `enableAllProjectMcpServers: true` → `false` — **blocked**: the harness denies agent edits to its
  own `.claude/settings.json`. One-line manual change (or `/update-config`). Latent only (no `.mcp.json` today).

## 6. Housekeeping — DONE

- [x] 6.1 Stray `tests/e2e/openspec/` dir deleted (by the user).

## 7. Test coverage

- [x] 7.1 `CalendarIcsTests` — malformed event skipped.
- [x] 7.2 `HttpUptimeClientTests` — malformed URL → down without failing the board.
- [x] 7.3 `CodingClientTests` — today-absent → 0, today-present → today's seconds.
- [x] 7.5 `GoodreadsClientTests` — error status (403) throws → 502; UserId escaped; non-http BaseUrl throws.
- [x] 7.x `NtfyClientTests` — non-http base URL is a no-op; http posts to the topic.
- [~] 7.4 generator cross-assembly path, 7.6 search missing-`q`, 7.7 CalDav HEAD non-2xx, 7.8 notification
  DB isolation, `PluginRegistrationCoverageTests` stable-anchor — **deferred** (pure test-gap hardening).

## Deferred follow-ups (carry-over)

2.2 (audience mapper + enablement), 2.3 (token-at-rest encryption), 2.6 (state HMAC / proxy body),
5.1 (settings.json — user/`/update-config`), and the 7.x test-gap remainder. None are correctness bugs;
each needs either live verification, a larger design, or harness access this agent lacks.
