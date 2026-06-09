## Context

Nx (22) ships **Nx Release** (`nx release`), which versions packages, generates changelogs,
and tags releases. It natively understands JS package.json files; our .NET projects are not
Nx projects, so the .NET version must be stamped separately. The repo currently sits at
`0.0.0` with conventional commit history already in place.

## Goals / Non-Goals

**Goals:**
- One semantic version for the whole repo, bumped from Conventional Commits.
- A single root `CHANGELOG.md`, grouped by type, updated each release.
- A `vX.Y.Z` git tag per release.
- `.NET` `<Version>` kept in lockstep with the JS version.
- A dry-run mode to preview a release.

**Non-Goals:**
- Publishing packages to any registry (workspace is private).
- Independent per-project versions.
- CI automation (releases are run locally for now).

## Decisions

- **Fixed versioning, single changelog.** `nx.json` `release.projects` covers the workspace
  with `release.version.conventionalCommits = true` and
  `release.changelog.workspaceChangelog = true` (root `CHANGELOG.md`),
  `release.changelog.projectChangelogs = false`. Tag format `v{version}`.
  *Alternative:* independent versioning — rejected as ceremony we don't need for a single
  deployed product.
- **Root `package.json` is the source of truth for the version.** `nx release version`
  updates the workspace package versions; a small post-version Node script
  (`tools/stamp-dotnet-version.mjs`) reads the resolved version and writes `<Version>` into
  `Directory.Build.props`. *Alternative:* a custom Nx version-actions plugin for .NET —
  heavier than needed; a script is sufficient and testable.
- **Conventional Commits drive the bump.** `feat` → minor, `fix` → patch, `!`/`BREAKING
  CHANGE` → major. Pre-1.0 the first release pins the baseline at `0.1.0` via
  `nx release --first-release`.
- **No publish.** We run `nx release version` + `nx release changelog` (or `nx release`
  without `publish`); the `publish` step is never configured.

## Risks / Trade-offs

- **JS/.NET version drift** → the stamp script runs as part of the release flow and derives
  the .NET version from the single source (root version), so they can't diverge if the flow
  is followed. → Document the one command in `dev-flow`.
- **Bad/again-run release mutating files** → provide `release:dry` (`nx release --dry-run`)
  to preview; the stamp script is idempotent (writing the same version is a no-op).
- **Conventional-commit gaps** → a non-conventional commit is ignored for bumping; acceptable
  since we already follow the convention (enforced socially via `dev-flow`, not a hook yet).

## Migration Plan

Greenfield process. First run uses `nx release --first-release` to set `0.1.0`, seed
`CHANGELOG.md`, stamp `Directory.Build.props`, and tag `v0.1.0`. Rollback = delete the tag
and revert the version/changelog commit (nothing is pushed).

## Open Questions

None blocking. A commit-message lint hook and CI release automation are possible later
follow-ups, out of scope here.
