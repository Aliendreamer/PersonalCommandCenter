## Why

PCC runs a full stack (core-api, web, Postgres, Keycloak, and the base-infra hub) with **no
visibility** into traces, metrics, or container/host health — debugging and capacity questions mean
guessing. Add an OpenTelemetry-based observability stack to the hub, and instrument core-api, so the
whole stack (and the user's other projects) can be observed in Grafana.

## What Changes

- **OpenTelemetry pipeline** in PCC compose:
  - `otel-collector` (`otel/opentelemetry-collector-contrib`): receives OTLP on **host ports `4317`
    (gRPC) / `4318` (HTTP)** so PCC **and other projects** can send telemetry; fans out traces → Tempo,
    metrics → Prometheus; exposes self-metrics. Config in `harness/otel/`.
  - `tempo` (`grafana/tempo`): trace store; routed `tempo.pcc.localhost`; data volume.
  - `prometheus` (`prom/prometheus`): metrics store; scrapes the collector, **cAdvisor**, **node-exporter**,
    and service metrics; routed `prometheus.pcc.localhost`; data volume.
  - `grafana` (`grafana/grafana`): routed `grafana.pcc.localhost`; **provisioned** datasources
    (Prometheus + Tempo) + starter dashboards; admin password from `config.conf`; data volume.
  - `cadvisor` + `node-exporter`: per-container + host metrics (the "observe the containers" part),
    scraped by Prometheus; internal.
- **core-api instrumentation**: add OpenTelemetry (ASP.NET Core + HttpClient + runtime metrics),
  exporting OTLP traces + metrics to `otel-collector:4317` (service name `core-api`).
- **Routing**: Grafana/Prometheus/Tempo via Traefik routes; OTLP via host ports (cross-project), the
  way Redis is the TCP exception. Not behind the app's Keycloak login (raw infra; Grafana has its own).
- **Secrets in `config.conf`**: this change also sets up the git-crypt-encrypted `config.conf` as the
  one home for dev secrets (Grafana admin pw + the existing postgres/keycloak/pgadmin/wakapi/caldav/HA
  values), sourced by `docker compose --env-file config.conf`. The `${VAR:-default}` fallbacks stay so
  the stack still boots without the key.

## Capabilities

### New Capabilities

- `observability`: an OpenTelemetry traces+metrics stack (collector → Tempo/Prometheus → Grafana) in
  the hub, with container/host metrics (cAdvisor + node-exporter), cross-project OTLP ingest, and
  core-api instrumented to export OTLP.

### Modified Capabilities

- `base-infra`: the shared hub gains routable Grafana/Prometheus/Tempo + the OTLP collector endpoints.

## Impact

- **Infra**: six new compose services (otel-collector, tempo, prometheus, grafana, cadvisor,
  node-exporter) + data volumes + `harness/{otel,tempo,prometheus,grafana}/` configs + three Traefik
  routes + the OTLP host ports (`4317`/`4318`).
- **Backend**: core-api gains OpenTelemetry packages + startup wiring (`apps/core-api`).
- **Secrets**: all dev secrets (Grafana admin pw + the existing ones) move into a git-crypt
  `config.conf` sourced via `--env-file`; `git-crypt init` is run as part of this change.
- **Docs**: `DOCKER_SETUP.md` (Grafana/Prometheus/Tempo routes + OTLP endpoints) + `CLAUDE.md`.
- **Tests**: core-api OTel wiring unit/integration check; live smoke — Grafana/Prometheus/Tempo serve,
  Prometheus has cAdvisor/node-exporter/collector targets up, and a core-api request produces a trace
  visible in Tempo.

## Non-Goals (v1)

Logs / Loki (deferred), web-SSR (Node) app tracing (follow-up — container metrics still cover it),
Alertmanager / alerting rules, long-term storage/retention tuning, and custom business dashboards
beyond a couple of starters. Securing Grafana/Prometheus beyond dev defaults.
