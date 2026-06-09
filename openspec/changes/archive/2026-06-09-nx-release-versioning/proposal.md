## Why

The repo has no release process: versions are static (`0.0.0`) and there is no changelog.
We want reproducible releases with a semantic version derived from our commit history and a
human-readable changelog — and a single coherent version across both the JS/Nx side and the
.NET projects, since the product is deployed as a whole.

## What Changes

- Configure **Nx Release** in **fixed** mode: one version for the whole workspace, driven by
  **Conventional Commits** (which we already write: `feat` → minor, `fix` → patch,
  `BREAKING CHANGE`/`!` → major).
- Generate a single root **`CHANGELOG.md`** grouped by commit type, and create a git tag
  `vX.Y.Z` per release.
- Add a release step that **stamps the .NET version** (`<Version>` in
  `Directory.Build.props`) to match the computed version, so core-api/plugins share it.
- Add `release` and `release:dry` scripts; perform the **first release** to establish the
  baseline (`v0.1.0`) and seed `CHANGELOG.md`.
- Document the release step in the `dev-flow` skill. **No package publishing** (private
  workspace) — versioning + changelog + tag only.

## Capabilities

### New Capabilities
- `release-management`: Conventional-commit-driven semantic versioning, changelog
  generation, git tagging, and a unified version across JS and .NET — orchestrated by Nx
  Release without publishing.

### Modified Capabilities
<!-- None. -->

## Impact

- `nx.json` (Nx Release config), root `package.json` (release scripts), the workspace
  package.json versions, `Directory.Build.props` (`<Version>`), new generated
  `CHANGELOG.md`, and the `dev-flow` skill (release step documented).
- Depends on Conventional Commit discipline (already in use). No CI yet — releases are run
  locally; nothing is pushed (no git remote configured).
