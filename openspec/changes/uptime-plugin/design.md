## Context

A read-only plugin in the `iot`/`search` mold, but instead of one upstream it pings **several
configured targets** and reports each independently — so the contract is a list of per-target results,
and a down target is normal data (not a `502`).

## Goals / Non-Goals

**Goals:** HTTP-ping configured targets (timeout-bounded), report up/down + latency, an `/uptime`
page + `uptime-status` tile.

**Non-Goals:** Docker-socket container health (follow-up), history/SLA, transition alerting (the
`notifications` producer follow-up), TCP/ICMP, UI target editing.

## Decisions

- **HTTP health checks (v1), not the Docker socket.** Pinging configured URLs is self-contained and
  needs no extra privileges; reading `/var/run/docker.sock` (mount + access) is a deferred follow-up.
- **`HttpUptimeClient : IUptimeClient`** over a named `HttpClient` + `UptimeOptions{Targets[],
  TimeoutSeconds=5}`. `CheckAllAsync()` pings every target **concurrently** with a per-check
  `CancellationToken`/timeout; each result is `{ Name, Url, Up, StatusCode?, LatencyMs }`. `Up` =
  response status `< 400`; a thrown `HttpRequestException`/`TaskCanceledException` (timeout) → `Up:
  false` with no status. A `Stopwatch` captures latency. Abstracted for lazy `Resolve<T>()` + fakes.
- **Per-target failure is data, not error.** The endpoint returns `200` with the list as long as
  targets are configured. **Unconfigured (empty targets) → `502`** (nothing to report = degraded).
- **Web mirrors `search`/`iot`**: a `getUptime` loader server fn feeds the `/uptime` route +
  `uptime-status` tile (presentational).

## Risks / Trade-offs

- **A GET ping isn't a true health endpoint** (some targets 405 a GET or need a specific path) →
  targets carry the full URL (point at a real health path); `< 400` counts as up. Good enough for v1;
  a per-target method/expected-status is a follow-up.
- **Slow targets** → a per-check timeout (`TimeoutSeconds`) bounds the worst case; concurrent checks
  keep total latency ≈ the slowest single check.
- **Self-pinging** (targets pointing at PCC services) is the intended dogfood and is safe (internal
  GETs); the E2E points at a known-up target.
