import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyLauncherContract } from '../scripts/release-verify.mjs';

test('release contract keeps five launcher entries in the published order', () => {
  const result = verifyLauncherContract();

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.preschoolThemes, [
    'garden-defense',
    'voxel-adventure',
    'platform-quest'
  ]);
  assert.deepEqual(result.generalVariants, ['adult', 'child']);
  assert.equal(result.checkedAssets, 5);
});

test('launcher exposes an accessible two-tier world selector', () => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const html = fs.readFileSync(path.join(projectRoot, 'prj', 'index.html'), 'utf8');

  assert.match(html, /class="launcher-skip-link"[^>]*href="#launcher-content"/);
  assert.match(html, /<main[^>]*id="launcher-content"/);
  assert.match(html, /data-launcher-group="preschool-worlds"/);
  assert.match(html, /data-launcher-group="general-workbenches"/);
  assert.match(html, /data-card-kind="world"/);
  assert.match(html, /data-card-kind="workbench"/);
  assert.match(html, /workbench-link--general/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Pages workflow deploys the prj workbench statically without Jekyll', () => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const workflow = fs.readFileSync(path.join(projectRoot, '.github', 'workflows', 'pages.yml'), 'utf8');

  assert.match(workflow, /upload-pages-artifact/);
  assert.match(workflow, /cp -a prj _pages\/prj/);
  assert.match(workflow, /path: _pages/);
  assert.doesNotMatch(workflow, /jekyll-build-pages/);
});

test('package-lock lists every package.json dependency so npm ci can install', () => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  const names = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
  const missing = names.filter((name) => !lock.packages?.[`node_modules/${name}`]);
  assert.deepEqual(missing, []);
});

test('Android workflow runs the web gates before uploading an APK', () => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const workflow = fs.readFileSync(path.join(projectRoot, '.github', 'workflows', 'android-apk.yml'), 'utf8');

  assert.match(workflow, /tests\/prepare-mobile\.test\.mjs/);
  assert.match(workflow, /run: npm run release:verify/);
  assert.match(workflow, /node --check prj\/launcher\.js/);
  assert.match(workflow, /test -s android\/app\/build\/outputs\/apk\/release\/app-release\.apk/);
});
