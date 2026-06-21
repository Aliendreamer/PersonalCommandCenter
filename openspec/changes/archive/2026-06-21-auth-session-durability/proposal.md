## Why

Every full `docker compose` rebuild forces a re-login. Root cause (debugged 2026-06-21): **Keycloak
runs `start-dev` with an ephemeral H2 database and no persistent volume** — recreating the container
wipes all sessions, refresh tokens, and the realm's signing keys. Postgres (`pcc-postgres`) and
core-api's DataProtection keyring (`pcc-dataprotection`) already persist, so the PCC session rows
survive — but their stored refresh tokens are then rejected by the fresh Keycloak and their access
tokens fail signature validation, so `ResolveAccessTokenAsync` can't refresh → forced re-login. (The
web container is stateless; "FE rebuild" was a red herring.)

## What Changes

- **Keycloak persists its state in Postgres** (not ephemeral H2). A one-shot `keycloak-db-init`
  service idempotently creates a dedicated `keycloak` database in the existing Postgres instance, and
  Keycloak is pointed at it via `KC_DB`/`KC_DB_URL` (still `start-dev` for dev ergonomics). Sessions,
  refresh tokens, and realm keys now survive container recreation.
- **Long-lived offline sessions.** The OIDC authorize request adds the `offline_access` scope so the
  refresh token is an **offline token** (survives SSO idle/max windows), and the realm sets a long
  `offlineSessionIdleTimeout` (90 days) with no absolute cap. You stay logged in across rebuilds and
  long gaps until you log out or 90 days idle.
- **Refresh/purge semantics updated for offline tokens.** Offline tokens return
  `refresh_expires_in: 0` → a `null` `RefreshTokenExpiresAt`. This **revises** the audit-followups
  logic: `null` now means "non-expiring offline refresh token" (keyed on `RefreshToken` *presence*),
  not "no refresh path". `ResolveAccessTokenAsync` refreshes a `null`-expiry session; `PurgeAsync` no
  longer reaps it for an expired access token, but DOES reap sessions with no refresh token + expired
  access, a non-null-but-past refresh expiry, or an idle cap (`UpdatedAt` older than the offline idle
  window) so dead offline sessions still get cleaned up.

## Capabilities

### Modified Capabilities
- `auth`: token refresh handles non-expiring offline tokens; sessions are durable across Keycloak
  restarts and long-lived via `offline_access`.

## Non-goals

- Switching Keycloak off `start-dev` to a hardened `start` (TLS/hostname-strict) — deferred; `start-dev`
  + `KC_DB=postgres` already gives durable storage for this local hub.
- Encrypting the stored tokens at rest (tracked separately as audit follow-up 2.3).

## Impact

- **Infra**: `docker-compose.yml` (`keycloak-db-init` service; `keycloak` `KC_DB*` env + depends_on).
- **Realm**: `harness/keycloak/Pcc-realm.json` (offline session lifetimes).
- **.NET**: `KeycloakClient.BuildAuthorizeUrl` (+`offline_access`); `SessionService` resolve + purge.
- **Tests**: `KeycloakClientTests` (scope), `SessionServiceTests` (offline refresh + purge rules).
- **One-time**: existing sessions are in the old H2 and are lost once — a single re-login after deploy,
  then durable.
