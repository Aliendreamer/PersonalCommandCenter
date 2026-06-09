# system-plugin Specification

## Purpose

The sample plugin that exercises every layer of the host end to end: a status endpoint, the
dashboard tile and detail page, and the config-driven enable/disable round-trip.

## Requirements

### Requirement: System status endpoint

The `system` plugin SHALL expose `GET /api/system/status` returning the API health flag,
application version, uptime, and hostname.

#### Scenario: Status returns health data

- **WHEN** a client requests `GET /api/system/status` while the plugin is enabled
- **THEN** the response contains `apiHealthy`, `version`, `uptime`, and `hostname`

### Requirement: System UI surfaces

The `system` plugin SHALL contribute a "System" nav entry, a dashboard tile showing live
status sourced from `GET /api/system/status`, and a detail page.

#### Scenario: Tile shows live status

- **WHEN** the dashboard renders with the `system` plugin enabled
- **THEN** the System tile displays the current status from `/api/system/status`

#### Scenario: Tile shows a degraded state on error

- **WHEN** `GET /api/system/status` fails
- **THEN** the System tile shows an error/degraded state without breaking the dashboard

### Requirement: Config-driven round-trip

Disabling the `system` plugin via `Plugins:System:Enabled = false` and restarting SHALL
remove it from both the API manifest and the UI; re-enabling and restarting SHALL restore it.

#### Scenario: Disabling removes the plugin everywhere

- **WHEN** `Plugins:System:Enabled` is set to `false` and the core is restarted
- **THEN** `/api/system/status` is not served, `/api/plugins` omits `system`, and the UI shows
  no System nav entry or tile
