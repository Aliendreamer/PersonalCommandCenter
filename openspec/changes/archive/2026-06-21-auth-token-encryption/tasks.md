## 1. Encrypt tokens at rest (TDD) — DONE

- [x] 1.1 `SessionServiceTests`: stored access/refresh are ciphertext (NotEqual plaintext) while resolve
  returns the decrypted token and refresh still works; shared ephemeral protector + `Svc` helper
- [x] 1.2 `SessionService` takes `IDataProtectionProvider`; `Protect` on create/refresh, `Unprotect` on
  read + before the Keycloak refresh exchange
- [x] 1.3 `Program.cs` registers `AddDataProtection()` unconditionally (ephemeral in Development,
  persisted to `/keys` otherwise)

## 2. SSR auth proxy forwards the body (2.6, cheap half) — DONE

- [x] 2.1 `auth-proxy.ts` forwards `request.body` + content-type for non-GET with `duplex: 'half'`

## 3. Gates + deploy

- [x] 3.1 `.NET` build/test (171)/format + `pnpm` typecheck/lint/test (137)/build/format:check green
- [ ] 3.2 (operational) `docker compose up -d --build core-api web`; one re-login
