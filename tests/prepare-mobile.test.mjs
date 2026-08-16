import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const distRoot = path.join(repoRoot, 'dist');

function scriptRefsFromWorkbenchHtml() {
  const html = fs.readFileSync(path.join(prjRoot, 'preschool-workbench', 'index.html'), 'utf8');
  return Array.from(html.matchAll(/src="\.\.\/([^"?]+\.js)/g), (match) => match[1]);
}

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
  assert.equal(fs.existsSync(path.join(distRoot, 'games', 'blocklegend', 'index.html')), true);
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
    path.join(distRoot, 'visual-tests')
  ];
  const present = banned.filter((item) => fs.existsSync(item));
  assert.deepEqual(present, [], `dist/ still has unused paths: ${present.join(', ')}`);
});
