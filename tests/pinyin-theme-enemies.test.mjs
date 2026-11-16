import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const prjRoot = path.join(repoRoot, 'prj');
const app = fs.readFileSync(path.join(prjRoot, 'app.js'), 'utf8');
const css56 = fs.readFileSync(path.join(prjRoot, 'css', 'preschool', '56-phone-landscape-focus.css'), 'utf8');

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `missing source boundary: ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(end > start, `missing source boundary: ${endText}`);
  return source.slice(start, end);
}

test('E1 per-theme enemy map covers all three themes', () => {
  assert.match(app, /PINYIN_SCENE_ENEMIES|PRESCHOOL_SCENE_ENEMIES/);
  const map = sourceBetween(app, 'PRESCHOOL_SCENE_ENEMIES = {', '};');
  assert.match(map, /'garden-defense'/);
  assert.match(map, /'voxel-adventure'/);
  assert.match(map, /'platform-quest'/);
  // voxel 用方块怪物，platform 用障碍物
  assert.match(map, /creeper/);
  assert.match(map, /platform-brick/);
  // 僵尸仍是 garden 的敌人
  assert.match(map, /zombie-basic/);
});

test('E2 voxel enemy assets resolve to the roster front views', () => {
  const voxel = sourceBetween(app, 'PRESCHOOL_SCENE_ENEMIES = {', 'function preschoolSceneEnemyArt');
  assert.match(voxel, /voxel-enemy-creeper\.png/);
  assert.match(voxel, /preschool-theme-assets\/voxel-v1/);
  assert.match(voxel, /skeleton/);
});

test('E3 zombie rail renders for every theme and flags obstacle themes', () => {
  const rail = sourceBetween(app, 'function renderPreschoolSceneZombieRail', 'function getLiteracyWritingState');
  // 不再 garden-only
  assert.doesNotMatch(rail, /getPreschoolThemeId\(\) !== 'garden-defense' return ''/);
  assert.match(rail, /is-obstacle/);
});

test('E4 scene battlefield css extends to voxel theme and calms obstacle lurch', () => {
  assert.match(css56, /data-world-theme="voxel-adventure"/);
  assert.match(css56, /\.preschool-scene-zombie-rail\.is-obstacle/);
  assert.match(css56, /animation: none/);
});
