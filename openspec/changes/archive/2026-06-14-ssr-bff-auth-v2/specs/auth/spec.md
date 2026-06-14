## MODIFIED Requirements

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

### Requirement: Session cookie security

The session and PKCE cookies SHALL be `HttpOnly`, `SameSite=Lax`, `Path=/`, and **app-scoped** (no
`Domain` attribute) as set by the SSR ingress — using the `__Host-` prefix with `Secure` in
production (HTTPS). Tokens SHALL never reach the browser/JS.

#### Scenario: Cookie attributes

- **WHEN** the SSR server sets the session cookie
- **THEN** it is `HttpOnly`, `SameSite=Lax`, has no `Domain` attribute, is not readable by JS, and in
  production uses the `__Host-` prefix with `Secure`

## ADDED Requirements

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
