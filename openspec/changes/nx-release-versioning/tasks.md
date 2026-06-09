## 1. Nx Release configuration

- [ ] 1.1 Add `release` config to `nx.json`: fixed versioning, `version.conventionalCommits
      = true`, `changelog.workspaceChangelog = true`, `changelog.projectChangelogs = false`,
      tag format `v{version}`
- [ ] 1.2 Add root `package.json` scripts: `release` (`nx release`) and `release:dry`
      (`nx release --dry-run`)

## 2. .NET version stamping

- [ ] 2.1 (TDD) Write a failing test for `tools/stamp-dotnet-version.mjs`: given a version,
      it sets `<Version>` in a `Directory.Build.props` fixture (adds the element if missing,
      idempotent on re-run)
- [ ] 2.2 Implement `tools/stamp-dotnet-version.mjs` until 2.1 passes
- [ ] 2.3 Wire the stamp into the release flow (post-version step / release script) so it
      runs with the resolved version

## 3. First release

- [ ] 3.1 Run `nx release --first-release` (or dry-run first) to set `0.1.0`, seed
      `CHANGELOG.md`, stamp `Directory.Build.props`, and create tag `v0.1.0`
- [ ] 3.2 Verify `CHANGELOG.md` exists, `Directory.Build.props` `<Version>` is `0.1.0`, and
      the tag exists

## 4. Documentation

- [ ] 4.1 Add a "Releasing" section to the `dev-flow` skill: when to release, the command,
      and that `.NET` + JS versions stay unified

## 5. Done gate

- [ ] 5.1 `release:dry` reports the expected next version + changelog with no file changes
- [ ] 5.2 Existing gates still green: .NET build/format/test; `nx typecheck/lint/test/build`;
      prettier
