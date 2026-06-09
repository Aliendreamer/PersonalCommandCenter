## Context

First IoT slice on the hybrid architecture. Full design at
`docs/superpowers/specs/2026-06-09-iot-home-assistant-design.md`; this captures the key
technical decisions. The `system` plugin is the reference pattern for plugin shape, config
activation, and UI placement.

## Goals / Non-Goals

**Goals:** an `iot` plugin that lists HA entities (filtered domains) via REST polling, a
Devices page + summary tile, HA in docker-compose, fully TDD'd against a mocked HA.

**Non-Goals:** control/writes, WebSocket/real-time, per-vendor logic, app auth.

## Decisions

- **Read-only + REST polling**, mirroring `SystemTile`'s poll pattern. Real-time and control
  are later slices.
- **`IHomeAssistantClient` over a typed `HttpClient`.** `GET {BaseUrl}/api/states` with
  `Authorization: Bearer {Token}`; map to `IotEntity { entityId, name, domain, state, unit? }`
  (name from `attributes.friendly_name`, domain from the entityId prefix, unit from
  `attributes.unit_of_measurement`); filter to `Plugins:Iot:Domains` (default `light, switch,
  sensor, binary_sensor`). The interface makes the plugin endpoint testable with a fake client,
  and the client itself is testable with a stub `HttpMessageHandler`.
- **Secrets via env.** The HA token comes from `Plugins__Iot__HomeAssistant__Token` (from
  `.env`), never committed. Base URL is `http://home-assistant:8123` in compose.
- **HA failure → 502.** The endpoint surfaces failure as a non-2xx; the UI degrades (same as
  `SystemTile`). *Alternative:* `200 { entities:[], error }` — rejected; a status code is the
  clearer contract and the existing UI degradation handles a failed fetch.
- **UI in `apps/web`.** Devices page + `iot-summary` tile alongside the system UI; standalone
  `*.ui` package extraction stays deferred.

## Risks / Trade-offs

- **HA onboarding/token is manual** → one-time; `.env.example` documents it; tests mock HA so
  CI/dev gates don't need a live instance.
- **HA returns many entities** → domain filtering keeps the list focused; default domains are
  configurable.
- **Polling staleness** → acceptable for monitoring; real-time is a later slice.
- **Token leakage** → kept in env/`.env` (gitignored), never logged.

## Migration Plan

Additive. `docker compose up` now also starts `home-assistant`; first use needs onboarding +
a long-lived token in `.env`. Disabling `Plugins:Iot:Enabled` cleanly removes the feature.

## Open Questions

None blocking. Control and real-time updates are explicit follow-up slices.
