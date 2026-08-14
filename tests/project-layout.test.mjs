import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');

test('keeps product runtime under prj/ and toolchain at repo root', () => {
  const rootEntries = fs.readdirSync(repoRoot);
  assert.equal(rootEntries.includes('prj'), true, 'prj/ missing');
  assert.equal(rootEntries.includes('docs'), true, 'docs/ missing');
  assert.equal(rootEntries.includes('tests'), true, 'tests/ missing');
  assert.equal(rootEntries.includes('scripts'), true, 'scripts/ missing');
  assert.equal(rootEntries.includes('package.json'), true);
  assert.equal(rootEntries.includes('capacitor.config.json'), true);

  // Runtime shells and workbenches live under prj, not repo root.
  for (const name of [
    'app.js',
    'launcher.js',
    'config.js',
    'storage.js',
    'styles.css',
    'assets',
    'css',
    'games',
    'preschool-workbench',
    '成人成长工作台',
    '儿童学习工作台'
  ]) {
    assert.equal(fs.existsSync(path.join(prjRoot, name)), true, `prj/${name} missing`);
    assert.equal(fs.existsSync(path.join(repoRoot, name)), false, `${name} should not stay at repo root`);
  }
});

test('prepare-mobile and release-verify read from prj/', () => {
  const prepare = fs.readFileSync(path.join(repoRoot, 'scripts', 'prepare-mobile.mjs'), 'utf8');
  const release = fs.readFileSync(path.join(repoRoot, 'scripts', 'release-verify.mjs'), 'utf8');
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'android-apk.yml'), 'utf8');
  const pkg = fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8');

  assert.match(prepare, /['"]prj['"]|join\([^)]*['"]prj['"]/);
  assert.match(release, /['"]prj['"]|join\([^)]*['"]prj['"]/);
  assert.match(workflow, /node --check prj\/launcher\.js/);
  assert.match(pkg, /"test":\s*"node --test(?: --test-concurrency=1)? tests\/\*\.test\.mjs"/);
});

test('repo root keeps a thin Pages entry that points at prj launcher', () => {
  const rootIndex = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  assert.match(rootIndex, /prj\/index\.html|href=["']\.\/prj\//);
  assert.doesNotMatch(rootIndex, /data-launcher-group="preschool-worlds"/);

  const prjIndex = fs.readFileSync(path.join(prjRoot, 'index.html'), 'utf8');
  assert.match(prjIndex, /data-launcher-group="preschool-worlds"/);
  assert.match(prjIndex, /launcher\.js/);
});
