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
});
