## Why

A small "are my things up?" status board for the command center — ping a configured set of services
and show up/down + latency. Read-only, no new container; the natural dogfood is pointing it at PCC's
own services.

## What Changes

- New **`uptime` plugin** (`plugins/uptime/uptime.api`, id `uptime`; manifest nav "Uptime",
  `routeBase` `/uptime`, widget `uptime-status`). FastEndpoints `GET /api/uptime`: HTTP-ping each
  configured target (short timeout) and return `{ name, url, up, statusCode?, latencyMs }[]`. An
  `IUptimeClient` + `HttpUptimeClient` (named `HttpClient`); a single down target is **not** an
  error (it reports `up:false`), but an unconfigured target set degrades to `502`. Registered in the
  three compile-time places + Dockerfile; endpoints require auth; lazy `Resolve<T>()`.
- Config `Plugins:Uptime:{Enabled,Targets:[{Name,Url}],TimeoutSeconds}`.
- `@pcc/contracts`: an `UptimeCheck` type + a `getUptime()` client method.
- **Web (SSR-BFF, read-only)**: `lib/server` `loadUptime` + `getUptime` server fn; an `/uptime` route
  (SSR loader) listing each target with an up/down badge + latency; an `uptime-status` dashboard tile
  (X/Y up). No write path.

## Capabilities

### New Capabilities

- `uptime`: read-only service health board — the `api/uptime` endpoint that HTTP-pings configured
  targets and reports up/down + latency, config-driven activation, graceful degradation, and the
  "Uptime" nav/page/`uptime-status` tile.

### Modified Capabilities

<!-- None. -->

## Impact

- **Infra**: no new container — core-api gains `Plugins:Uptime:*` config + a named `HttpClient`
  (short-timeout, for the pings).
- **Backend**: new `plugins/uptime/uptime.api` project + 3 registration points + Dockerfile copy.
- **Contracts/Web**: `@pcc/contracts` gains `UptimeCheck`; new `_authenticated/uptime` route, a tile,
  and a server function.
- **Tests**: ping/aggregate unit tests (up/down/timeout via a stub handler), `api/uptime` integration
  tests, contracts client tests, web loader/tile tests, and a live E2E (point at a known target).

## Non-Goals (v1)

Reading the **Docker** socket for container health (a follow-up — it needs the socket mounted and is
more invasive than HTTP pings), historical uptime/SLA tracking, alerting on transitions (that's the
`notifications` producer follow-up), TCP/ICMP checks, and editing targets from the UI (config only).
