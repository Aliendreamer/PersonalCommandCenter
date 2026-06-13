## ADDED Requirements

### Requirement: Keycloak OIDC login with PKCE

The API SHALL initiate authentication via Keycloak using the OIDC authorization-code flow with
PKCE (S256) and a signed `state` carrying a nonce and a sanitized `returnTo`. The API — not the
browser or the FE server — SHALL perform the code exchange and hold the resulting tokens.

#### Scenario: Login redirects to Keycloak

- **WHEN** a client requests `GET api/auth/login?returnTo=/devices`
- **THEN** the API sets a short-lived `HttpOnly` `mp_pkce` cookie, and returns a 302 to the
  Keycloak authorize URL containing `code_challenge` (S256) and the encoded `state`

#### Scenario: Callback completes the exchange and starts a session

- **WHEN** Keycloak redirects to `GET api/auth/callback?code=…&state=…` and the state nonce
  matches the `mp_pkce` cookie
- **THEN** the API exchanges the code for tokens, creates a server-owned session, sets the
  `mp_sid` cookie, and 302-redirects to the absolute `{AppBaseUrl}{returnTo}`

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

The API SHALL transparently refresh a session whose access token has expired but whose refresh
token is still valid — refreshing against Keycloak and persisting the new tokens — and SHALL treat
the request as unauthenticated when refresh is no longer possible.

#### Scenario: Expired access token is refreshed

- **WHEN** an authenticated request arrives with an expired access token and a valid refresh token
- **THEN** the API refreshes the tokens, updates the session, and serves the request as authenticated

#### Scenario: Expired refresh yields 401

- **WHEN** both the access and refresh tokens are expired/invalid
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

The session and PKCE cookies SHALL be `HttpOnly`, `SameSite=Lax`, scoped to `Domain=.pcc.localhost`
and `Path=/`, and marked `Secure` outside Development.

#### Scenario: Cookie attributes

- **WHEN** the API sets `mp_sid`
- **THEN** the cookie is `HttpOnly`, `SameSite=Lax`, `Domain=.pcc.localhost`, and not readable by JS

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
