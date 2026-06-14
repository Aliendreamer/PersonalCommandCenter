# web-shell Specification

## Purpose

The TanStack Start shell that discovers enabled plugins from the manifest and renders their
nav entries, dashboard tiles, and lazy-loaded routes, degrading gracefully when the manifest
is unavailable.
## Requirements
### Requirement: Shell renders enabled plugins from the manifest

The web shell SHALL fetch the plugin manifest **server-side** via a server function that calls the
API over the internal network (forwarding the session cookie) and render a nav entry and dashboard
tile for each enabled plugin; the browser SHALL NOT call the API directly. The initial HTML SHALL be
server-rendered with the manifest already present.

#### Scenario: Enabled plugin appears in the UI

- **WHEN** the user is authenticated and the manifest contains the `system` plugin
- **THEN** the server-rendered shell shows a "System" nav entry and a System dashboard tile

#### Scenario: Disabled plugin is absent from the UI

- **WHEN** the manifest does not contain the `system` plugin
- **THEN** the shell shows no System nav entry and no System tile

### Requirement: Lazy-loaded plugin routes

The web shell SHALL lazy-load each enabled plugin's UI routes from its matching `*.ui`
library, loading a plugin's UI code only when its route is navigated to.

#### Scenario: Plugin route loads on navigation

- **WHEN** the user navigates to an enabled plugin's route base
- **THEN** the shell loads that plugin's UI and renders its page

### Requirement: Graceful degradation

The web shell SHALL tolerate an unreachable or partial manifest by rendering an empty dashboard with
a non-blocking error indicator rather than failing to load.

#### Scenario: Manifest fetch fails

- **WHEN** the server function that fetches the manifest fails
- **THEN** the shell still loads, shows an empty dashboard, and surfaces a non-blocking error

### Requirement: Whole shell behind login

The web shell SHALL gate the entire app server-side: an `_authenticated` layout route's `beforeLoad`
SHALL resolve the current identity via a server function and, when unauthenticated, redirect the
browser to the login proxy (`/api/auth/login?returnTo=<path>`); the identity SHALL be available via
router context. There SHALL be no client-side `/me` probe.

#### Scenario: Unauthenticated visitor is sent to login

- **WHEN** an unauthenticated browser loads any app route
- **THEN** `beforeLoad` redirects to `/api/auth/login` preserving the requested path as `returnTo`

#### Scenario: Authenticated visitor sees the dashboard

- **WHEN** the identity resolves during `beforeLoad`
- **THEN** the dashboard renders server-side with the plugin manifest and identity present

### Requirement: Identity and logout affordance

The web shell SHALL surface the authenticated user's identity (name/email) and roles, and a
logout action that navigates to `api/auth/logout`.

#### Scenario: Nav shows identity and logout

- **WHEN** the user is authenticated
- **THEN** the shell shows the user's name/email and roles and a Logout control that navigates to
  `api/auth/logout`

### Requirement: Pages render with data server-side

Plugin tiles and pages SHALL receive their data from route loaders (fetched server-side via server
functions), not from client-side fetches to the API; the initial server-rendered HTML SHALL include
the data.

#### Scenario: Devices page is server-rendered with entities

- **WHEN** an authenticated user navigates to `/devices`
- **THEN** the server-rendered HTML already contains the device list, with no client-side "Loading…"
  fetch to the API

