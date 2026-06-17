## Context

PCC already proves the "self-host a service in compose, route it via the Traefik file provider" mold
(SearXNG, ntfy, Keycloak). This change generalizes that into a **shared local-infra hub**: a small
set of base containers callable from any project on the dev box, not just from PCC. Traefik routing is
file-provider only (`harness/traefik/dynamic.yml`) — the docker-label provider can't negotiate with
this daemon. The dev host has an NVIDIA RTX 5070 Laptop GPU with the Docker `nvidia` runtime available
and WSL2 GPU paravirt, so Ollama can run GPU-accelerated.

## Goals / Non-Goals

**Goals:** host Ollama (GPU), Qdrant, Redis, and Portainer in PCC compose with persistent volumes;
route the HTTP services at `*.pcc.localhost` (no per-service host ports — access is via the router);
Redis (TCP) is the one host-port exception. PCC compose is the leading/canonical infra.

**Non-Goals:** production hardening (TLS/auth/API keys/limits), plugin code, backups, non-NVIDIA GPUs.

## Decisions

- **Router-based access, no per-service host ports.** The user's need is to reach the services by
  hostname (VS Code WakaTime sends heartbeats to `http://wakapi.pcc.localhost/api`; other projects call
  `ollama.`/`qdrant.pcc.localhost`). So HTTP services (Ollama/Qdrant/Wakapi/Portainer) are reached
  **only** through Traefik at `*.pcc.localhost` — no host ports published. **Redis is the sole
  exception** (TCP can't ride the HTTP `:80` entrypoint) → published on host `6379`. *(Earlier
  iterations — internal-only Qdrant, Redis on 6380, then standard host ports per service — are all
  superseded; the user prefers router-only access: fewer bound host ports, no `3000` clash with the
  web dev server.)* **Caveat:** non-browser clients must resolve `*.pcc.localhost` → `127.0.0.1`
  (systemd-resolved handles `*.localhost`; otherwise `/etc/hosts` / dnsmasq) for the routes to work
  outside a browser.

- **GPU via the `nvidia` runtime + device reservation on Ollama**
  (`deploy.resources.reservations.devices: [{ driver: nvidia, count: all, capabilities: [gpu] }]`),
  with a persistent `ollama-data` model volume. core-api never touches the GPU; only Ollama (and, in
  the `models-plugin` change, a GPU exporter) do. *(Alternative — CPU-only Ollama — rejected: the
  point is GPU-accelerated local inference.)*

- **Portainer folded into compose** (`portainer/portainer-ce`, `/var/run/docker.sock` mounted,
  `portainer-data` volume) and the existing `portainer.pcc.localhost` file-provider route repointed
  from `host.docker.internal:9443` (the old standalone, HTTPS w/ insecure transport) to the in-compose
  `portainer:9000` (HTTP). Removes the host-gateway dependency and the `insecure` serversTransport.

- **No app-login gate.** These are raw infra for cross-project use; the PCC *app* stays behind
  Keycloak, but Ollama/Qdrant/Redis/Portainer are reached directly (Portainer has its own login;
  Qdrant/Redis run at dev defaults — no API key/password in v1). This is an explicit dev-box posture,
  flagged as a non-goal to harden later.

- **Additive only.** New services + volumes + routes; no existing service definition changes except
  the Portainer route target. Disabling/removing any service is a clean rollback.

## Risks / Trade-offs

- **Unauthenticated infra exposed on the dev box** (Qdrant/Redis open, Ollama has no auth) → acceptable
  for a single-user local hub on `*.pcc.localhost` / `localhost`; hardening (API keys, Redis password,
  TLS) is an explicit deferred non-goal. Do not copy this posture to a shared/remote host.

- **WSL2 GPU passthrough is version-coupled** (driver/runtime) → if the `nvidia` reservation fails to
  start Ollama, fall back to CPU (drop the reservation) — Ollama still serves, just slower; nothing
  else in the stack depends on the GPU.

- **Portainer socket mount grants broad control** of the Docker daemon → same trust level as running
  compose locally; acceptable on the dev box, noted for any non-local deployment.

- **Image/volume size** (Ollama + pulled models are GBs; Qdrant/Redis small) → persistent named
  volumes keep them across rebuilds; first `up` is a large pull.

## Migration Plan

Bring up the new services with `docker compose up -d`. The Portainer cutover: add the compose service,
repoint the route, then the old standalone Portainer (host `:9443`) can be retired. Rollback = remove
the added services/routes and restore the Portainer route target. No data migration (new volumes).

## Open Questions

- Whether to add minimal auth now (Qdrant API key / Redis `requirepass`) or keep dev-open — current
  decision: dev-open, harden later. Pinned image tags (e.g. `qdrant/qdrant:latest`, `redis:7-alpine`,
  `ollama/ollama:latest`, `portainer/portainer-ce:lts`) finalized during implementation.
