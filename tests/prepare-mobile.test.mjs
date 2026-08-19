import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { shouldCopyMobilePath } from '../scripts/prepare-mobile.mjs';
import { stampGradleRelease, versionCodeFromName } from '../scripts/stamp-android-release.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const distRoot = path.join(repoRoot, 'dist');

function scriptRefsFromWorkbenchHtml() {
  const html = fs.readFileSync(path.join(prjRoot, 'preschool-workbench', 'index.html'), 'utf8');
  return Array.from(html.matchAll(/src="\.\.\/([^"?]+\.js)/g), (match) => match[1]);
}

test('prepare-mobile keeps only workbench game folders', () => {
  assert.equal(shouldCopyMobilePath('games/garden-defense/index.html'), true);
  assert.equal(shouldCopyMobilePath('games/voxel-craft/index.html'), true);
  assert.equal(shouldCopyMobilePath('games/blocklegend/index.html'), false);
  assert.equal(shouldCopyMobilePath('games/focus-arcade/LICENSE-brain-planet.txt'), false);
  assert.equal(shouldCopyMobilePath('assets/generated/garden-zombie-v4/raw/garden-walker.png'), false);
});

test('android release stamp raises versionCode with package version', () => {
  assert.equal(versionCodeFromName('0.7.3'), 703);
  assert.equal(versionCodeFromName('0.7.4'), 704);
  const stamped = stampGradleRelease(
    'android {\n    defaultConfig {\n        versionCode 1\n        versionName "1.0"\n    }\n    buildTypes {\n        release {\n            minifyEnabled false\n        }\n    }\n}\n',
    { versionName: '0.7.4', versionCode: 704 }
  );
  assert.match(stamped, /versionCode 704/);
  assert.match(stamped, /versionName "0.7.4"/);
  assert.match(stamped, /buildTypes\s*\{\s*release\s*\{\s*signingConfig signingConfigs\.release/);
  assert.doesNotMatch(stamped, /signingConfigs\s*\{\s*release\s*\{\s*signingConfig/);
});

test('prepare-mobile copies every preschool workbench script into dist/', () => {
  const refs = scriptRefsFromWorkbenchHtml();
  assert.ok(refs.includes('preschool-pet.js'));
  assert.ok(refs.includes('preschool-literacy.js'));
  assert.ok(refs.includes('app.js'));

  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'prepare-mobile.mjs')], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const missing = refs.filter((relative) => !fs.existsSync(path.join(distRoot, relative)));
  assert.deepEqual(missing, [], `dist/ missing workbench scripts: ${missing.join(', ')}`);
  assert.equal(fs.existsSync(path.join(distRoot, 'data')), true, 'dist/data missing');
  assert.equal(fs.existsSync(path.join(distRoot, 'games', 'garden-defense', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'games', 'voxel-craft', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'games', 'platform-quest', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'games', 'wordboss', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(distRoot, 'games', 'blocklegend')), false);
  assert.equal(fs.existsSync(path.join(distRoot, 'games', 'focus-arcade')), false);
  assert.equal(
    fs.existsSync(path.join(distRoot, 'assets', 'generated', 'preschool-pvz-2d', 'published', 'pvz-sun-token.png')),
    true
  );
  assert.equal(
    fs.existsSync(path.join(distRoot, 'assets', 'generated', 'preschool-theme-assets', 'platform-v2', 'reference', 'platform-page-bg.webp')),
    true
  );
});

test('prepare-mobile keeps generated intermediates and local dumps out of dist/', () => {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'prepare-mobile.mjs')], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const banned = [
    path.join(distRoot, 'games', 'ref'),
    path.join(distRoot, 'games', '_backup'),
    path.join(distRoot, 'games', 'blocklegend-v0.zip'),
    path.join(distRoot, 'games', 'blocklegend', 'docs'),
    path.join(distRoot, 'assets', 'generated', 'preschool-pvz-2d', 'raw'),
    path.join(distRoot, 'assets', 'generated', 'world-rebuild-20260807'),
    path.join(distRoot, 'assets', 'generated', 'garden-zombie-v4'),
    path.join(distRoot, 'assets', 'generated', 'platform-hero'),
    path.join(distRoot, 'assets', 'generated', 'voxel-paper-mc'),
    path.join(distRoot, 'assets', 'generated', 'game-asset-pipeline-smoke'),
    path.join(distRoot, 'assets', 'vocab', 'wordquest-vocab-2026.08.15'),
    path.join(distRoot, 'visual-tests')
  ];
  const present = banned.filter((item) => fs.existsSync(item));
  assert.deepEqual(present, [], `dist/ still has unused paths: ${present.join(', ')}`);
});
