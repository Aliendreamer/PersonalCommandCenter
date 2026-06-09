## ADDED Requirements

### Requirement: Home Assistant entity listing

The `iot` plugin SHALL fetch entities from Home Assistant's REST API using a configured base
URL and bearer token, map them to `{ entityId, name, domain, state, unit? }`, and filter them
to the configured domains (default `light`, `switch`, `sensor`, `binary_sensor`). It SHALL
expose them at `GET /api/iot/entities`.

#### Scenario: Returns mapped, filtered entities

- **WHEN** Home Assistant returns states for a `light`, a `sensor`, and a `person`, and the
  configured domains are `light` and `sensor`
- **THEN** `GET /api/iot/entities` returns the light and the sensor (mapped with name, state,
  and unit where present) and omits the `person`

#### Scenario: Bearer token is sent

- **WHEN** the plugin requests entities from Home Assistant
- **THEN** the request includes `Authorization: Bearer <token>` and targets
  `{BaseUrl}/api/states`

### Requirement: Config-driven activation

The `iot` plugin SHALL activate only when `Plugins:Iot:Enabled` is `true`, and SHALL appear
in `/api/plugins` with a "Devices" nav entry and `iot-summary` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Iot:Enabled = false`
- **THEN** `GET /api/iot/entities` is not served and `iot` is absent from `/api/plugins`

### Requirement: Graceful degradation on Home Assistant failure

When Home Assistant is unreachable or returns an error, the `iot` plugin SHALL respond with a
non-success status, and the UI SHALL show a degraded "Devices unavailable" state without
breaking the dashboard.

#### Scenario: Home Assistant unreachable

- **WHEN** the Home Assistant request fails
- **THEN** `GET /api/iot/entities` responds with `502` and the Devices tile/page shows a
  degraded state rather than crashing

### Requirement: Devices UI surfaces

The `iot` plugin SHALL contribute a "Devices" nav entry, a `/devices` page listing entities
grouped by domain with their state (and unit for sensors), and a dashboard summary tile
showing device counts.

#### Scenario: Devices page lists entities

- **WHEN** the Devices page renders with entities available
- **THEN** it shows the entities grouped by domain with their current state

#### Scenario: Summary tile shows counts

- **WHEN** the dashboard renders with the `iot` plugin enabled and entities available
- **THEN** the `iot-summary` tile shows a device count (e.g. total devices and how many are on)
