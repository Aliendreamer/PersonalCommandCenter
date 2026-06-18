## Context

The host already discovers plugins by **reflection over a supplied assembly array**
(`PluginDiscovery.Discover(pluginAssemblies, …)`); the only manual part is *building* that array
(`typeof(XPlugin).Assembly` per plugin) in `Program.cs`, plus the `ProjectReference`/`Dockerfile`
plumbing that makes those assemblies exist. The deliberate design choice is "no runtime filesystem
assembly scanning" — not "no reflection." So we can keep reflection over a known array while making the
array (and the project plumbing) populate itself at build time. `IPlugin` is `Pcc.Plugins.IPlugin` in
`libs/plugin-abstractions`. Plugin projects are `plugins/<name>/<name>.api/<Name>Plugin.csproj` with no
non-plugin csproj under `plugins/`.

## Goals / Non-Goals

**Goals:**
- Adding a backend plugin requires **no** edits to `CoreApi.csproj`, `Program.cs`, `Dockerfile`, `.slnx`.
- Registration is compile-time, type-safe, and explicit in generated code (no runtime disk scan).
- Equivalent behavior to today's hand-written `pluginAssemblies[]` — same assemblies, same activation.

**Non-Goals:**
- Frontend registration glue (contracts/server-fn/tile/page/index) — a separate effort.
- Runtime/dynamic plugin loading from disk — explicitly out (preserves the no-scan stance).
- Changing `PluginRegistry`, manifests, or `Plugins:<Id>:Enabled` gating.

## Decisions

**1. csproj glob for project references.** MSBuild supports recursive globs in `ProjectReference`;
`Include="..\..\plugins\*\*.api\*.csproj"` matches every plugin project and nothing else (no non-plugin
csproj live under `plugins/`). Removes the per-plugin `ProjectReference`. Alternative (keep explicit
refs) is the status quo that breaks on omission — rejected.

**2. Whole-dir Dockerfile COPY.** Replace the per-plugin `COPY` pairs (restore-layer csproj + source)
with a single `COPY plugins/ plugins/` before restore. Trade-off: any plugin change invalidates the
restore layer (coarser caching) for never editing the Dockerfile again. Acceptable for this repo.

**3. Roslyn incremental source generator for the assembly list.** A `netstandard2.0` analyzer project
inspects the core-api `Compilation`, finds concrete public types implementing `Pcc.Plugins.IPlugin`
across `compilation.SourceModule.ReferencedAssemblySymbols`, and emits:
```csharp
namespace Pcc.Plugins.Generated;
public static class PccPlugins {
  public static readonly System.Reflection.Assembly[] Assemblies =
    { typeof(global::Pcc.Plugins.Coding.CodingPlugin).Assembly, /* … */ };
}
```
Each entry references the plugin type by fully-qualified name (compile-checked). The generator sees the
plugin types because they are `ProjectReference`d (so present as compilation references). core-api adds
it as an analyzer: `<ProjectReference Include="..\..\libs\plugin-generator\PluginGenerator.csproj"
OutputItemType="Analyzer" ReferenceOutputAssembly="false" />`. Alternatives considered: an assembly
`[assembly: PccPlugin(...)]` attribute + reflection (one line per plugin, simpler but not zero);
MSBuild-templated `.g.cs` with `Assembly.Load(name)` (loads by string, no compile check). The generator
gives true zero-wiring with full type safety, at the cost of maintaining an analyzer project + its tests.

**4. `Program.cs` consumes `PccPlugins.Assemblies`.** Replace the literal array (and the
`using Pcc.Plugins.*` plugin imports) with the generated array, fed unchanged to
`PluginDiscovery.Discover` and `AddFastEndpoints(o => o.Assemblies = …)`. core-api itself has no
`IPlugin` impl, so it is naturally excluded.

**5. `.slnx` is informational.** `dotnet build`/`test` reach plugins transitively through the glob'd
`CoreApi` references, so `.slnx` membership only affects IDE/solution operations. It becomes optional;
forgetting it is harmless (documented, not gated).

## Risks / Trade-offs

- **Generator doesn't find a plugin (e.g. type not public/concrete)** → a guard test enumerates every
  `*Plugin.csproj` and asserts its assembly is in `PccPlugins.Assemblies`; fails loudly if one is missed.
- **Source-generator complexity / maintenance** → keep it tiny (one interface match, one emitted class)
  with focused `CSharpGeneratorDriver` unit tests; it has a single responsibility.
- **Glob picks up an unintended project** → the `*.api\*.csproj` shape + "no non-plugin csproj under
  plugins/" keeps it tight; the guard test would also surface a stray.
- **Coarser Docker layer caching** → accepted; build time impact is small for this repo.
- **Analyzer not re-running on plugin add** → incremental generators re-run on compilation input
  changes (a new referenced assembly is an input); a clean build always regenerates.

## Migration Plan

1. Add `libs/plugin-generator` (generator + unit tests), reference it as an analyzer from core-api.
2. Switch `Program.cs` to `PccPlugins.Assemblies`; remove the manual array + plugin `using`s.
3. Glob the `ProjectReference` in `CoreApi.csproj`; whole-dir `COPY` in the `Dockerfile`.
4. Add the guard test; run all gates + a container build to prove the generated wiring is equivalent.
5. Rewrite `CLAUDE.md` "Adding a plugin".

Rollback = revert; no persisted state.

## Open Questions

- None — the generator approach and emit shape are fixed above.
