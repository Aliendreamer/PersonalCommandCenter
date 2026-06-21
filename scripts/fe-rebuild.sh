#!/usr/bin/env bash
#
# Rebuild ONLY the web (FE / SSR-BFF) container — surgically, without bouncing its dependencies.
#
# Why --no-deps: `web` depends_on `core-api`, so a plain `docker compose up -d --build web` ALSO
# recreates core-api. That's harmless (sessions live in the browser cookie + Postgres + Keycloak,
# none in the web tier), but --no-deps keeps it to just the web container. The web tier is stateless,
# so a FE-only rebuild never logs anyone out. (The old "rebuild logs me out" pain was Keycloak's
# ephemeral H2 — fixed: Keycloak is now Postgres-backed with offline sessions. See
# openspec/changes/archive/2026-06-21-auth-session-durability/.)
#
# Usage: scripts/fe-rebuild.sh   (or: pnpm fe:rebuild)
set -euo pipefail
cd "$(dirname "$0")/.."
exec docker compose up -d --build --no-deps web
