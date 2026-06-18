## ADDED Requirements

### Requirement: Plugin projects are referenced and copied by convention

core-api SHALL reference every plugin project via a glob over `plugins/*/*.api/*.csproj`, and the
container build SHALL copy the whole `plugins/` directory, so that adding a plugin project requires no
edit to `CoreApi.csproj`, the `Dockerfile`, or `.slnx`.

#### Scenario: A new plugin project is referenced without editing csproj

- **WHEN** a new `plugins/<name>/<name>.api/<Name>Plugin.csproj` is added
- **THEN** core-api references it automatically via the glob, with no `CoreApi.csproj` edit

#### Scenario: The container build includes a new plugin without a Dockerfile edit

- **WHEN** a new plugin project is added and the core-api image is built
- **THEN** the build compiles and publishes it via the whole-directory copy, with no `Dockerfile` edit

### Requirement: Plugin assemblies are registered by a build-time source generator

A build-time source generator SHALL emit the host's plugin-assembly array from the concrete
`Pcc.Plugins.IPlugin` implementations found in the referenced plugin assemblies, and the host SHALL use
that generated array for plugin discovery and endpoint registration. Registration SHALL remain
compile-time with no runtime filesystem assembly scanning, and `Plugins:<Id>:Enabled` gating SHALL be
unchanged.

#### Scenario: A new plugin is registered without editing Program.cs

- **WHEN** a new plugin project implementing `IPlugin` is added and the solution is built
- **THEN** the generated assembly array includes the new plugin's assembly, and the host discovers it
  without any edit to `Program.cs`

#### Scenario: Every plugin assembly is present in the generated array

- **WHEN** the generated `PccPlugins.Assemblies` is compared against the `*Plugin.csproj` projects under
  `plugins/`
- **THEN** every plugin assembly appears exactly once

#### Scenario: Disabled gating still applies

- **WHEN** `Plugins:<Id>:Enabled` is `false` for a generated/registered plugin
- **THEN** the plugin is not activated and its endpoints are not served (unchanged behavior)
