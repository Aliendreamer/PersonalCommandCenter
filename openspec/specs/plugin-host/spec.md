# plugin-host Specification

## Purpose

The .NET core's plugin contract, `appsettings`-driven activation, and the `/api/plugins`
manifest endpoint that lets compile-time plugin modules register themselves with the host.
## Requirements
### Requirement: Plugin contract

The core API SHALL define an `IPlugin` contract that every plugin implements, exposing a
stable `Id`, a `Manifest` (nav label, widget ids, route base), and a `Configure` method for
registering its services and options. Plugins SHALL expose their HTTP routes as **FastEndpoints
endpoint classes** (grouped under a per-plugin route prefix), which the host discovers by
scanning the plugin assemblies — the contract SHALL NOT include a `MapEndpoints` method.

#### Scenario: A plugin implements the contract

- **WHEN** a plugin type implementing `IPlugin` is present in the build
- **THEN** the host can read its `Id` and `Manifest` and invoke `Configure` without knowing the
  concrete type, and the plugin's FastEndpoints endpoint classes are discovered from its assembly

### Requirement: appsettings-driven activation

The core API SHALL activate a plugin only when `Plugins:{id}:Enabled` is `true` in
configuration, and SHALL pass each activated plugin its own configuration section. Endpoints of
a disabled plugin SHALL NOT be registered.

#### Scenario: Enabled plugin is activated

- **WHEN** the core starts with `Plugins:System:Enabled = true`
- **THEN** the `system` plugin's `Configure` runs and its FastEndpoints endpoints are reachable
  (subject to the authentication gate)

#### Scenario: Disabled plugin is not activated

- **WHEN** the core starts with `Plugins:System:Enabled = false`
- **THEN** the `system` plugin's endpoints are not registered and it does not appear in the
  manifest

### Requirement: Plugin manifest endpoint

The core API SHALL expose `GET /api/plugins` returning the manifests of all currently
enabled plugins (id, nav label, widget ids, route base).

#### Scenario: Manifest lists only enabled plugins

- **WHEN** a client requests `GET /api/plugins` with only `system` enabled
- **THEN** the response contains the `system` manifest and no disabled plugins

### Requirement: Defensive activation

The core API SHALL isolate plugin activation failures: if a plugin throws during discovery
or `Configure`, the core SHALL log the failure, skip that plugin, omit it from the manifest,
and continue running with the remaining plugins.

#### Scenario: A failing plugin does not crash the core

- **WHEN** a plugin throws during `Configure`
- **THEN** the core continues to start, `/api/plugins` omits the failed plugin, and other
  enabled plugins remain available

### Requirement: Plugin endpoints require authentication

Plugin endpoints registered with the host SHALL require an authenticated session by default;
only the dedicated auth endpoints and health are anonymous (see the `auth` capability).

#### Scenario: Plugin endpoint rejects anonymous access

- **WHEN** an enabled plugin's endpoint is called with no session
- **THEN** the host returns 401

