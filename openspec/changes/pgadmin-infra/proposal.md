## Why

The base-infra hub has Postgres but no DB admin UI — inspecting/querying the PCC database means a CLI.
pgAdmin gives a browser DB console, pre-wired to the PCC Postgres, as another shared hub service.

## What Changes

- **Add pgAdmin to PCC compose** (`dpage/pgadmin4`): web DB console, reached **route-only** at
  `pgadmin.pcc.localhost` (no host port, like the rest of the hub), a `pgadmin-data` volume, dev login
  (`PGADMIN_DEFAULT_EMAIL`/`PASSWORD`). It reaches Postgres over the compose network (`postgres:5432`).
- **Pre-wire the PCC Postgres connection** via a mounted `harness/pgadmin/servers.json`, so the
  `postgres` server is already listed on first login (the user just supplies the DB password).
- **Traefik file-provider route** `pgadmin.pcc.localhost` → `pgadmin:80`.

## Capabilities

### Modified Capabilities

- `base-infra`: the shared base stack gains a routable **pgAdmin** DB console (pre-wired to the PCC
  Postgres), under the same router-only, not-behind-app-login posture.

## Impact

- **Infra**: one new compose service (`pgadmin`) + a `pgadmin-data` volume + a `harness/pgadmin/servers.json`
  + one Traefik route. Depends on the existing `postgres` service.
- **Docs**: `DOCKER_SETUP.md` (add the endpoint) + `CLAUDE.md` (extend the base-infra note).
- **Tests**: live smoke — `pgadmin.pcc.localhost` serves and the PCC Postgres server is pre-listed.

## Non-Goals

Production hardening (real auth/TLS/SSO) — dev defaults only. No automatic DB-password injection
(the user enters it). No second pgAdmin server entries beyond the PCC Postgres.
