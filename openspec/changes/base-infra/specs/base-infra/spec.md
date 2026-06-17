## ADDED Requirements

### Requirement: Leading compose, accessed via the Traefik router

PCC's `docker-compose.yml` SHALL be the single canonical home for the dev box's base infrastructure
(Ollama, Qdrant, Redis, Portainer, Wakapi). HTTP services SHALL be reached through the Traefik router
at `*.pcc.localhost` with **no per-service host ports published**; other projects point at those
hostnames. Redis (TCP, not HTTP-routable) is the sole exception and SHALL be reachable on a host port.

#### Scenario: HTTP base services reached via the router, no host ports

- **WHEN** another project on the host calls a base service at its `*.pcc.localhost` hostname (e.g.
  `http://ollama.pcc.localhost`, `http://qdrant.pcc.localhost`)
- **THEN** Traefik routes it to PCC's container, and no per-service host port is published for it

### Requirement: Ollama with GPU (via the router)

PCC compose SHALL host an Ollama service with a persistent model volume and GPU access via the Docker
`nvidia` runtime, reachable in-compose as `ollama:11434` and routed at `ollama.pcc.localhost` (no
published host port).

#### Scenario: Ollama answers over its route

- **WHEN** the stack is up and a client requests `http://ollama.pcc.localhost/api/version`
- **THEN** Ollama responds `200` with its version

#### Scenario: Ollama uses the GPU runtime

- **WHEN** the Ollama service is started
- **THEN** it runs with the `nvidia` runtime / GPU device reservation and persists models to a named
  volume across restarts

### Requirement: Qdrant (via the router)

PCC compose SHALL host a Qdrant service with a persistent volume, reachable in-compose as
`qdrant:6333` and routed at `qdrant.pcc.localhost` (REST; no published host port). gRPC (`6334`) is
reachable in-compose only unless a TCP route is added later.

#### Scenario: Qdrant answers over its route

- **WHEN** the stack is up and a client requests `http://qdrant.pcc.localhost/`
- **THEN** Qdrant responds `200`

### Requirement: Redis on a host TCP port (the one port exception)

Redis is a TCP service and cannot ride the HTTP router, so PCC compose SHALL host Redis with a
persistent volume, reachable in-compose as `redis:6379` and published on host TCP port `6379` for
cross-project use.

#### Scenario: Redis answers PING

- **WHEN** the stack is up and a client connects to `localhost:6379` and sends `PING`
- **THEN** Redis replies `PONG`

### Requirement: Portainer folded into compose (via the router)

PCC compose SHALL host Portainer (with the Docker socket mounted and a persistent data volume),
reached via the `portainer.pcc.localhost` Traefik route (no published host ports); the standalone
Portainer is retired.

#### Scenario: Portainer route serves from compose

- **WHEN** the stack is up and a client requests `http://portainer.pcc.localhost/`
- **THEN** the in-compose Portainer serves the response (no host-gateway standalone needed)

### Requirement: Wakapi via the router (coding-activity tracking)

PCC compose SHALL host a Wakapi service (WakaTime-compatible coding-activity tracker) with persistent
storage, reachable in-compose as `wakapi:3000` and routed at `wakapi.pcc.localhost` (no published host
port), so editor WakaTime plugins (pointed at the route) can send heartbeats and the user can view
coding-activity stats.

#### Scenario: Wakapi answers over its route

- **WHEN** the stack is up and a client requests `http://wakapi.pcc.localhost/`
- **THEN** Wakapi serves its web UI / API (`200`)

### Requirement: Shared infra is not behind the app login

The base-infra services SHALL be reachable directly (not gated by the PCC app's Keycloak login), so
the user's other local projects can call them; only the PCC application itself remains behind login.

#### Scenario: Infra reachable without an app session

- **WHEN** a client with no PCC app session calls `ollama.pcc.localhost` / `qdrant.pcc.localhost` /
  `localhost:6379`
- **THEN** the request reaches the service (it is not redirected to the app login)
