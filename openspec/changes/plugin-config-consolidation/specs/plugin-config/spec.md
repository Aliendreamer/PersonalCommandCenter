## ADDED Requirements

### Requirement: Plugin config is layered by kind

Plugin configuration SHALL be sourced by kind: a plugin's container-deployment addresses SHALL be the
defaults on its `Options` class; non-secret deployment config and each plugin's `Enabled` flag SHALL
live in `appsettings.json`; secrets SHALL be supplied at runtime via environment variables. Each
plugin SHALL resolve the same effective configuration as before this change.

#### Scenario: Container run needs no plugin environment

- **WHEN** core-api runs in the container with no `Plugins__*` environment variables set
- **THEN** each enabled plugin resolves its container address from its `Options` default and operates
  exactly as it did when the address was passed via compose

#### Scenario: Host development run resolves localhost

- **WHEN** core-api runs on the host under the `Development` environment
- **THEN** `appsettings.Development.json` overrides the container addresses with `localhost` so the
  plugins reach host-published services

### Requirement: docker-compose contains no plugin configuration

`docker-compose.yml` SHALL NOT contain any `Plugins__*` environment entries for core-api. Plugin
secrets SHALL be injected into the container via an `env_file` that loads `.env`, whose keys are in
.NET configuration form (e.g. `Plugins__Coding__ApiKey`).

#### Scenario: No plugin env in compose

- **WHEN** the core-api service definition in `docker-compose.yml` is inspected
- **THEN** it contains no `Plugins__*` entries, and it declares `env_file: .env`

#### Scenario: A secret from .env reaches the plugin

- **WHEN** `.env` defines `Plugins__Coding__ApiKey=<key>` and the stack is started
- **THEN** the coding plugin authenticates to Wakapi with that key (the tile renders data, not a 502)

### Requirement: Secrets are documented and not committed

Every plugin secret key SHALL be documented in `.env.example` in .NET configuration form, and real
secret values SHALL remain gitignored. Committed dev-default credentials MAY remain in
`appsettings.json` where they are already non-sensitive dev values.

#### Scenario: Example enumerates secret keys

- **WHEN** `.env.example` is inspected
- **THEN** it lists each plugin secret key (e.g. `Plugins__Iot__HomeAssistant__Token`,
  `Plugins__Coding__ApiKey`, `Plugins__Goodreads__UserId`) with empty values

#### Scenario: Missing secret degrades, not crashes

- **WHEN** a plugin's secret key is absent from `.env`
- **THEN** that plugin degrades to its configured failure mode (e.g. `502`) without affecting others
