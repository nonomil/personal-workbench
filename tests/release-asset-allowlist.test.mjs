import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)));
const {
  TRADEMARK_NAME_RE,
  HERO_SLOT_CONTRACTS,
  md5FileSync,
  verifyAssetAllowlist
} = await import('../scripts/release-verify.mjs');

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-allowlist-'));
  for (const contract of HERO_SLOT_CONTRACTS) {
    const hero = path.join(dir, 'prj', 'games', contract.game, 'assets', 'hero');
    fs.mkdirSync(path.join(hero, 'papermc'), { recursive: true });
    for (const slot of contract.slots) {
      fs.writeFileSync(path.join(hero, slot), Buffer.from(`original:${contract.game}:${slot}`));
      fs.writeFileSync(path.join(hero, 'papermc', slot), Buffer.from(`original:${contract.game}:${slot}`));
    }
  }
  const hero = path.join(dir, 'prj', 'games', 'voxel-adventure', 'assets', 'hero');
  return { dir, hero };
}

const neverIgnored = () => ({ status: 1 });
const alwaysIgnored = () => ({ status: 0 });

test('trademark pattern catches mario, steve and creeper names', () => {
  assert.equal(TRADEMARK_NAME_RE.test('mario-idle.png'), true);
  assert.equal(TRADEMARK_NAME_RE.test('Steve-Run.PNG'.toLowerCase()), true);
  assert.equal(TRADEMARK_NAME_RE.test('creeper.png'), true);
  assert.equal(TRADEMARK_NAME_RE.test('green-boom.png'), false);
  assert.equal(TRADEMARK_NAME_RE.test('explorer-jump.png'), false);
});

test('clean fixture passes with matching hero slots and ignored overlays', () => {
  const { dir, hero } = makeFixture();
  fs.writeFileSync(path.join(hero, 'jumper-style-trademark-file-mario.png'), 'x');
  const result = verifyAssetAllowlist(dir, { git: alwaysIgnored });
  assert.equal(result.ok, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('trademark-named file that is not git-ignored fails the allowlist', () => {
  const { dir, hero } = makeFixture();
  fs.writeFileSync(path.join(hero, 'steve-idle.png'), 'x');
  const result = verifyAssetAllowlist(dir, { git: neverIgnored });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('steve-idle.png') && e.includes('未被 git ignore')));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('hero slot diverging from the papermc original fails the allowlist', () => {
  const { dir, hero } = makeFixture();
  fs.writeFileSync(path.join(hero, 'explorer-idle.png'), 'local overlay');
  const result = verifyAssetAllowlist(dir, { git: alwaysIgnored });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('explorer-idle.png') && e.includes('不是原创备份内容')));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('md5 helper detects byte differences', () => {
  const { dir } = makeFixture();
  const a = path.join(dir, 'a.bin');
  const b = path.join(dir, 'b.bin');
  fs.writeFileSync(a, 'same');
  fs.writeFileSync(b, 'same');
  assert.equal(md5FileSync(a) === md5FileSync(b), true);
  fs.writeFileSync(b, 'diff');
  assert.equal(md5FileSync(a) === md5FileSync(b), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('real repository has zero true violations (ignored overlays are fine)', () => {
  const result = verifyAssetAllowlist(root);
  const trueViolations = result.errors.filter((e) => !e.includes('不是原创备份内容'));
  assert.deepEqual(trueViolations, [], 'no unignored trademark assets may remain in prj/');
});
