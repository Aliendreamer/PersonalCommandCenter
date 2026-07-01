# Tasks: postgres-mcp

- [x] Create harness/postgres/Dockerfile (pg18-alpine + postgresql-hypopg)
- [x] Update docker-compose postgres service: build from harness/postgres, add shared_preload_libraries command
- [x] Add postgres-ext-init one-shot service
- [x] Add postgres-mcp service
- [x] Verify image entrypoint / args (entrypoint script + `postgres-mcp` on PATH, DATABASE_URI env, stdio default)
- [x] Document .mcp.json wiring in spec (verified `docker exec -i … postgres-mcp` form)
- [x] Stack-wide `restart: unless-stopped` so everything survives a Docker daemon restart (one-shots stay `restart: 'no'`)
- [x] Gates green (compose config valid, image builds)
- [x] pg17 → pg18 data migration (dumpall → new volume layout at /var/lib/postgresql → restore; hypopg built from source — apk package targets Alpine's pg paths, invisible to the docker-library build)
- [x] Live verification: extensions created, postgres-mcp up, success-criteria SQL green, MCP initialize handshake answered
