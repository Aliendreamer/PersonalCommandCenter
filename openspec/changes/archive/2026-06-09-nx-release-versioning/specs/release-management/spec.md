## ADDED Requirements

### Requirement: Conventional-commit-driven version bump

The release process SHALL compute the next semantic version from the Conventional Commits
since the previous release: `fix` → patch, `feat` → minor, and `!`/`BREAKING CHANGE` →
major. The whole workspace SHALL share one fixed version.

#### Scenario: feat commit produces a minor bump

- **WHEN** the commits since the last release include a `feat` and the current version is
  `0.1.0`
- **THEN** the release computes `0.2.0` for the whole workspace

#### Scenario: fix commit produces a patch bump

- **WHEN** the commits since the last release contain only `fix` changes and the current
  version is `0.2.0`
- **THEN** the release computes `0.2.1`

### Requirement: Changelog generation

The release process SHALL generate or update a single root `CHANGELOG.md`, grouping the
changes since the last release by commit type under the new version heading.

#### Scenario: Changelog updated on release

- **WHEN** a release runs with new `feat` and `fix` commits
- **THEN** `CHANGELOG.md` gains a section for the new version listing those changes grouped
  by type

### Requirement: Git tag per release

The release process SHALL create a git tag `vX.Y.Z` matching the new version.

#### Scenario: Tag created

- **WHEN** a release produces version `0.2.0`
- **THEN** a git tag `v0.2.0` is created

### Requirement: Unified .NET version

The release process SHALL stamp the .NET version so `<Version>` in `Directory.Build.props`
equals the released version, keeping core-api and plugins in lockstep with the JS version.

#### Scenario: .NET version matches after release

- **WHEN** a release produces version `0.2.0`
- **THEN** `Directory.Build.props` `<Version>` is `0.2.0`

### Requirement: Dry-run preview

The release process SHALL provide a dry-run that reports the computed version and changelog
without modifying files, version control, or tags.

#### Scenario: Dry run makes no changes

- **WHEN** the release is run in dry-run mode
- **THEN** the next version and changelog are reported and no files, commits, or tags change

### Requirement: No package publishing

The release process SHALL NOT publish packages to any registry; it performs versioning,
changelog, and tagging only.

#### Scenario: Release does not publish

- **WHEN** a release runs
- **THEN** no package is pushed to npm or any other registry
