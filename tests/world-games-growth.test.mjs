import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'games');

test('preschool home surfaces three world progress and daily game sun cap', () => {
  const app = fs.readFileSync(path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'css', 'preschool', '28-world-progress.css'), 'utf8');
  const manifest = fs.readFileSync(path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'css', 'preschool-workbench.css'), 'utf8');
  const bridge = fs.readFileSync(path.join(root, 'shared', 'workbench-bridge.js'), 'utf8');
  const shell = fs.readFileSync(path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'preschool-workbench', 'index.html'), 'utf8');
  assert.match(app, /function renderPreschoolHomeWorldProgress\(/);
  assert.match(app, /function getDailyGameSunEarned\(/);
  assert.match(app, /function getWorldGameProgressRows\(/);
  assert.match(app, /DAILY_GAME_SUN_CAP\s*=\s*80/);
  assert.match(app, /今日游戏阳光/);
  const homeStart = app.indexOf('function renderPreschoolHomeOverview(derived)');
  const homeEnd = app.indexOf('function renderPreschoolPage(derived)', homeStart);
  const growthStart = app.indexOf('function renderPreschoolGrowth()');
  const growthEnd = app.indexOf('function renderPreschoolPlans', growthStart);
  assert.doesNotMatch(app.slice(homeStart, homeEnd), /renderPreschoolHomeWorldProgress\(\)/);
  assert.match(app.slice(growthStart, growthEnd), /renderPreschoolHomeWorldProgress\(\)/);
  assert.match(app, /openPreschoolWorldGame\(forcedTheme/);
  assert.match(app, /voxel-craft/);
  assert.match(app, /data-theme-id=/);
  assert.match(app, /getAdventureMetaView|adventureTitle|三世界长期冒险/);
  assert.match(css, /preschool-world-progress/);
  assert.match(css, /preschool-world-daily-sun/);
  assert.match(css, /preschool-adventure-meta/);
  assert.match(manifest, /28-world-progress\.css/);
  assert.match(bridge, /recordPlaySession/);
  assert.match(bridge, /getMetaSummary/);
  assert.match(bridge, /getWeeklyReport/);
  assert.match(bridge, /ADVENTURE_RANKS|MILESTONES/);
  assert.match(bridge, /grantProgressPoints/);
  assert.match(shell, /workbench-bridge\.js/);
  assert.match(shell, /voxel-adventure\/data\/world\.js/);
  assert.match(app, /function renderPreschoolWeeklyAdventureReport/);
  assert.match(app, /本周冒险周报|孩子本周冒险报告/);
  assert.match(css, /preschool-weekly-report/);
});

test('each world game is a self-contained folder with data and growth bridge', () => {
  ['garden-defense', 'voxel-adventure', 'platform-quest'].forEach((name) => {
    const dir = path.join(root, name);
    assert.equal(fs.existsSync(path.join(dir, 'index.html')), true, name + ' index');
    assert.equal(fs.existsSync(path.join(dir, 'game.js')), true, name + ' game.js');
    assert.equal(fs.existsSync(path.join(dir, 'assets')), true, name + ' assets dir');
  });

  assert.equal(fs.existsSync(path.join(root, 'shared', 'workbench-bridge.js')), true);
  assert.equal(fs.existsSync(path.join(root, 'garden-defense', 'data', 'stages.js')), true);
  assert.equal(fs.existsSync(path.join(root, 'voxel-adventure', 'data', 'quests.js')), true);
  assert.equal(fs.existsSync(path.join(root, 'voxel-adventure', 'workshop.js')), true);
  const workshop = fs.readFileSync(path.join(root, 'voxel-adventure', 'workshop.js'), 'utf8');
  assert.match(workshop, /voxel-craft|Crafting Table/);
  assert.equal(fs.existsSync(path.join(root, 'platform-quest', 'data', 'levels.js')), true);

  const bridge = fs.readFileSync(path.join(root, 'shared', 'workbench-bridge.js'), 'utf8');
  assert.match(bridge, /awardSunlight/);
  assert.match(bridge, /worldGames/);
  assert.match(bridge, /DAILY_GAME_SUN_CAP/);
  assert.match(bridge, /petbank_huchuliang_preschool_workbench_state_v1/);

  const gardenHtml = fs.readFileSync(path.join(root, 'garden-defense', 'index.html'), 'utf8');
  const voxelHtml = fs.readFileSync(path.join(root, 'voxel-adventure', 'index.html'), 'utf8');
  const platformHtml = fs.readFileSync(path.join(root, 'platform-quest', 'index.html'), 'utf8');
  assert.match(gardenHtml, /workbench-bridge\.js/);
  assert.match(voxelHtml, /workbench-bridge\.js/);
  assert.match(platformHtml, /workbench-bridge\.js/);
  assert.match(gardenHtml, /stages\.js|成长关卡/);
  assert.match(voxelHtml, /levels\.js|quests\.js|成长关卡/);
  assert.match(platformHtml, /levels\.js|成长关卡/);
});

test('each world game ships local stage-themed assets under its own assets folder', () => {
  assert.equal(fs.existsSync(path.join(root, 'garden-defense', 'assets', 'bg', 'lawn-day.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'garden-defense', 'assets', 'bg', 'lawn-night.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'voxel-adventure', 'assets', 'bg', 'sky-day.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'platform-quest', 'assets', 'bg', 'sky-day.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'platform-quest', 'assets', 'enemies', 'enemy-brownie.png')), true);
  const gardenJs = fs.readFileSync(path.join(root, 'garden-defense', 'game.js'), 'utf8');
  assert.match(gardenJs, /bgKeyForStage|lawn-day|lawn-night/);
  const platformJs = fs.readFileSync(path.join(root, 'platform-quest', 'game.js'), 'utf8');
  assert.match(platformJs, /themeForLevel|sky-night|enemy-slime/);
});

test('growth content tables expose multiple stages or quests', () => {
  const stages = fs.readFileSync(path.join(root, 'garden-defense', 'data', 'stages.js'), 'utf8');
  const quests = fs.readFileSync(path.join(root, 'voxel-adventure', 'data', 'quests.js'), 'utf8');
  const levels = fs.readFileSync(path.join(root, 'platform-quest', 'data', 'levels.js'), 'utf8');
  // stages.js uses S(1, ...) / levels use L(1, ...)
  assert.equal((stages.match(/\bS\(\d+/g) || []).length >= 12, true, 'garden should have 12 stages');
  assert.match(stages, /waves|阳光/);
  const voxelLevels = fs.readFileSync(path.join(root, 'voxel-adventure', 'data', 'levels.js'), 'utf8');
  assert.equal((voxelLevels.match(/id:\s*\d+/g) || []).length >= 8, true, 'voxel should have 8 region levels');
  assert.match(voxelLevels, /region:|grassland|goal:/);
  assert.equal((levels.match(/\bL\(\d+/g) || []).length >= 10, true, 'platform should have 10 levels');
});
