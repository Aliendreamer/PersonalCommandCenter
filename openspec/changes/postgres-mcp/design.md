# Design: postgres-mcp integration

## Custom postgres image

`harness/postgres/Dockerfile` builds **hypopg from source** against the image's own
`pg_config`. The obvious `apk add postgresql-hypopg` does NOT work: the Alpine package
installs under `/usr/lib/postgresql18` + `/usr/share/postgresql18`, but the docker-library
image is a from-source build in `/usr/local` that never reads those paths
(`CREATE EXTENSION hypopg` → "extension is not available").

`docker-compose.yml` postgres service changes:
- Replace `image: postgres:18-alpine` with `build: harness/postgres`
- Add `command: postgres -c shared_preload_libraries=pg_stat_statements`
- Volume mount moved to `/var/lib/postgresql` (pg18 image layout; data in `18/docker/`).
  The 17→18 volume migration was dump/restore: `pg_dumpall` via a temp pg17 container,
  volume recreated, restored (4 DBs: pcc, keycloak, dnd, medassist).

## Extension init (existing volumes)

A one-shot service (like `keycloak-db-init`) runs after postgres is healthy and creates
both extensions idempotently:

```yaml
postgres-ext-init:
  image: postgres:18-alpine
  command: psql -h postgres -U pcc -d pcc
           -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements"
           -c "CREATE EXTENSION IF NOT EXISTS hypopg"
  environment:
    PGPASSWORD: ${POSTGRES_PASSWORD:-pcc-dev}
  depends_on:
    postgres:
      condition: service_healthy
  restart: 'no'
```

## postgres-mcp service

```yaml
postgres-mcp:
  image: crystaldba/postgres-mcp:latest
  stdin_open: true
  environment:
    DATABASE_URI: postgresql://pcc:${POSTGRES_PASSWORD:-pcc-dev}@postgres:5432/pcc
  depends_on:
    postgres-ext-init:
      condition: service_completed_successfully
  restart: unless-stopped
```

postgres-mcp uses stdio transport — Claude Code connects via `docker exec -i`.

## Image verification (done 2026-07-02)

- Entrypoint: `/app/docker-entrypoint.sh postgres-mcp` (script remaps `localhost` in
  `DATABASE_URI`, then execs the args). `Cmd` is null; exposes 8000/tcp (SSE, unused here).
- Binary: `postgres-mcp` at `/app/.venv/bin/postgres-mcp`, which is first on the image's
  `PATH` — so `docker exec` finds it without the entrypoint script.
- CLI: `postgres-mcp [database_url] [--access-mode {unrestricted,restricted}]
  [--transport {stdio,sse}]`; transport defaults to **stdio**; with no positional URL it
  reads the `DATABASE_URI` env var (set on the compose service, inherited by `docker exec`).

## .mcp.json wiring

User adds to `.mcp.json` (gitignored). No args needed — `docker exec` inherits the
container's `DATABASE_URI`; add `--access-mode=restricted` for read-only:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": ["exec", "-i", "personalcommandcenter-postgres-mcp-1", "postgres-mcp"]
    }
  }
}
```
