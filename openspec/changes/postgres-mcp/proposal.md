# Proposal: postgres-mcp integration

## Why

Enable `crystaldba/postgres-mcp` as a Claude Code MCP server so AI can inspect schemas,
run queries, and analyse performance on the PCC PostgreSQL instance. Requires
`pg_stat_statements` (query tracking) and `hypopg` (hypothetical index analysis).

## What Changes

- `harness/postgres/Dockerfile` — custom pg18-alpine image with `postgresql-hypopg`
- `docker-compose.yml` — postgres build from harness/postgres, `shared_preload_libraries` flag, one-shot extension-init service, postgres-mcp service
- `.mcp.json` — wire postgres-mcp stdio server (gitignored, user applies manually)
