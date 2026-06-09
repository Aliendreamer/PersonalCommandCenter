import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Write `version` into the `<Version>` element of an MSBuild props file, so .NET projects
 * share the workspace version. Adds the element to the first <PropertyGroup> if absent.
 * Idempotent.
 */
export function stampDotNetVersion(propsPath, version) {
  const original = readFileSync(propsPath, 'utf8');

  const updated = /<Version>.*?<\/Version>/s.test(original)
    ? original.replace(/<Version>.*?<\/Version>/s, `<Version>${version}</Version>`)
    : original.replace(/<PropertyGroup>/, `<PropertyGroup>\n    <Version>${version}</Version>`);

  writeFileSync(propsPath, updated);
  return updated;
}

// CLI: node tools/stamp-dotnet-version.mjs <version> [propsPath]
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2];
  const propsPath = process.argv[3] ?? 'Directory.Build.props';
  if (!version) {
    console.error('usage: node tools/stamp-dotnet-version.mjs <version> [propsPath]');
    process.exit(1);
  }
  stampDotNetVersion(propsPath, version);
  console.log(`Stamped .NET <Version> = ${version} in ${propsPath}`);
}
