# Spec: postgres-mcp integration

## Goal

Add `crystaldba/postgres-mcp` as a core-infra MCP server so Claude Code can inspect
schemas, run queries, and analyse performance on the PCC PostgreSQL instance.

## Current state (assessed 2026-07-01)

| Extension | Available | Enabled |
|-----------|-----------|---------|
| `pg_stat_statements` | ✓ (bundled with postgres:17-alpine) | ✗ — not in `shared_preload_libraries`, extension not created |
| `hypopg` | ✗ — not in postgres:17-alpine base image | ✗ |

`shared_preload_libraries` is currently empty. Only `plpgsql` is installed.

## What postgres-mcp needs

- `pg_stat_statements` — for query performance tracking (preloaded + extension created)
- `hypopg` — for hypothetical index analysis (requires package install)

## Approach

### 1. Switch postgres to a custom image

Replace `image: postgres:17-alpine` with a lightweight custom image that:
- Installs the `hypopg` extension package
- Sets `shared_preload_libraries = 'pg_stat_statements'` via `postgresql.conf`

```dockerfile
# harness/postgres/Dockerfile
FROM postgres:17-alpine
RUN apk add --no-cache postgresql17-hypopg
```

And add a `command` override to postgres in compose:
```yaml
command: postgres -c shared_preload_libraries=pg_stat_statements
```

### 2. Init script for extensions

Add an init SQL script mounted into `/docker-entrypoint-initdb.d/` (only runs on fresh volume):

```sql
-- harness/postgres/init.sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS hypopg;
```

For existing volumes (already initialised), run a one-shot service (like `keycloak-db-init`)
that creates the extensions idempotently on startup.

### 3. Add postgres-mcp to docker-compose

```yaml
postgres-mcp:
  image: crystaldba/postgres-mcp:latest
  environment:
    DATABASE_URI: postgresql://pcc:${POSTGRES_PASSWORD:-pcc-dev}@postgres:5432/pcc
  depends_on:
    postgres:
      condition: service_healthy
  restart: unless-stopped
```

The MCP server exposes a stdio transport — Claude Code connects via docker exec or a
TCP/stdio bridge. Check crystaldba docs for the exact transport flag.

### 4. Wire into .mcp.json

Add an entry to `.mcp.json` (gitignored — contains the connection string):

```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": ["exec", "-i", "personalcommandcenter-postgres-mcp-1",
               "postgres-mcp", "--database-uri", "postgresql://pcc:<password>@postgres:5432/pcc"]
    }
  }
}
```

Or use the `DATABASE_URI` env var approach if the image supports it.

## Non-goals

- Enabling write access beyond what the PCC app user can already do
- Exposing postgres-mcp via Traefik (internal tool only)
- Keycloak database introspection (separate DB, separate concern)

## Risk

`shared_preload_libraries` change requires a postgres restart. On a live stack this
drops connections briefly. Plan: do it during a maintenance window or fresh `docker compose up`.

Switching from `postgres:17-alpine` to a custom image with `hypopg` is low-risk —
the data volume is preserved. The `apk add postgresql17-hypopg` package name needs
verification against the Alpine/apk repo for postgres 17.

## Success criteria

- `SELECT * FROM pg_stat_statements LIMIT 1;` returns rows (not an error)
- `SELECT hypopg_reset();` returns without error
- Claude Code can call postgres-mcp tools (list tables, explain query, etc.)
