## 1. Secrets — git-crypt config.conf

- [x] 1.1 `git-crypt init` (installed at `/usr/bin/git-crypt`); export the key out-of-band, never
      commit it. `.gitattributes` already filters `config.conf`.
- [x] 1.2 Create `config.conf` (KEY=VALUE) with the dev secrets — including `GRAFANA_ADMIN_PASSWORD`
      and the existing ones (`POSTGRES_PASSWORD`, `KEYCLOAK_CLIENT_SECRET`, `PGADMIN_PASSWORD`,
      `WAKAPI_PASSWORD_SALT`, `CALDAV_*`, `HA_TOKEN`). Keep every `${VAR:-default}` fallback in compose.
- [x] 1.3 Source it via `docker compose --env-file config.conf …` (document in `DOCKER_SETUP.md`).
      Before committing, verify `git-crypt status config.conf` reports **encrypted** (guard against a
      plaintext-secret commit).

## 2. Collector + backends (compose + configs)

- [x] 2.1 `harness/otel/config.yaml`: OTLP receivers (gRPC 4317 / HTTP 4318), batch processor,
      exporters — traces → Tempo (OTLP), metrics → a Prometheus endpoint the collector exposes;
      enable self-metrics.
- [x] 2.2 `harness/tempo/tempo.yaml`: local trace storage; OTLP ingest from the collector.
- [x] 2.3 `harness/prometheus/prometheus.yml`: scrape the collector, `cadvisor`, `node-exporter`, and
      core-api's metrics path.
- [x] 2.4 Add compose services: `otel-collector` (publish host `4317:4317` + `4318:4318`), `tempo`,
      `prometheus`, `grafana`, `cadvisor` (docker socket + host fs read-only), `node-exporter`. Data
      volumes for tempo/prometheus/grafana. Router-only for the UIs.

## 3. Traefik routes

- [x] 3.1 In `harness/traefik/dynamic.yml` add `grafana` → `grafana:3000`, `prometheus` →
      `prometheus:9090`, `tempo` → `tempo:3200` routers/services.

## 4. Grafana provisioning

- [x] 4.1 `harness/grafana/provisioning/datasources/*.yaml`: Prometheus + Tempo datasources (with
      trace↔metric correlation). Admin password from `${GRAFANA_ADMIN_PASSWORD:-...}` (config.conf).
- [ ] 4.2 `harness/grafana/provisioning/dashboards/*` + starter dashboards (host/node, containers/
      cAdvisor, ASP.NET) pinned by JSON or community IDs.

## 5. core-api instrumentation (use the dotnet OTel skill)

- [ ] 5.1 Add OpenTelemetry packages to `apps/core-api` (Extensions.Hosting, Instrumentation.AspNetCore,
      Instrumentation.Http, Exporter.OpenTelemetryProtocol, runtime metrics). Wire tracing + metrics in
      `Program.cs`: resource `service.name=core-api`, OTLP endpoint
      `${OTEL_EXPORTER_OTLP_ENDPOINT:-http://otel-collector:4317}`; exporter failures non-fatal.
- [ ] 5.2 (test) Integration check that the OTel services are registered and the app still starts +
      serves with the collector absent. Keep warnings-as-errors clean.

## 6. Verify + done gate

- [ ] 6.1 .NET gates: `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`.
- [x] 6.2 `docker compose --env-file config.conf up -d --build` the new services + core-api; live smoke:
      `grafana./prometheus./tempo.pcc.localhost` serve; Prometheus targets (cadvisor/node-exporter/
      collector) `up`; a core-api request yields a `core-api` trace in Tempo (via Grafana); OTLP
      `localhost:4318/v1/traces` accepts a test span.
- [ ] 6.3 Update `DOCKER_SETUP.md` (Grafana/Prometheus/Tempo routes + OTLP `4317/4318` + the
      `--env-file config.conf` flow) and `CLAUDE.md`. Mark complete; ready for `/opsx:archive`.
