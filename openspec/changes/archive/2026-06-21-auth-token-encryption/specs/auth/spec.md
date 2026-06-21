## ADDED Requirements

### Requirement: Session tokens are encrypted at rest

The server-owned session SHALL store the Keycloak access and refresh tokens **encrypted** (via
application-layer data protection whose key material lives outside the database), not as plaintext, so
a database-only disclosure does not expose usable tokens. The tokens SHALL be decrypted only in-process
when resolving a request's access token or refreshing against Keycloak.

#### Scenario: Stored tokens are not plaintext

- **WHEN** a session is created
- **THEN** the persisted access/refresh token columns hold ciphertext, not the raw token values

#### Scenario: Resolution still yields a usable access token

- **WHEN** a valid session's access token is resolved
- **THEN** the API returns the decrypted (plaintext) access token to the authentication pipeline, and a
  refresh decrypts the stored refresh token before exchanging it with Keycloak
