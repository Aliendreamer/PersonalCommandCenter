## Why

`docker-compose.yml` carries ~40 `Plugins__*` environment lines — container addresses, deployment
config, and secrets all mixed together. It makes no sense for this config to live in compose: the
container addresses are just the plugins' normal deployment, the non-secret bits are deliberate
config, and only the secrets actually need runtime injection. The duplication (compose vs.
`appsettings.json` vs. the `Options` class defaults) is also a per-plugin tax — adding a plugin means
editing compose too. This change gives each kind of value one correct home and empties compose of
plugin config.

## What Changes

- **Container addresses become each plugin's `Options` default** (the canonical container
  deployment): align the currently-empty/localhost defaults — `Calendar`/`Tasks` → `radicale:5232`,
  `Iot` HA → `home-assistant:8123`, `Search` → `searxng:8080`, `Models` GPU exporter →
  `gpu-exporter:9835/metrics`, host `Ntfy` → `ntfy:80`. (`Models` Ollama, `Coding` already container.)
- **Non-secret deployment config + `Enabled` live in `appsettings.json`** (committed, baked in the
  image): `Plugins:<Id>:Enabled`, Weather lat/long, RSS feeds, Uptime targets, IoT domains, Calendar/
  Tasks collection + window, Goodreads shelf, and the committed **dev-default** CalDAV creds
  (`pcc`/`pcc-dev-caldav`, already committed like the Keycloak test user).
- **Secrets/personal values move to `.env` (gitignored), loaded via `env_file`**, with keys in .NET
  form: `Plugins__Iot__HomeAssistant__Token`, `Plugins__Calendar__Password`, `Plugins__Tasks__Password`,
  `Plugins__Coding__ApiKey`, `Plugins__Goodreads__UserId`. **BREAKING (local only):** `.env` keys
  change from friendly names (`HA_TOKEN`, `WAKAPI_API_KEY`) to .NET config keys.
- **`docker-compose.yml` core-api drops every `Plugins__*` line** and gains `env_file: .env`; it keeps
  only infra env (`ASPNETCORE_HTTP_PORTS`, `OTEL_EXPORTER_OTLP_ENDPOINT`) and the existing non-plugin
  `Auth`/`ConnectionStrings`/`Web` lines (out of scope).
- **Host-dev localhost overrides move to `appsettings.Development.json`** so a bare `dotnet run` on the
  host still reaches `localhost:5232/8123/8888/11434`, while container runs use the plugin defaults.
- **`.env.example` documents the new .NET-style secret keys.**

## Capabilities

### New Capabilities
- `plugin-config`: the layered config contract for plugins — `Options`-class defaults target the
  container deployment, committed non-secret config + `Enabled` live in `appsettings.json`, secrets
  load from `.env` via `env_file`, and `docker-compose` contains no plugin config.

### Modified Capabilities
<!-- none: behavior of each plugin is unchanged; only where its config comes from -->

## Impact

- **Plugin `Options` classes**: set container-address defaults for `Calendar`, `Tasks`, `Iot`,
  `Search`, `Models` (GPU), and host `NtfyOptions`.
- **Config files**: `appsettings.json` (drop addresses/secrets, keep Enabled + non-secret config +
  dev-default creds), new/expanded `appsettings.Development.json` (localhost host-dev overrides),
  `.env`/`.env.example` (.NET-style secret keys).
- **`docker-compose.yml`**: remove all `Plugins__*` env from core-api; add `env_file: .env`.
- **Behavior**: unchanged — each plugin resolves the same effective config; only the source layering
  changes. Verified by the existing `CoreApi.Tests` + the live-stack E2E.
- **Docs**: `DOCKER_SETUP.md` + `CLAUDE.md` config notes updated for the new layering.
