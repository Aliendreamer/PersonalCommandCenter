## Why

The IoT subsystem is the first real device-facing feature. On the settled hybrid
architecture (Home Assistant as the device engine, an `iot` plugin adapting it), the
lowest-risk first slice is **read-only monitoring**: see your HA devices and their states in
the command center. It proves the HA → plugin → UI pipeline before we add control.

## What Changes

- Add a compile-time **`iot` plugin** (`plugins/iot/iot.api`), `appsettings`-activated like
  `system`, that calls Home Assistant's REST API (`GET /api/states`) with a bearer token and
  maps results to a slim entity shape, filtered to configured domains.
- Expose `GET /api/iot/entities`; manifest contributes a **"Devices"** nav entry, a
  `/devices` page, and an `iot-summary` dashboard tile.
- Add `IotEntity` + `getIotEntities()` to `@pcc/contracts`; add the Devices page and summary
  tile to `apps/web` (UI in `apps/web` for now, consistent with the system plugin).
- Add a **`home-assistant`** service to docker-compose (config volume, port 8123 for
  onboarding); core-api configured with HA base URL and a token from `.env`.

Out of scope (later slices): device control/writes, WebSocket/real-time push, per-vendor
logic, app authentication.

## Capabilities

### New Capabilities
- `iot-monitoring`: read-only listing of Home Assistant entities (filtered domains) with
  their state, surfaced via the `iot` plugin's API, a Devices page, and a dashboard summary
  tile, degrading gracefully when HA is unavailable.

### Modified Capabilities
<!-- None — reuses plugin-host and web-shell as-is. -->

## Impact

- New `plugins/iot/iot.api` (.NET) referenced by core-api; new `apps/web` Devices page/tile
  and `@pcc/contracts` additions.
- `docker-compose.yml` gains a `home-assistant` service; `.env.example` documents the HA
  long-lived token (secret, not committed).
- Depends on `plugin-host` (activation/manifest) and `web-shell` (manifest-driven rendering),
  both already in place. Requires a one-time HA onboarding for end-to-end use.
