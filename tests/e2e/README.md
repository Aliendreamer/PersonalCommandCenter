# E2E tests

End-to-end tests for the BFF auth flow, run against the **running stack** (Keycloak, Postgres,
core-api, web, all behind Traefik on `*.pcc.localhost`). These are not part of the unit-test
gates — they need the live stack, so run them on demand.

Standalone package (intentionally not in the pnpm workspace) so Playwright isn't pulled into the
main install.

## Run

```bash
# 1. Bring up the stack and import the realm (from the repo root):
docker compose up -d --build

# 2. Install + run (from this dir):
cd tests/e2e
pnpm install --ignore-workspace      # or: npm install
pnpm exec playwright install chromium
pnpm test
```

## What it covers (`auth.spec.ts`)

- Unauthenticated visit → redirect to Keycloak → login (`testuser` / `Test123!`).
- App renders **behind login** (identity chip + System/Devices nav).
- `GET /api/me` returns the JIT-provisioned identity + realm roles.
- **Instant revocation:** logout, then reusing the old `mp_sid` cookie → `401`.
- Endpoints require a session (`/api/plugins`, `/api/me` → 401; `/health` anonymous).

Override targets/credentials via env: `PCC_APP_URL`, `PCC_API_URL`, `PCC_TEST_USER`,
`PCC_TEST_PASS`.
