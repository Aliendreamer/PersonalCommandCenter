## Why

PCC's compose already hosts shared services the user's other local projects could use (Keycloak,
Postgres, SearXNG). The user wants PCC to be the **canonical local-infra hub**: a routable base stack
of containers — Ollama, Qdrant, Redis, Portainer — that any project on the box can call by hostname,
not internal-only services tied to one PCC plugin.

## What Changes

- **Add Ollama to PCC compose** (`ollama/ollama`; persistent model volume) with **GPU access** via the
  Docker `nvidia` runtime + an all-GPUs device reservation (host: NVIDIA RTX 5070 Laptop, `nvidia`
  runtime available, WSL2 GPU paravirt). Reached via the **`ollama.pcc.localhost`** route (no host
  port); in-compose `ollama:11434`.
- **Add Qdrant to PCC compose** (`qdrant/qdrant`; persistent volume). Reached via the
  **`qdrant.pcc.localhost`** route (REST; no host port; gRPC `6334` in-compose only); in-compose
  `qdrant:6333`.
- **Add Redis to PCC compose** (`redis`; persistent volume). Redis is **TCP** and can't ride the HTTP
  router, so it is the **one host-port exception** — published on `6379` (prior host Redis stopped;
  other projects connect to `localhost:6379`); in-compose `redis:6379`.
- **Fold the standalone Portainer into PCC compose** (`portainer/portainer-ce`; Docker socket mounted;
  data volume), reached via the **`portainer.pcc.localhost`** route (no host ports) — repoint it from
  `host.docker.internal:9443` to the in-compose service; retire the standalone.
- **Add Wakapi to PCC compose** (`ghcr.io/muety/wakapi`; self-hosted WakaTime-compatible
  coding-activity tracker — projects/languages/editors/time; SQLite volume at dev defaults).
  **Routed at `wakapi.pcc.localhost`** (no host port — avoids the web dev server's 3000); in-compose
  `wakapi:3000`. Editor WakaTime plugins point at the route for dev-activity visibility.
- **Traefik file-provider routes** (`harness/traefik/dynamic.yml`): add `ollama` + `qdrant` + `wakapi`
  HTTP routers/services; update the `portainer` service target. **All HTTP base services are reached
  via the router — no per-service host ports; Redis is the only host port (TCP).**
- **No application-login gate on these services** — they are raw shared infra for cross-project use
  (the PCC *app* stays behind Keycloak; these base services keep their own/no auth at dev defaults).

## Capabilities

### New Capabilities

- `base-infra`: PCC compose hosts a **routable shared base-services stack** (Ollama with GPU, Qdrant,
  Redis, Portainer, Wakapi) reachable cross-project by hostname/port — Ollama/Qdrant/Wakapi via
  Traefik `*.pcc.localhost` HTTP routes, Redis via host TCP port, Portainer folded into compose — with
  persistent volumes and (for Ollama) GPU passthrough.

### Modified Capabilities

<!-- None — additive infra; no existing spec's REQUIREMENTS change. -->

## Impact

- **Infra**: five compose services (4 new — Ollama, Qdrant, Redis, Wakapi; 1 folded-in — Portainer) +
  volumes (`ollama-data`, `qdrant-data`, `redis-data`, `portainer-data`, `wakapi-data`); three new
  Traefik routes (ollama/qdrant/wakapi) + one repointed (portainer); the `nvidia` runtime + a GPU
  device reservation on Ollama; **HTTP services reached via `*.pcc.localhost` routes (no host ports)**;
  **Redis is the only published host port (`6379`, TCP)**.
- **Consumers**: the user's other local projects + editors reach PCC via `*.pcc.localhost`
  (e.g. VS Code WakaTime → `http://wakapi.pcc.localhost/api`) and Redis on `localhost:6379`; within PCC, the upcoming `models` plugin reads Ollama (`ollama:11434`) and a
  later `notes` plugin would use Qdrant.
- **Tests**: a live smoke check that each routed service answers (e.g. `ollama.pcc.localhost/api/version`
  → `200`, `qdrant.pcc.localhost/` → `200`, `redis-cli ping` → `PONG`, Portainer route serves).
  No .NET/TS code changes in this change.

## Non-Goals

Production hardening (TLS, real auth/API keys, network isolation, resource limits) — dev defaults
only. No PCC plugin code (the `models`/`notes` plugins are separate changes). No backups/replication.
No non-NVIDIA GPU support.
