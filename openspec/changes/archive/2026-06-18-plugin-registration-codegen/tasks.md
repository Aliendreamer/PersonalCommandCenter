## 1. Source generator project (TDD)

- [x] 1.1 Add `libs/plugin-generator/PluginGenerator.csproj` (`netstandard2.0`, `IsRoslynComponent`,
  references `Microsoft.CodeAnalysis.CSharp` analyzer packages)
- [x] 1.2 Write generator unit tests (`CSharpGeneratorDriver` over an in-memory compilation): a fake
  `IPlugin` impl → emitted `PccPlugins.Assemblies` lists its type; no impls → empty array — watch fail
- [x] 1.3 Implement the incremental generator: find concrete public `Pcc.Plugins.IPlugin` types in
  `ReferencedAssemblySymbols`, emit `namespace Pcc.Plugins.Generated; static class PccPlugins {
  Assembly[] Assemblies }` with `typeof(global::…).Assembly` entries — until green
- [x] 1.4 Add the generator project to `PersonalCommandCenter.slnx`

## 2. Wire core-api to the generator

- [x] 2.1 Reference the generator from `CoreApi.csproj` as an analyzer
  (`OutputItemType="Analyzer" ReferenceOutputAssembly="false"`)
- [x] 2.2 Switch `Program.cs` to `PccPlugins.Assemblies` for `PluginDiscovery.Discover` and
  `AddFastEndpoints(o => o.Assemblies = …)`; remove the manual `pluginAssemblies[]` + plugin `using`s
- [x] 2.3 Build core-api and confirm the generated array compiles + the app starts with all plugins

## 3. Glob the project plumbing

- [x] 3.1 Replace the 12 `<ProjectReference>` lines in `CoreApi.csproj` with the glob
  `Include="..\..\plugins\*\*.api\*.csproj"`
- [x] 3.2 Replace the per-plugin `COPY` lines in `apps/core-api/Dockerfile` with `COPY plugins/ plugins/`

## 4. Guard test + gates

- [x] 4.1 Add a `CoreApi.Tests` guard test: every `*Plugin.csproj` assembly under `plugins/` is present
  in `PccPlugins.Assemblies` (catches a plugin the generator missed) — watch it pass for all current plugins
- [x] 4.2 `.NET` gates green: `dotnet build` · `dotnet format --verify-no-changes` · `dotnet test`
  (all existing per-plugin endpoint/disabled tests still pass — proves equivalence to the hand array)
- [x] 4.3 Rebuild the core-api container image and boot the stack; confirm every plugin loads (routes +
  manifest), i.e. the glob'd Dockerfile copy + generated registration work end-to-end

## 5. Docs

- [x] 5.1 Rewrite `CLAUDE.md` "Adding a plugin" — backend reduces to "create the project"; note `.slnx`
  is optional and the Dockerfile/csproj/Program.cs are now automatic
