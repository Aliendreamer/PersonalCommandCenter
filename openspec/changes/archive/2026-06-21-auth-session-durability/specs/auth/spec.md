## MODIFIED Requirements

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

## ADDED Requirements

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
