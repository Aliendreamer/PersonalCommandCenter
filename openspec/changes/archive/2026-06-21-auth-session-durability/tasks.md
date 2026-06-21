## 1. Offline-token refresh + purge semantics (TDD) — DONE

- [x] 1.1 `SessionServiceTests`: offline session (null refresh expiry) refreshes; no-refresh purge test
  rewritten to a truly-null refresh token; added purge-keeps-active-offline + purge-removes-idle cases
- [x] 1.2 `ResolveAccessTokenAsync` refreshes when `RefreshToken` present AND
  (`RefreshTokenExpiresAt is null` OR `> now`)
- [x] 1.3 `PurgeAsync`: revoked OR (no refresh token AND access expired) OR (non-null refresh expiry
  past) OR (`UpdatedAt` older than the 90-day offline idle cap)

## 2. offline_access scope (TDD) — DONE

- [x] 2.1 `KeycloakClientTests`: `BuildAuthorizeUrl` includes `offline_access`
- [x] 2.2 Added `offline_access` to the authorize scope

## 3. Keycloak durability (infra) — DONE

- [x] 3.1 `keycloak-db-init` one-shot service idempotently creates the `keycloak` database in Postgres
- [x] 3.2 `keycloak` uses `KC_DB=postgres` + `KC_DB_URL`/`USERNAME`/`PASSWORD`; depends on postgres
  healthy + keycloak-db-init completed
- [x] 3.3 `Pcc-realm.json`: `offlineSessionIdleTimeout` 90 days, `offlineSessionMaxLifespanEnabled` false
- [x] 3.4 `docker compose config -q` clean; realm JSON valid

## 4. Gates — DONE

- [x] 4.1 `.NET` build/test (171)/format green; compose + realm validated. (Frontend untouched.)

## 5. Deploy (operational — user-run, logs out once)

- [ ] 5.1 `docker compose up -d --build core-api keycloak-db-init keycloak` to apply: rebuilds core-api
  with the offline_access + session changes and recreates Keycloak on Postgres. **One re-login** (the
  old ephemeral H2 sessions are gone); thereafter sessions persist across rebuilds. Any data created
  only in the Keycloak admin UI (not in the realm import) lives in the old H2 and would be lost.
