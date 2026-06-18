# PersonalCommandCenter — Setup & Endpoints

PCC's `docker-compose.yml` is the **leading/canonical infra stack** for the dev box. The app itself
(the SSR shell + plugin host) sits behind Keycloak login; the base-infra services are raw shared
infrastructure other projects on the box can call directly.

## Bring it up

```bash
# Whole stack (build the app images on first run)
docker compose up -d --build

# Just the shared base infra (no app build) — SearXNG is shared across all your projects too
docker compose up -d proxy ollama qdrant redis portainer wakapi searxng
```

Traefik (the `proxy` service) is the **only** published HTTP port (`:80`). It routes
`*.pcc.localhost` to the services below via the file provider (`harness/traefik/dynamic.yml`).

## Access model

**Router-based, no per-service host ports.** Every HTTP service is reached through Traefik at its
`*.pcc.localhost` hostname. **Redis is the only exception** — it is TCP, published on `localhost:6379`.

## Public routes (`*.pcc.localhost` via Traefik)

| Host                      | Service        | Upstream              |
| ------------------------- | -------------- | --------------------- |
| `app.pcc.localhost`       | Web app (BFF)  | `web:3000`            |
| `keycloak.pcc.localhost`  | Keycloak       | `keycloak:8080`       |
| `ollama.pcc.localhost`    | Ollama (GPU)   | `ollama:11434`        |
| `qdrant.pcc.localhost`    | Qdrant (REST)  | `qdrant:6333`         |
| `portainer.pcc.localhost` | Portainer      | `portainer:9000`      |
| `pgadmin.pcc.localhost`   | pgAdmin        | `pgadmin:80`          |
| `grafana.pcc.localhost`   | Grafana        | `grafana:3000`        |
| `prometheus.pcc.localhost`| Prometheus     | `prometheus:9090`     |
| `tempo.pcc.localhost`     | Tempo (traces) | `tempo:3200`          |
| `wakapi.pcc.localhost`    | Wakapi         | `wakapi:3000`         |
| `searxng.pcc.localhost`   | SearXNG        | `searxng:8080`        |
| `ntfy.pcc.localhost`      | ntfy           | `ntfy:80`             |
| `ha.pcc.localhost`        | Home Assistant | `home-assistant:8123` |

The web app is behind Keycloak login (the only public app surface); the rest are raw infra, reached
directly (not gated by the app login).

## Internal-only services

| Service  | Address          | Purpose                                           |
| -------- | ---------------- | ------------------------------------------------- |
| core-api | `core-api:8080`  | FastEndpoints host (SSR-BFF); Scalar at `/scalar` |
| Postgres | `postgres:5432`  | core-api DB + session store                       |
| Redis    | `localhost:6379` | Cache/KV — the one host TCP port (not routed)     |
| Radicale | `radicale:5232`  | CalDAV for calendar + tasks plugins               |

## Hostname resolution

Browsers auto-resolve `*.localhost` -> `127.0.0.1`. **Non-browser clients** (CLIs, other projects,
the WakaTime agent) need `*.pcc.localhost` to resolve too:

- systemd-resolved resolves `*.localhost` out of the box.
- Otherwise add an `/etc/hosts` entry:
  `127.0.0.1  app.pcc.localhost ollama.pcc.localhost qdrant.pcc.localhost wakapi.pcc.localhost portainer.pcc.localhost`
- Or use a Host header: `curl -H "Host: ollama.pcc.localhost" http://127.0.0.1/...`

## Service notes

### Ollama (GPU)

Runs with an all-GPUs reservation (host: NVIDIA RTX 5070 Laptop, WSL2 GPU paravirt). If GPU
passthrough fails on a host, drop the `deploy.resources.reservations.devices` block to fall back to
CPU. Pull a model once: `docker compose exec ollama ollama pull <model>`.

### Wakapi (send heartbeats from VS Code)

1. Open `http://wakapi.pcc.localhost` (browser), create an account, copy your **API key**.
2. In the VS Code WakaTime extension (or `~/.wakatime.cfg`):

   ```ini
   [settings]
   api_url = http://localhost:3030/api
   api_key = <your-wakapi-api-key>
   ```

   Use **`localhost:3030`**, not the `*.pcc.localhost` route: the WakaTime CLI (Go) doesn't resolve
   `*.pcc.localhost` in WSL, so Wakapi is also published on host port `3030` for the agent. The browser
   UI still works at `wakapi.pcc.localhost`.

3. Code for a bit; heartbeats appear on the Wakapi dashboard.
4. For the **Coding plugin** (PCC's `/coding` tile + page), put that same Wakapi API key in your
   `.env` as `WAKAPI_API_KEY=...`. core-api reads Wakapi server-to-server at `http://wakapi:3000`;
   without the key the Coding tile degrades (`api/coding → 502`).

### Redis / Qdrant from other projects

- Redis: connect to `localhost:6379` (e.g. `redis://localhost:6379`).
- Qdrant: point clients at `http://qdrant.pcc.localhost` (REST). gRPC needs a TCP route or host port
  (not configured by default).

### Observability (traces + metrics)

OpenTelemetry stack in the hub: apps send **OTLP** to the collector, which fans out traces → Tempo and
metrics → Prometheus; **Grafana** (`grafana.pcc.localhost`, login `admin` / `GRAFANA_ADMIN_PASSWORD`)
reads both (datasources pre-provisioned). cAdvisor + node-exporter give per-container + host metrics.

- **Send telemetry from another project** → point its OTLP exporter at `http://localhost:4317` (gRPC)
  or `http://localhost:4318` (HTTP). PCC's collector is the shared, canonical one.
- **core-api** is instrumented (ASP.NET + HttpClient + runtime) and exports to `otel-collector:4317`
  (`OTEL_EXPORTER_OTLP_ENDPOINT`); its request traces show up in Tempo via Grafana.
- **Dashboards**: datasources are provisioned; import community boards in Grafana by ID — e.g.
  **1860** (Node Exporter), **14282** (cAdvisor), **19924/19925** (ASP.NET Core / OTel).

## Security posture (dev box)

Base-infra services are **not** behind the app's Keycloak login — they are raw infra for cross-project
use on a single-user dev box. Qdrant/Redis run at dev defaults (no auth); Portainer has its own login.
Do not copy this posture to a shared/remote host without adding auth/TLS/network isolation.
