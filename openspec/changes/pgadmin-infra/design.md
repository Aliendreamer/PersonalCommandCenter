## Context

A small additive infra change extending the base-infra hub (the SearXNG/Radicale/Portainer "self-host
a service, route it via the Traefik file provider" mold). pgAdmin is a browser Postgres console; PCC
already runs `postgres`, so pgAdmin just needs network access to it plus a pre-wired server entry.

## Goals / Non-Goals

**Goals:** a routable pgAdmin at `pgadmin.pcc.localhost`, pre-wired to the PCC Postgres, persistent,
dev-login. **Non-Goals:** prod hardening (TLS/SSO/real auth), DB-password injection, extra servers.

## Decisions

- **Route-only, no host port** — consistent with the hub's access model (`pgadmin.pcc.localhost` →
  `pgadmin:80`); not behind the app's Keycloak login (raw infra). pgAdmin has its own dev login.
- **`dpage/pgadmin4`** with `PGADMIN_DEFAULT_EMAIL`/`PGADMIN_DEFAULT_PASSWORD` (dev defaults, overridable
  via `.env`), a `pgadmin-data:/var/lib/pgadmin` volume for persistence, and `depends_on: postgres`.
- **Pre-wire via `servers.json`** mounted at `/pgadmin4/servers.json` (pgAdmin auto-imports it on first
  init): one entry for `postgres:5432`, db `pcc`, user `pcc`. The **password is not stored** — the user
  enters it on first connect (it's the `POSTGRES_PASSWORD`, dev default `pcc-dev`).
- **Behind Traefik**: pgAdmin serves on container port 80 at the host root (`pgadmin.pcc.localhost`), so
  no subpath config is needed; X-Forwarded handling is left at defaults and verified by the live smoke
  (adjust `PGADMIN_CONFIG_PROXY_*` only if a login redirect misbehaves).

## Risks / Trade-offs

- **Unauthenticated-ish dev console exposed on the hub** → acceptable on a single-user dev box (pgAdmin
  still has its own login); hardening deferred (non-goal). Don't copy to a shared host.
- **Proxy redirect quirks** behind Traefik → caught by the live smoke (load the login page); fix with
  `PGADMIN_CONFIG_PROXY_X_*` if needed.

## Migration Plan

Additive: new service + volume + route + servers.json. Rollback = remove them. No data migration.
