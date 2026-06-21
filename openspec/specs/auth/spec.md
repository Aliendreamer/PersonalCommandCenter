# auth Specification

## Purpose
TBD - created by archiving change bff-auth-foundation. Update Purpose after archive.
## Requirements
### Requirement: Keycloak OIDC login with PKCE

The API SHALL initiate authentication via Keycloak using the OIDC authorization-code flow with
PKCE (S256) and a signed `state` carrying a nonce and a sanitized `returnTo`. The API — not the
browser — SHALL perform the code exchange and hold the resulting tokens. The SSR server proxies the
auth endpoints to the API but never performs the exchange itself, and the OIDC callback returns to
`app.pcc.localhost`.

#### Scenario: Login redirects to Keycloak

- **WHEN** a client requests `GET /api/auth/login?returnTo=/devices` (via the SSR server)
- **THEN** the API sets a short-lived `HttpOnly` PKCE cookie, and returns a 302 to the
  Keycloak authorize URL containing `code_challenge` (S256) and the encoded `state`

#### Scenario: Callback completes the exchange and starts a session

- **WHEN** Keycloak redirects the browser to `app.pcc.localhost/api/auth/callback?code=…&state=…`
  (proxied to the API) and the state nonce matches the PKCE cookie
- **THEN** the API exchanges the code for tokens, creates a server-owned session, sets the
  session cookie, and 302-redirects to the absolute `{AppBaseUrl}{returnTo}`

### Requirement: Server-owned session with opaque cookie

The API SHALL store each session server-side (Postgres), persisting only the SHA-256 **hash** of
a 256-bit session token plus the OIDC tokens and their expiries, and SHALL give the browser only
an opaque session id in the `mp_sid` cookie. Tokens SHALL never reach the browser/JS.

#### Scenario: Cookie carries no tokens

- **WHEN** a session is created
- **THEN** the `mp_sid` cookie value is an opaque session id (not a JWT/access token), and the
  database row stores the token **hash**, not the raw token

### Requirement: Identity endpoint

The API SHALL expose `GET api/me` requiring an authenticated session and returning
`{ id, subject, email, roles[] }` for the current user, with `Cache-Control: no-store`.

#### Scenario: Authenticated request returns identity

- **WHEN** `GET api/me` is called with a valid `mp_sid` cookie
- **THEN** the API returns 200 with `{ id, subject, email, roles[] }`

#### Scenario: Anonymous request is rejected

- **WHEN** `GET api/me` is called with no/invalid session
- **THEN** the API returns 401

### Requirement: Transparent token refresh

The API SHALL transparently refresh a session whose access token has expired but whose refresh token
is still usable — refreshing against Keycloak and persisting the new tokens — and SHALL treat the
request as unauthenticated when refresh is no longer possible. A refresh token is "usable" when it is
present and either has no expiry (a non-expiring **offline** token, returned with `refresh_expires_in:
0`) or its expiry is still in the future. Concurrent requests for the same session SHALL serialize the
refresh so the single-use refresh token is spent at most once.

#### Scenario: Expired access token is refreshed

- **WHEN** an authenticated request arrives with an expired access token and a usable refresh token
- **THEN** the API refreshes the tokens, updates the session, and serves the request as authenticated

#### Scenario: Offline (non-expiring) refresh token is still usable

- **WHEN** a session's access token is expired and its refresh token has no recorded expiry (an offline
  token)
- **THEN** the API refreshes against Keycloak rather than treating the session as unauthenticated

#### Scenario: Expired refresh yields 401

- **WHEN** the access token is expired and the refresh token is absent or its (non-null) expiry has passed
- **THEN** the request is rejected with 401

### Requirement: Instant server-side revocation on logout

The API SHALL expose `GET api/auth/logout` that revokes the current session server-side (marks it
revoked) and clears the cookie. A revoked session SHALL be rejected on any subsequent use.

#### Scenario: Logout revokes the session

- **WHEN** a user with session cookie `S` calls `api/auth/logout`, then reuses `S` on `GET api/me`
- **THEN** the reused session is rejected with 401

### Requirement: Whole app behind login

The API SHALL require an authenticated session for every route except the auth endpoints
(`api/auth/login`, `api/auth/callback`, `api/auth/logout`) and health.

#### Scenario: Unauthenticated data call is rejected

- **WHEN** `GET api/plugins` (or any plugin endpoint) is called with no session
- **THEN** the API returns 401

#### Scenario: Health stays anonymous

- **WHEN** the health endpoint is called with no session
- **THEN** it returns a successful health response without authentication

### Requirement: Session cookie security

The session and PKCE cookies SHALL be `HttpOnly`, `SameSite=Lax`, `Path=/`, and **app-scoped** (no
`Domain` attribute) as set by the SSR ingress — using the `__Host-` prefix with `Secure` in
production (HTTPS). Tokens SHALL never reach the browser/JS.

#### Scenario: Cookie attributes

- **WHEN** the SSR server sets the session cookie
- **THEN** it is `HttpOnly`, `SameSite=Lax`, has no `Domain` attribute, is not readable by JS, and in
  production uses the `__Host-` prefix with `Secure`

### Requirement: CSRF and open-redirect protection

The callback SHALL reject a `state` whose nonce does not match the `mp_pkce` cookie, and the
`returnTo` SHALL be sanitized to a single-slash relative path (rejecting `//` and scheme-bearing
values) so the post-login redirect cannot target an external origin.

#### Scenario: State nonce mismatch is rejected

- **WHEN** `api/auth/callback` receives a `state` whose nonce does not match the `mp_pkce` cookie
- **THEN** the API rejects the callback without creating a session

#### Scenario: Malicious returnTo is neutralized

- **WHEN** login is given `returnTo=//evil.com` or `returnTo=https://evil.com`
- **THEN** the post-login redirect targets the app origin, not the external value

### Requirement: SSR server is the sole auth ingress

The browser SHALL reach the API only through the SSR server. The SSR server SHALL proxy the auth
endpoints to the API, re-home the API's `Set-Cookie` to an app-scoped cookie (stripping `Domain`),
and forward the session back to the API as the session cookie on its server-to-server calls. The API
SHALL NOT be publicly reachable by the browser.

#### Scenario: Browser never calls the API directly

- **WHEN** the browser performs login, callback, logout, or any data request
- **THEN** it targets only `app.pcc.localhost`, and the SSR server forwards to the API over the
  internal network

#### Scenario: Re-homed session is accepted by the API

- **WHEN** the SSR server forwards a request to the API carrying the re-homed session token value
- **THEN** the API resolves the same server-owned session and authorizes the request

### Requirement: Durable, long-lived sessions across restarts

Sessions SHALL survive a restart/recreation of the auth infrastructure: Keycloak SHALL persist its
sessions, refresh tokens, and realm keys in durable storage (not an ephemeral in-container database),
and the login SHALL request the `offline_access` scope so the refresh token outlives the online SSO
session. Stale sessions SHALL still be reaped — a session with no usable refresh path, or idle beyond
the offline idle window, SHALL be purged.

#### Scenario: A Keycloak restart does not force re-login

- **WHEN** the Keycloak container is recreated and a user returns with an existing session cookie
- **THEN** the stored (offline) refresh token still resolves to a fresh access token and the user
  remains logged in

#### Scenario: An idle session past the offline window is reaped

- **WHEN** a session has not been used for longer than the offline idle window
- **THEN** the purge removes it

