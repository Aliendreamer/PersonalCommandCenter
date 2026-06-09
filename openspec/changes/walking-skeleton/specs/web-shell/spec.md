## ADDED Requirements

### Requirement: Shell renders enabled plugins from the manifest

The web shell SHALL fetch `GET /api/plugins` on load and render a nav entry and dashboard
tile for each enabled plugin, using the plugin's manifest, and SHALL NOT render anything for
plugins absent from the manifest.

#### Scenario: Enabled plugin appears in the UI

- **WHEN** the manifest contains the `system` plugin
- **THEN** the shell shows a "System" nav entry and a System dashboard tile

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

The web shell SHALL tolerate an unreachable or partial manifest by rendering an empty
dashboard with a non-blocking error indicator rather than failing to load.

#### Scenario: Manifest endpoint is unreachable

- **WHEN** `GET /api/plugins` fails
- **THEN** the shell still loads, shows an empty dashboard, and surfaces a non-blocking error
