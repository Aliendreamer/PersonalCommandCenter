## ADDED Requirements

### Requirement: Endpoints degrade only on genuine upstream failure

A plugin's read endpoint SHALL respond with `502` only when its upstream is genuinely unreachable,
misconfigured, or returns no usable data. It SHALL NOT turn a **client cancellation** (the browser
aborting the request) into a `502`: an `OperationCanceledException` originating from the request's
cancellation token SHALL propagate as cancellation, not be caught and rewritten as a gateway error.

#### Scenario: Client cancellation is not a gateway error

- **WHEN** the caller aborts an in-flight `GET` to a plugin endpoint (its cancellation token fires)
- **THEN** the request is cancelled rather than completing with a `502` written to the closed connection

#### Scenario: A real upstream failure is a 502

- **WHEN** a plugin's upstream is unreachable or unconfigured
- **THEN** the endpoint responds `502` and the tile/page degrade without breaking the dashboard

### Requirement: A single bad item degrades that item, not the whole response

A plugin that aggregates a set of items SHALL let one malformed or failing item degrade only that item —
the endpoint SHALL still return `200` with the rest. Specifically: a malformed or scheme-less uptime
target URL SHALL be reported as that target `down` (never fail the whole board), and an unparseable
calendar event SHALL be skipped (the listing still returns the parseable events).

#### Scenario: A malformed uptime target is reported down

- **WHEN** one configured uptime target has an invalid/scheme-less URL (or a TCP target with no port)
- **THEN** `GET /api/uptime` still responds `200`, that target is `up: false`, and the others are checked

#### Scenario: A malformed calendar event is skipped

- **WHEN** the CalDAV collection returns one event with an unparseable `DTSTART` (e.g. a `TZID=` form)
- **THEN** `GET /api/calendar/events` still returns the parseable events rather than failing the request

### Requirement: Operator-controlled outbound URLs are scheme-checked

A plugin or host service SHALL verify that an operator-configured base URL uses an `http`/`https`
scheme before making an outbound `HttpClient` call to it (e.g. Goodreads, ntfy), mirroring the
frontend's `safeHref` rule, so a misconfigured/compromised config value cannot redirect a
server-side request to a non-HTTP scheme.

#### Scenario: A non-HTTP base URL is refused

- **WHEN** an operator-controlled base URL is configured with a non-`http(s)` scheme
- **THEN** the outbound call is not made and the feature degrades rather than dereferencing the scheme
