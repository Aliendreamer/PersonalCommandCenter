## 1. Compose services (accessed via the router — no host ports except Redis)

- [x] 1.1 Add an **`ollama`** service to `docker-compose.yml` (`ollama/ollama`; `ollama-data:/root/.ollama`)
      with GPU access (`nvidia` runtime + `deploy.resources.reservations.devices` all-GPUs). No host
      port — reached via the route. Internal DNS `ollama:11434`.
- [x] 1.2 Add a **`qdrant`** service (`qdrant/qdrant`; `qdrant-data:/qdrant/storage`). No host port —
      REST via the route; gRPC `6334` in-compose only. Internal DNS `qdrant:6333`.
- [x] 1.3 Add a **`redis`** service (`redis:7-alpine`, `--appendonly yes`; `redis-data:/data`) and
      **publish host port `6379:6379`** (the one exception — TCP can't ride the HTTP router; the prior
      host Redis is stopped). Internal DNS `redis:6379`.
- [x] 1.4 Add a **`portainer`** service (`portainer/portainer-ce:lts`; `/var/run/docker.sock` mounted;
      `portainer-data:/data`). No host port — reached via the route. Internal DNS `portainer:9000`.
- [x] 1.5 Add a **`wakapi`** service (`ghcr.io/muety/wakapi:latest`; SQLite at dev defaults,
      `wakapi-data:/data`; set `WAKAPI_PASSWORD_SALT`, `WAKAPI_LISTEN_IPV4=0.0.0.0`, and
      `WAKAPI_BASE_URL=http://wakapi.pcc.localhost` so generated links + the API base are correct).
      No host port — reached via the `wakapi.pcc.localhost` route. Internal DNS `wakapi:3000`.
- [x] 1.6 Declare the new named volumes (`ollama-data`, `qdrant-data`, `redis-data`, `portainer-data`,
      `wakapi-data`).

## 2. Traefik routes (file provider)

- [x] 2.1 In `harness/traefik/dynamic.yml` add an `ollama` router (`Host(ollama.pcc.localhost)`) +
      service → `http://ollama:11434`.
- [x] 2.2 Add a `qdrant` router (`Host(qdrant.pcc.localhost)`) + service → `http://qdrant:6333`.
- [x] 2.3 Add a `wakapi` router (`Host(wakapi.pcc.localhost)`) + service → `http://wakapi:3000`.
- [x] 2.4 Repoint the existing `portainer` service from `https://host.docker.internal:9443` to
      `http://portainer:9000`; drop the now-unneeded `insecure` serversTransport if nothing else uses it.

## 3. Verify (live smoke)

- [x] 3.1 `docker compose up -d` (with `--build` if needed); confirm all five new/folded services start
      (Ollama may take time to pull the image; GPU reservation honored — if WSL2 GPU passthrough fails,
      note it and fall back to CPU without the reservation).
- [x] 3.2 Smoke-check the routes + Redis port: `curl -H "Host: ollama.pcc.localhost" http://127.0.0.1/api/version`
      → `200`; `-H "Host: qdrant.pcc.localhost"` → `200`; `-H "Host: portainer.pcc.localhost"` and
      `-H "Host: wakapi.pcc.localhost"` each serve; `redis-cli -h localhost -p 6379 ping` → `PONG`.
- [x] 3.3 Confirm a VS Code WakaTime heartbeat reaches Wakapi (set the extension `api_url` to
      `http://wakapi.pcc.localhost/api` + the Wakapi API key; a heartbeat shows in Wakapi's dashboard).
- [x] 3.4 Confirm the existing app/keycloak/searxng/etc. routes still work (no regression in the
      Traefik dynamic config).

## 4. Docs + done gate

- [x] 4.1 Update `CLAUDE.md` (the new base-infra services + routes; the "router-accessed shared hub,
      no host ports except Redis-TCP, not behind app login" posture; the GPU/`nvidia`-runtime note) and
      the stack/layout section. Mark complete; ready for `/opsx:archive`.
