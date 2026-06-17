## Context

The base-infra hub (router-only, `*.pcc.localhost`, no host ports except Redis) is the place to add a
shared observability stack. The user supplied a medassist compose snippet (otel-collector + tempo +
prometheus + grafana with host ports + a private network); this adapts it to PCC's hub conventions and
adds container/host metrics. core-api (.NET 10) has no telemetry yet. Use the
`dotnet-aspnet:configuring-opentelemetry-dotnet` skill for the instrumentation.

## Goals / Non-Goals

**Goals:** traces (Tempo) + metrics (Prometheus, incl. container/host) → Grafana; cross-project OTLP
ingest; core-api exporting OTLP. **Non-Goals:** logs/Loki, web-SSR app tracing, alerting, retention
tuning, hardened auth.

## Decisions

- **Collector-centric pipeline.** Apps export **OTLP → `otel-collector`**, which fans out (traces →
  Tempo via OTLP; metrics → Prometheus, by the collector exposing a Prometheus endpoint that Prometheus
  scrapes, or remote-write). One ingest point decouples apps from backends. *(Alternative — apps write
  straight to Tempo/Prometheus — rejected: couples every app to each backend.)*

- **Router-only UIs, host-port OTLP.** Grafana/Prometheus/Tempo are HTTP → Traefik routes
  (`grafana./prometheus./tempo.pcc.localhost`), **no host ports** (the snippet's `:3000` would clash
  with web/wakapi internally). The **OTLP endpoints need host ports** (`4317` gRPC / `4318` HTTP) so
  other projects can send telemetry — gRPC doesn't ride the HTTP `:80` entrypoint cleanly, so this is a
  host-port exception like Redis.

- **Container + host metrics via cAdvisor + node-exporter.** The snippet observes apps but not
  containers; cAdvisor (mounts the docker socket + host fs read-only) gives per-container CPU/mem/net,
  node-exporter gives host metrics. Prometheus scrapes both + the collector's self-metrics +
  core-api's metrics (through the collector). This is the "observability of the full stack and
  containers" ask.

- **core-api instrumentation (OTel SDK).** Add `OpenTelemetry.Extensions.Hosting`,
  `Instrumentation.AspNetCore`, `Instrumentation.Http`, `Exporter.OpenTelemetryProtocol`, runtime
  metrics; resource `service.name=core-api`; OTLP endpoint `http://otel-collector:4317` (configurable).
  Tracing covers incoming requests + outgoing HttpClient (the plugin upstreams); metrics cover ASP.NET
  + HTTP + .NET runtime. Follow the dotnet OTel skill for exact wiring.

- **Provisioned Grafana.** Datasources (Prometheus + Tempo) and a couple of starter dashboards are
  provisioned from `harness/grafana/provisioning` so Grafana is useful on first boot (no manual setup).
  Admin password from `config.conf` (`GRAFANA_ADMIN_PASSWORD`).

- **Configs in `harness/`.** `harness/otel/config.yaml`, `harness/tempo/tempo.yaml`,
  `harness/prometheus/prometheus.yml`, `harness/grafana/provisioning/**` — mirroring how Radicale/SearXNG
  configs live under `harness/`.

## Risks / Trade-offs

- **WSL2 cAdvisor quirks** (cgroup/fs mounts) → if cAdvisor can't read some host paths, container
  metrics degrade but the rest of the stack is unaffected; mount what WSL2 allows, note gaps.
- **OTLP host ports clashing** with the user's other otel-collector (the snippet used 4317/4318) →
  intended: PCC is now the canonical collector; the user points other projects here (stop duplicates).
- **Metric/trace volume on a laptop** → dev-grade retention (small, in-memory/local volumes); not tuned
  for production.
- **Self-observability loop** (collector scraped by Prometheus, shown in Grafana) is intended and cheap.

## Migration Plan

Additive: new services + configs + routes + OTLP ports + core-api packages. This change also sets up
git-crypt `config.conf` as the secrets home (incl. `GRAFANA_ADMIN_PASSWORD`; the `${VAR:-default}`
fallbacks remain so it boots without the key). Rollback = remove the services + the core-api OTel wiring
(guarded so the app runs with the collector absent — exporter failures are non-fatal).

## Open Questions

- Exact Prometheus↔collector metric path (collector `prometheus` exporter scraped by Prometheus vs
  `remote_write`) — settled during implementation against the running collector.
- Which starter dashboards to provision (likely: a Node/host board, a cAdvisor containers board, an
  ASP.NET board) — pinned by community dashboard IDs during apply.
