import { execFileSync } from 'node:child_process';
import { releaseChangelog, releaseVersion } from 'nx/release';
import { stampDotNetVersion } from './stamp-dotnet-version.mjs';

// Orchestrates a fixed release: version (Conventional Commits) -> stamp .NET -> changelog,
// then one commit + tag including the stamped Directory.Build.props. Use --dry-run to
// preview and --first-release to seed the baseline.
const dryRun = process.argv.includes('--dry-run');
const firstRelease = process.argv.includes('--first-release');

const { workspaceVersion } = await releaseVersion({
  dryRun,
  firstRelease,
  // Seed the very first release at 0.1.0; afterwards Conventional Commits drive the bump.
  specifier: firstRelease ? '0.1.0' : undefined,
  gitCommit: false,
  gitTag: false,
  stageChanges: false,
});

if (workspaceVersion && !dryRun) {
  stampDotNetVersion('Directory.Build.props', workspaceVersion);
}

await releaseChangelog({
  dryRun,
  firstRelease,
  version: workspaceVersion,
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
