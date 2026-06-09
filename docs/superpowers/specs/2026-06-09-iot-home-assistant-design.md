# IoT (Home Assistant) Plugin — Read-Only Monitoring Slice

**Date:** 2026-06-09
**Status:** Approved (design); pending OpenSpec proposal
**Author:** Aliendreamer + Claude

## Context

First slice of the IoT subsystem, built on the settled hybrid architecture: Home Assistant
runs as a container under the app and is the device engine; an `iot` plugin adapts HA's API;
the browser never talks to HA directly. This slice is **read-only monitoring** only.

## Goals / Non-Goals

**Goals:** an `iot` plugin that lists HA entities (filtered domains) with live-ish state via
REST polling, a "Devices" nav + dashboard summary tile + `/devices` page, HA added to
docker-compose, all TDD'd with a mocked HA.

**Non-Goals:** device control/writes; WebSocket/real-time push; per-vendor logic (HA
abstracts it); app authentication.

## Decisions

- **Read-only first.** Lowest-risk slice that proves HA → plugin → UI end to end.
  *Alternative:* monitoring + control — deferred (adds write path, optimistic UI).
- **REST polling.** Plugin calls HA `GET /api/states`; UI polls the plugin endpoint (same
  pattern as `SystemTile`). *Alternative:* WebSocket subscription — deferred (needs a
  background service + push channel).
- **HA in docker-compose.** Self-contained stack; one-time onboarding + long-lived token.
  *Alternative:* point at an existing HA / mock-only — rejected for the self-contained goal.
- **Compile-time `iot` plugin, `appsettings`-activated**, same shape as `system`. UI lives
  in `apps/web` for now (standalone `*.ui` package extraction stays deferred, as with system).
- **UI → core-api → plugin → HA only.** Browser uses the same-origin proxy; HA stays internal.

## Architecture

```
browser → web (same-origin /api/* proxy) → core-api → iot plugin → HA REST /api/states (Bearer)
```

### Backend — `plugins/iot/iot.api`
- Config: `Plugins:Iot:{ Enabled, HomeAssistant:{ BaseUrl, Token }, Domains:[...] }`;
  default `Domains = [light, switch, sensor, binary_sensor]`.
- `IHomeAssistantClient` over `HttpClient`: `GET {BaseUrl}/api/states` with `Bearer {Token}`,
  maps HA JSON → `IotEntity { entityId, name, domain, state, unit? }`, filtered to `Domains`.
- Endpoint `GET /api/iot/entities` → filtered entities. HA failure → `502`.
- Manifest: id `iot`, nav "Devices", route `/devices`, widget `iot-summary`.
- `Configure` registers the typed `HttpClient` + options from the plugin's config section.

### Frontend — `apps/web`
- `@pcc/contracts`: add `IotEntity` type + `getIotEntities()` on the client.
- Dashboard tile `iot-summary`: counts (e.g. "12 devices · 3 on"); degraded on error.
- `/devices` page: entities grouped by domain with state (+ unit for sensors); degraded on
  error. "Devices" nav entry.

### Deployment
- Add `home-assistant` service (`ghcr.io/home-assistant/home-assistant:stable`), config
  volume, port `8123` published for onboarding.
- core-api env: `Plugins__Iot__Enabled=true`,
  `Plugins__Iot__HomeAssistant__BaseUrl=http://home-assistant:8123`, and the **token from
  `.env`** (secret, not committed; documented in `.env.example`).

## Error handling

HA unreachable/misconfigured → plugin endpoint returns `502`; the tile and `/devices` page
show "Devices unavailable" without breaking the dashboard (mirrors `SystemTile`).

## Testing (TDD)

- **Unit:** `HomeAssistantClient` maps/filters `/api/states` and sends the Bearer token,
  using a stub `HttpMessageHandler` (no real HA).
- **Integration:** `/api/iot/entities` enabled → mapped entities (stubbed HA); disabled →
  `404` (config round-trip); HA failure → `502`.
- **Frontend:** device-list + summary-tile component tests with mocked data (grouped render;
  degraded on error).
- **E2E (manual gate):** `docker compose up`, one-time HA onboarding + token, confirm
  `/devices` lists real entities.

## Success criteria

1. With `Plugins:Iot:Enabled=true` and HA reachable, `/api/iot/entities` returns the
   configured-domain entities; `/devices` and the summary tile render them.
2. Disabling the plugin removes it from `/api/plugins`, `/devices`, and the dashboard.
3. HA failure degrades gracefully (`502` → "Devices unavailable").
4. All unit/integration/frontend tests pass; gates green.
