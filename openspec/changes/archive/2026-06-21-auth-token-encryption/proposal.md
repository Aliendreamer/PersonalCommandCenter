## Why

Audit follow-up 2.3: the Keycloak access/refresh tokens are stored in plaintext in the Postgres
`Sessions` table, so a DB-only leak (backup, snapshot, read-only compromise) exposes live tokens. The
`pcc-dataprotection` keyring is mounted on a **separate** volume (`/keys`) and persists across
restarts, so encrypting the tokens at rest with DataProtection adds real protection (the key isn't in
the DB) without the restart-invalidation problem that previously blocked this.

Also folds in the cheap half of audit 2.6: the SSR auth proxy forwards the request **body** so a
future POST auth endpoint isn't silently emptied. (The optional OIDC-state HMAC is intentionally
skipped — the state is already nonce-bound and `returnTo` is sanitized.)

## What Changes

- **Access and refresh tokens are encrypted at rest.** `SessionService` protects the tokens with an
  `IDataProtector` before persisting and unprotects them on read/refresh; the stored columns hold
  ciphertext. Resolution still returns the plaintext access token to the JwtBearer pipeline. In the
  container (non-Development) the keyring persists to `/keys`, so ciphertext survives restarts;
  host-dev/tests use an ephemeral keyring (a host-dev restart re-logs-in — acceptable for dev).
- **DataProtection is registered in all environments** (ephemeral default in Development, persisted to
  `/keys` otherwise) so the protector is always resolvable.
- **The SSR auth proxy forwards the request body** for non-GET methods (`duplex: 'half'`).

## Capabilities

### Modified Capabilities
- `auth`: session tokens are encrypted at rest; the SSR auth proxy forwards request bodies.

## Non-goals

- OIDC-state HMAC (2.6) — skipped; state is nonce-bound + returnTo sanitized.
- JWT audience validation (2.2) — still deferred; needs a Keycloak audience mapper + iterative live
  verification.

## Impact

- **.NET**: `SessionService` (ctor `IDataProtectionProvider`; protect/unprotect on store/read/refresh);
  `Program.cs` (unconditional `AddDataProtection`).
- **Web**: `apps/web/src/lib/server/auth-proxy.ts` (forward body).
- **Tests**: `SessionServiceTests` (shared ephemeral protector; at-rest-ciphertext assertions).
- **Deploy**: one more core-api rebuild + re-login (sessions created before this store plaintext tokens
  the new code can't decrypt).
