## MODIFIED Requirements

### Requirement: Target health checks

The `uptime` plugin SHALL check each configured target (with the configured timeout) and expose
`GET /api/uptime` returning `{ name, url, up, statusCode?, latencyMs }[]`. A target with an HTTP(S) URL
SHALL be HTTP-pinged and is `up` when it responds with a non-error status (`< 400`). A target that
exposes no HTTP endpoint MAY be checked over **TCP** (a connect to its host:port) and is `up` when the
connect succeeds within the timeout (with no `statusCode`). For either kind, a connection failure or
timeout is `up: false`. All targets SHALL be checked concurrently.

#### Scenario: Reports up and down HTTP targets

- **WHEN** two HTTP targets are configured — one responding `200`, one unreachable — and a client
  requests `GET /api/uptime`
- **THEN** the response lists both, the first `up: true` with a `statusCode`/`latencyMs`, the second
  `up: false`

#### Scenario: Reports a TCP-only target

- **WHEN** a TCP-only target is configured and its port is accepting connections
- **THEN** that target is reported `up: true` with a `latencyMs` and no `statusCode`; if the connect is
  refused or times out it is `up: false`

#### Scenario: A down target is not a request error

- **WHEN** a configured target is down
- **THEN** `GET /api/uptime` still responds `200` with that target marked `up: false`
