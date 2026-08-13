import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const root = path.join(repoRoot, 'prj');

test('keeps three mini-game worlds in a separate games folder from workbench shell', () => {
  const gardenHtml = path.join(root, 'games', 'garden-defense', 'index.html');
  const voxelHtml = path.join(root, 'games', 'voxel-adventure', 'index.html');
  const platformHtml = path.join(root, 'games', 'platform-quest', 'index.html');
  const gardenJs = path.join(root, 'games', 'garden-defense', 'game.js');
  const voxelJs = path.join(root, 'games', 'voxel-adventure', 'game.js');
  const platformJs = path.join(root, 'games', 'platform-quest', 'game.js');

  assert.equal(fs.existsSync(gardenHtml), true, 'garden world html missing');
  assert.equal(fs.existsSync(voxelHtml), true, 'voxel world html missing');
  assert.equal(fs.existsSync(platformHtml), true, 'platform world html missing');
  assert.equal(fs.existsSync(gardenJs), true, 'garden world script missing');
  assert.equal(fs.existsSync(voxelJs), true, 'voxel world script missing');
  assert.equal(fs.existsSync(platformJs), true, 'platform world script missing');

  const garden = fs.readFileSync(gardenHtml, 'utf8');
  const voxel = fs.readFileSync(voxelHtml, 'utf8');
  const platform = fs.readFileSync(platformHtml, 'utf8');
  const gardenScript = fs.readFileSync(gardenJs, 'utf8');
  const voxelScript = fs.readFileSync(voxelJs, 'utf8');
  const platformScript = fs.readFileSync(platformJs, 'utf8');

  assert.match(garden, /花园|garden|保卫/i);
  assert.match(voxel, /方块|voxel|基地/i);
  assert.match(platform, /闯关|platform|金币|旗/i);
  assert.match(garden, /game\.js/);
  assert.match(voxel, /game\.js/);
  assert.match(platform, /game\.js/);
  assert.match(garden, /返回工作台|preschool-workbench/);
  assert.match(voxel, /返回工作台|preschool-workbench/);
  assert.match(platform, /返回工作台|preschool-workbench/);
  assert.match(garden, /fullscreen|全屏/i);
  assert.match(voxel, /fullscreen|全屏/i);
  assert.match(platform, /fullscreen|全屏/i);

  // Garden world may load preschool-garden rules; voxel/platform must stay isolated.
  assert.match(garden, /preschool-garden\.js/);
  assert.doesNotMatch(voxel, /preschool-garden\.js|renderPreschoolBattle|pixel-battle/);
  assert.doesNotMatch(platform, /preschool-garden\.js|renderPreschoolBattle|pixel-battle/);
  assert.match(gardenScript, /placeDefensePlant|spawnInvader|usePlantSkill/);
  assert.match(gardenScript, /boardMetrics|cell|技能|阳光/);
  assert.match(voxelScript, /jump|crystal|enemy|steve|platform|run/i);
  assert.match(platformScript, /jump|coin|flag|platform|run|idle|ground/i);
});

test('preschool workbench routes all three themes to independent world games', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const prepare = fs.readFileSync(path.join(repoRoot, 'scripts', 'prepare-mobile.mjs'), 'utf8');

  assert.match(app, /function getPreschoolThemePlaybook\(\)/);
  assert.match(app, /worldGameHref:\s*'\.\.\/games\/garden-defense\/index\.html'/);
  assert.match(app, /worldGameHref:\s*'\.\.\/games\/voxel-adventure\/index\.html'/);
  assert.match(app, /worldGameHref:\s*'\.\.\/games\/platform-quest\/index\.html'/);
  assert.match(app, /open-world-game/);
  assert.match(app, /function openPreschoolWorldGame\(/);
  assert.match(app, /navGameLabel/);
  assert.doesNotMatch(app, /voxel-adventure[\s\S]{0,120}exitGame: '去花园游戏'/);
  assert.match(prepare, /'games'/);
});
