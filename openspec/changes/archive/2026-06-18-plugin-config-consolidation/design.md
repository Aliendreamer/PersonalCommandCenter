## Context

Plugin config currently lives in three places with overlapping/duplicated values:
`docker-compose.yml` (container addresses + secrets via `${VAR}`), `appsettings.json` (localhost
addresses for host dev + dev creds + deployment config), and each plugin's `Options` class (defaults,
several empty). .NET config precedence is `appsettings.json` → `appsettings.{Environment}.json` →
environment variables, each overriding the previous; unset keys fall back to the `Options` class
defaults. The container runs as `Production` (no `appsettings.Development.json`); host `dotnet run`
runs as `Development`. This change re-layers the values onto that precedence so each lands in exactly
one place and compose holds none of it.

## Goals / Non-Goals

**Goals:**
- No `Plugins__*` lines in `docker-compose.yml`.
- Each value has one home: address → `Options` default; non-secret config + `Enabled` →
  `appsettings.json`; secret → `.env` via `env_file`.
- Container runs work with zero plugin env; host `dotnet run` still works.
- No behavior change — every plugin resolves the same effective config it does today.

**Non-Goals:**
- The non-plugin compose env (`Auth`, `ConnectionStrings`, `Web`, OTEL) — out of scope, left as-is.
- The registration codegen (globs + source generator) — a separate change.
- Changing any plugin's runtime logic or contracts.

## Decisions

**1. `Options` defaults target the container, not localhost.** The canonical deployment is the compose
network, so `CalendarOptions.BaseUrl` etc. default to `http://radicale:5232` (and peers). Host-dev
localhost values move to `appsettings.Development.json` (loaded only under `Development`). Rationale:
the common path (container) needs zero config; the rarer path (host `dotnet run`) carries the
override. Alternative — defaults stay localhost and compose injects container names — is exactly
today's problem (config in compose), so rejected.

**2. Secrets via `.env` + `env_file`, keyed in .NET form.** compose's `env_file: .env` injects every
`KEY=VALUE` into the container; .NET binds `Plugins__Coding__ApiKey` → `CodingOptions.ApiKey`. This
removes the compose `${VAR}` mapping layer entirely. Cost: `.env` keys change from `HA_TOKEN` to
`Plugins__Iot__HomeAssistant__Token` (accepted). Alternative — an entrypoint script mapping friendly
names — adds a moving part for no real benefit; rejected.

**3. Committed dev-default creds stay in `appsettings.json`.** The CalDAV `pcc`/`pcc-dev-caldav` pair is
already committed (mirrors the Keycloak test user + `harness/radicale/users`); it is a dev default,
not a real secret. It stays in `appsettings.json`; a real deployment overrides `Plugins__Calendar__
Password` via `.env`. Only values with no safe committed default (HA token, Wakapi key, Goodreads
user id) are `.env`-only.

**4. `.env` does double duty.** compose already auto-reads `.env` for `${VAR}` interpolation (Postgres/
Keycloak); adding `env_file: .env` also injects it into the core-api container. Both consume the same
file — fine. `env_file` keys that .NET ignores (e.g. `POSTGRES_PASSWORD`) are harmless in the
container env.

## Value mapping (where each current compose line lands)

| Current compose line | New home |
| --- | --- |
| `Plugins__<Id>__Enabled` | `appsettings.json` |
| `Iot__HomeAssistant__BaseUrl`, `Calendar/Tasks__BaseUrl`, `Search__BaseUrl`, `Models__Gpu__ExporterUrl` | `Options` default (container) |
| `Iot__HomeAssistant__Token`, `Coding__ApiKey`, `Goodreads__UserId`, `Calendar/Tasks__Password` | `.env` (.NET keys) via `env_file` |
| `Calendar/Tasks__Username` (`pcc`), `Calendar/Tasks__Collection`, `Calendar__WindowDays` | `appsettings.json` |
| `Weather__Latitude/Longitude`, `Rss__Feeds__*`, `Uptime__Targets__*`, `Notifications__Ntfy__Topic` | `appsettings.json` |
| `Notifications__Ntfy__BaseUrl` (`ntfy:80`) | `NtfyOptions` default |
| localhost addresses currently in `appsettings.json` | `appsettings.Development.json` |

## Risks / Trade-offs

- **Host `dotnet run` breaks if Development overrides are missed** → put every container-vs-localhost
  address in `appsettings.Development.json`; verify a host run resolves localhost.
- **A secret silently missing → plugin 502s** (already the degrade behavior) → `.env.example`
  enumerates every `Plugins__*` secret key; existing per-plugin "unconfigured → 502" tests still pass.
- **`.env` key rename is a breaking local step** → call it out in `.env.example` + `DOCKER_SETUP.md`;
  the user updates their gitignored `.env` once.
- **`env_file` injects unrelated keys into core-api** → harmless; .NET only binds keys it recognizes.

## Migration Plan

1. Set container defaults on the affected `Options`/`NtfyOptions`.
2. Move localhost addresses from `appsettings.json` → `appsettings.Development.json`.
3. Trim `appsettings.json` to `Enabled` + non-secret config + dev-default creds.
4. Rewrite `.env`/`.env.example` to .NET-style secret keys; add `env_file: .env` to core-api; delete
   all `Plugins__*` lines from compose.
5. Rebuild + boot the stack; confirm each tile renders (config resolved) and run gates + E2E.

Rollback = revert the commit; no persisted state changes.

## Open Questions

- None — the value mapping is fully enumerated above.
