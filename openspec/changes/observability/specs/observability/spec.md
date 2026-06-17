## ADDED Requirements

### Requirement: OTLP ingest (cross-project)

PCC compose SHALL run an OpenTelemetry Collector that accepts OTLP on host ports `4317` (gRPC) and
`4318` (HTTP), so PCC services and the user's other local projects can send traces and metrics to one
shared collector.

#### Scenario: Collector accepts OTLP

- **WHEN** a client sends OTLP to `localhost:4318` (HTTP) or `localhost:4317` (gRPC)
- **THEN** the collector accepts it and forwards traces to Tempo and metrics to Prometheus

### Requirement: Traces in Tempo, metrics in Prometheus

The collector SHALL export traces to Tempo and make metrics available to Prometheus; Prometheus SHALL
additionally scrape container metrics (cAdvisor) and host metrics (node-exporter).

#### Scenario: Container + host targets are up

- **WHEN** the stack is up and Prometheus targets are listed
- **THEN** the cAdvisor, node-exporter, and collector targets report `up`

### Requirement: Grafana over Prometheus + Tempo

PCC compose SHALL run Grafana, routed at `grafana.pcc.localhost`, with provisioned datasources for
Prometheus and Tempo and starter dashboards, so traces and metrics are viewable without manual setup.
Its admin password comes from configuration.

#### Scenario: Grafana serves with datasources

- **WHEN** the stack is up and `http://grafana.pcc.localhost/` is requested
- **THEN** Grafana serves, with Prometheus and Tempo pre-configured as datasources

### Requirement: core-api exports OTLP

core-api SHALL be instrumented with OpenTelemetry (ASP.NET Core + HttpClient + runtime metrics) and
export OTLP traces and metrics to the collector; exporter failures SHALL NOT break the app.

#### Scenario: A request produces a trace

- **WHEN** a request is served by core-api with the collector reachable
- **THEN** a corresponding trace (service `core-api`) is recorded and viewable in Tempo via Grafana

#### Scenario: Collector down does not break core-api

- **WHEN** the collector is unreachable
- **THEN** core-api still serves requests normally (telemetry export fails silently)

### Requirement: Hub services are routable, not behind app login

Grafana, Prometheus, and Tempo SHALL be reachable via their `*.pcc.localhost` routes (no app Keycloak
gate); the OTLP collector endpoints SHALL be reachable on their host ports.

#### Scenario: Grafana reachable without an app session

- **WHEN** a client with no PCC app session opens `grafana.pcc.localhost`
- **THEN** Grafana serves its own login (not redirected to the app login)
