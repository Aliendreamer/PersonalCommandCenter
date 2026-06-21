# uptime Specification

## Purpose
TBD - created by archiving change uptime-plugin. Update Purpose after archive.
## Requirements
### Requirement: Target health checks

The `uptime` plugin SHALL check each configured target (with the configured timeout) and expose
`GET /api/uptime` returning `{ name, url, up, statusCode?, latencyMs }[]`. A target with an HTTP(S) URL
SHALL be HTTP-pinged and is `up` when it responds with a non-error status (`< 400`). A target that
exposes no HTTP endpoint MAY be checked over **TCP** (a connect to its host:port) and is `up` when the
connect succeeds within the timeout (with no `statusCode`). For either kind, a connection failure or
timeout is `up: false`. All targets SHALL be checked concurrently.

#### Scenario: Reports up and down HTTP targets

- **WHEN** two HTTP targets are configured — one responding `200`, one unreachable — and a client requests
  `GET /api/uptime`
- **THEN** the response lists both, the first `up: true` with a `statusCode`/`latencyMs`, the second
  `up: false`

#### Scenario: Reports a TCP-only target

- **WHEN** a TCP-only target is configured and its port is accepting connections
- **THEN** that target is reported `up: true` with a `latencyMs` and no `statusCode`; if the connect is
  refused or times out it is `up: false`

#### Scenario: A down target is not a request error

- **WHEN** a configured target is down
- **THEN** `GET /api/uptime` still responds `200` with that target marked `up: false`

### Requirement: Config-driven activation

The `uptime` plugin SHALL activate only when `Plugins:Uptime:Enabled` is `true`, and SHALL appear in
`/api/plugins` with an "Uptime" nav entry and `uptime-status` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Uptime:Enabled = false`
- **THEN** `GET /api/uptime` is not served and `uptime` is absent from `/api/plugins`

### Requirement: Graceful degradation

When no targets are configured, the `uptime` plugin SHALL respond with `502`, and the UI SHALL show a
degraded state without breaking the dashboard.

#### Scenario: No targets configured

- **WHEN** no targets are configured
- **THEN** `GET /api/uptime` responds with `502` and the Uptime tile/page show a degraded state

### Requirement: Uptime UI surfaces (read-only via the SSR-BFF)

The `uptime` plugin SHALL contribute an "Uptime" nav entry, an `/uptime` page server-rendered with
each target's up/down badge + latency, and an `uptime-status` dashboard tile showing how many targets
are up (e.g. "3/4 up"). Reads SHALL go through the SSR server — the browser SHALL NOT call core-api
directly.

#### Scenario: Uptime page is server-rendered

- **WHEN** the `/uptime` page is requested with checks available
- **THEN** the server-rendered HTML already lists the targets with their status

#### Scenario: Status tile shows the up count

- **WHEN** the dashboard renders with the `uptime` plugin enabled and checks available
- **THEN** the `uptime-status` tile shows the up/total count, degrading to a "Uptime unavailable"
  state on error

