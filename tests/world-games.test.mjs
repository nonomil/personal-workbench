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
  const voxelLevels = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'data', 'levels.js'), 'utf8');
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
  assert.match(gardenScript, /placeDefensePlant|tickDefense|spawnDefenseWave/);
  assert.match(gardenScript, /drawZombieActor|zombie-conehead|zombie-buckethead/);
  assert.match(gardenScript, /boardMetrics|lawnFromEvent|阳光/);
  assert.match(gardenScript, /laneH \* 1\.62/);
  assert.match(gardenScript, /laneH \* 2\.05/);
  assert.match(gardenScript, /任意种植|lawnFromEvent/);
  assert.match(gardenScript, /function collectSun|spawnSkySun/);
  assert.doesNotMatch(gardenScript, /function useSkill/);
  assert.doesNotMatch(gardenScript, /fillRect\(x \+ 1, y \+ 1, m\.cell - 2/);
  assert.match(voxelScript, /quest|inventory|breakBlock|placeBlock/i);
  assert.match(voxelScript, /isPassable|stepChase|MAX_HP/);
  assert.match(voxel, /点击挖矿|右键\/长按放置/);
  assert.match(voxelScript, /mineBlock|点击挖矿|长按放置/);
  assert.match(voxelScript, /const GAME_ID = 'voxel-adventure'/);
  assert.match(voxelScript, /VoxelLevels|cameraX|走到出口/);
  assert.match(voxelScript, /cameraY = Math.round\(Math.max\(0, maxCamY\)\)/);
  assert.match(voxelScript, /kubo-sandbox|ikx337|VoxelPixelTiles|pixel-tiles|DS-Scratch/);
  assert.match(voxelScript, /wood_pick|stone_pick|levelGoalMet/);
  assert.match(voxelScript, /explorer-idle|SPRITE_W|explorerPose/);
  assert.match(voxelScript, /sky-day|skyDusk|regionSky/);
  assert.match(voxelScript, /startMine|explorer-mine|drawPickSwing/);
  assert.match(voxelScript, /spark-idle|sparkPose|sparkWalkA/);
  assert.match(voxelScript, /slime-idle|shroom-idle|ENEMY_ART/);
  assert.match(voxelLevels, /slime|shroom/);
  assert.match(voxelScript, /player\.y \+ 1/);
  assert.match(voxelScript, /VIEW_COLS|isVoid|掉下去了/);
  assert.doesNotMatch(voxelScript, /Creeper|Steve|苦力怕/);
  assert.doesNotMatch(voxel, /冲旗/);
  assert.doesNotMatch(voxel, /横版过关/);
  assert.doesNotMatch(voxel, /我的世界|Minecraft/);
  assert.doesNotMatch(garden, /我的世界|Minecraft|马里奥|Mario|植物大战僵尸|Plants vs/);
  assert.match(platformScript, /jump|coin|flag|platform|run|idle|ground/i);
  assert.match(platformScript, /coyote|jumpBuffer|tryJump|COYOTE_MS/i);
  assert.match(platformScript, /isInvincible|canAirJump|INVINCIBLE_MS/);
  assert.match(platformScript, /blocks|bumpBlock|heart-count|STAR_INVINCIBLE_MS|FRICTION/);
  assert.match(platformScript, /platform-mystery-block|block-question/);
  assert.match(platformScript, /bestTime|checkpoints|cameraTarget|run-timer/);
  assert.match(platformScript, /playerPowered|maxAirJumpsForLevel|stage-best/);
  assert.match(platformScript, /spawnFloat|star-goals|clearTips|LEVEL_TIPS/);
  assert.doesNotMatch(platform, /Mario|马里奥|Goomba|Koopa/);
  assert.doesNotMatch(platformScript, /Mario|马里奥|Goomba|Koopa/);
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

test('launcher avoids third-party game trademark wording in public copy', () => {
  const launcher = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(launcher, /我的世界|Minecraft|马里奥|Mario|植物大战僵尸|Plants vs/);
});
