## Why

Registering a backend plugin requires editing four mechanical places — `CoreApi.csproj`
(`ProjectReference`), `Program.cs` (`using` + the `pluginAssemblies[]` entry), the `Dockerfile` (two
`COPY` lines), and `.slnx` — none of which is the actual plugin. Missing one breaks the build or
silently drops the plugin (the `Dockerfile` is a non-obvious 5th wiring place that broke the container
build for the `coding` plugin). This change makes plugin registration self-populating at **compile
time**, so adding a plugin needs no registration edits at all — preserving the project's deliberate
"no runtime assembly scanning" stance.

## What Changes

- **Glob the plugin project references** in `CoreApi.csproj`: replace the 12 explicit
  `<ProjectReference>` lines with one `Include="..\..\plugins\*\*.api\*.csproj"`. New plugin projects
  are referenced automatically.
- **Whole-directory COPY in the `Dockerfile`**: replace the ~22 per-plugin `COPY` lines with
  `COPY plugins/ plugins/` so a new plugin needs no Dockerfile edit.
- **Add a Roslyn source generator** (new `netstandard2.0` analyzer project, e.g.
  `libs/plugin-generator/PluginGenerator.csproj`) that scans the referenced (glob'd) assemblies for
  concrete `Pcc.Plugins.IPlugin` implementations and emits a `PccPlugins.Assemblies` array. core-api
  references it as an analyzer (`OutputItemType="Analyzer" ReferenceOutputAssembly="false"`).
- **`Program.cs` consumes the generated array** for both `PluginDiscovery.Discover` and FastEndpoints'
  `o.Assemblies`, dropping the manual `pluginAssemblies[]` and all `using Pcc.Plugins.*` plugin imports.
- **`.slnx` becomes optional** — the build/test path resolves plugins via the csproj glob, so a missing
  solution entry no longer breaks anything (documented, not enforced).
- **Registration stays compile-time and explicit** (generated, type-safe, no runtime filesystem scan);
  `PluginRegistry` + `Plugins:<Id>:Enabled` gating are unchanged.

## Capabilities

### New Capabilities
- `plugin-registration`: backend plugins are referenced and registered by convention — projects are
  glob-referenced and copied, and a build-time source generator emits the host's plugin-assembly list
  from the referenced `IPlugin` implementations, with no per-plugin registration wiring.

### Modified Capabilities
<!-- none: activation/manifest behavior (plugin-host) is unchanged; only how the assembly list is built -->

## Impact

- **New project**: `libs/plugin-generator/` (incremental source generator, references
  `Microsoft.CodeAnalysis.CSharp`); referenced by `CoreApi.csproj` as an analyzer.
- **`CoreApi.csproj`**: one glob `ProjectReference` + the analyzer reference (replaces 12 lines).
- **`apps/core-api/Dockerfile`**: whole-dir `COPY plugins/ plugins/` (replaces ~22 lines).
- **`Program.cs`**: use `PccPlugins.Assemblies`; remove the manual array + plugin `using`s.
- **Tests**: generator unit tests (`CSharpGeneratorDriver`); a guard test that every `*Plugin.csproj`
  assembly is present in `PccPlugins.Assemblies`; all existing per-plugin tests stay green.
- **Docs**: rewrite `CLAUDE.md` "Adding a plugin" — the backend reduces to "create the project".
- **Depends on**: independent of `plugin-config-consolidation`; can ship before or after it.
