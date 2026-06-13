import { execFileSync } from 'node:child_process';
import { releaseChangelog, releaseVersion } from 'nx/release';
import { stampDotNetVersion } from './stamp-dotnet-version.mjs';

// Orchestrates a fixed release: version (Conventional Commits) -> stamp .NET -> changelog,
// then one commit + tag including the stamped Directory.Build.props. Use --dry-run to
// preview and --first-release to seed the baseline.
const dryRun = process.argv.includes('--dry-run');
const firstRelease = process.argv.includes('--first-release');

// The release makes one all-encompassing `git add -A` commit, so the tree must be clean first —
// otherwise unrelated changes get swept into the release commit.
if (!dryRun) {
  const dirty = execFileSync('git', ['status', '--porcelain']).toString().trim();
  if (dirty) {
    console.error('Working tree is not clean; commit or stash changes before releasing:\n' + dirty);
    process.exit(1);
  }
}

const { workspaceVersion, projectsVersionData } = await releaseVersion({
  dryRun,
  firstRelease,
  // Seed the very first release at 0.1.0; afterwards Conventional Commits drive the bump.
  specifier: firstRelease ? '0.1.0' : undefined,
  gitCommit: false,
  gitTag: false,
  stageChanges: false,
});

if (!workspaceVersion) {
  console.log('No release-worthy changes since the last release; nothing to do.');
  process.exit(0);
}

if (!dryRun) {
  stampDotNetVersion('Directory.Build.props', workspaceVersion);
}

await releaseChangelog({
  dryRun,
  firstRelease,
  version: workspaceVersion,
  // Required: without the per-project version data the changelog renders empty section
  // headers (no feat/fix entries).
  versionData: projectsVersionData,
  gitCommit: false,
  gitTag: false,
  stageChanges: false,
});

if (!dryRun && workspaceVersion) {
  // Arg arrays (no shell) so the version string is never interpreted by a shell.
  execFileSync('git', ['add', '-A'], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', `chore(release): v${workspaceVersion}`], {
    stdio: 'inherit',
  });
  execFileSync('git', ['tag', `v${workspaceVersion}`], { stdio: 'inherit' });
  console.log(`\nReleased v${workspaceVersion} (tag v${workspaceVersion})`);
}

process.exit(0);
