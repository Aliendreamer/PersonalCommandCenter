## MODIFIED Requirements

### Requirement: Shell renders enabled plugins from the manifest

The web shell SHALL fetch `GET /api/plugins` **directly from the API** (`api.pcc.localhost`,
credentialed, client-side — no FE→API server proxy) and render a nav entry and dashboard tile for
each enabled plugin, using the plugin's manifest, and SHALL NOT render anything for plugins absent
from the manifest. The manifest fetch occurs after the user is authenticated.

#### Scenario: Enabled plugin appears in the UI

- **WHEN** the user is authenticated and the manifest contains the `system` plugin
- **THEN** the shell shows a "System" nav entry and a System dashboard tile

#### Scenario: Disabled plugin is absent from the UI

- **WHEN** the manifest does not contain the `system` plugin
- **THEN** the shell shows no System nav entry and no System tile

## ADDED Requirements

### Requirement: Whole shell behind login

The web shell SHALL require authentication for the entire app: it SHALL probe `GET /api/me`
(client-side, credentialed) and, when unauthenticated, redirect the browser to the API login
(`api/auth/login?returnTo=<path>`); it SHALL render the dashboard only once `/me` succeeds.

#### Scenario: Unauthenticated visitor is sent to login

- **WHEN** an unauthenticated browser loads any app route
- **THEN** the shell redirects to `api/auth/login` preserving the requested path as `returnTo`

#### Scenario: Authenticated visitor sees the dashboard

- **WHEN** `/api/me` returns 200
- **THEN** the shell renders the dashboard and fetches the plugin manifest

### Requirement: Identity and logout affordance

The web shell SHALL surface the authenticated user's identity (name/email) and roles, and a
logout action that navigates to `api/auth/logout`.

#### Scenario: Nav shows identity and logout

- **WHEN** the user is authenticated
- **THEN** the shell shows the user's name/email and roles and a Logout control that navigates to
  `api/auth/logout`
