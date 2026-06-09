import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampDotNetVersion } from './stamp-dotnet-version.mjs';

function fixture(contents) {
  const path = join(mkdtempSync(join(tmpdir(), 'stamp-')), 'Directory.Build.props');
  writeFileSync(path, contents);
  return path;
}

test('adds a <Version> element when none exists', () => {
  const path = fixture(
    '<Project>\n  <PropertyGroup>\n    <Nullable>enable</Nullable>\n  </PropertyGroup>\n</Project>\n',
  );

  stampDotNetVersion(path, '0.1.0');

  assert.match(readFileSync(path, 'utf8'), /<Version>0\.1\.0<\/Version>/);
});

test('replaces an existing <Version> and is idempotent', () => {
  const path = fixture(
    '<Project>\n  <PropertyGroup>\n    <Version>0.1.0</Version>\n  </PropertyGroup>\n</Project>\n',
  );

  stampDotNetVersion(path, '0.2.0');
  stampDotNetVersion(path, '0.2.0');

  const xml = readFileSync(path, 'utf8');
  assert.match(xml, /<Version>0\.2\.0<\/Version>/);
  assert.equal((xml.match(/<Version>/g) ?? []).length, 1);
});
