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
  // 方块工坊已折叠进游戏页:工作台不再接管,由游戏页加载 workshop.js 并处理 voxel-craft
  const voxelGameJs = fs.readFileSync(path.join(root, 'voxel-adventure', 'game.js'), 'utf8');
  const voxelGameHtml = fs.readFileSync(path.join(root, 'voxel-adventure', 'index.html'), 'utf8');
  assert.match(voxelGameJs, /voxel-craft/);
  assert.match(voxelGameHtml, /workshop\.js/);
  assert.match(voxelGameHtml, /workshop-overlay/);
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
  assert.match(bridge, /playModsFromLiteracy|getPlayMods/);
  assert.doesNotMatch(bridge, /gameTickets|游戏券/);
  assert.match(shell, /workbench-bridge\.js/);
  // 方块工坊折叠进游戏页后,工作台不再加载 voxel 脚本(保持与其他主题一致的标准布局)
  assert.doesNotMatch(shell, /voxel-adventure/);
  assert.match(app, /function renderPreschoolWeeklyAdventureReport/);
  assert.match(app, /本周冒险周报|孩子本周冒险报告/);
  assert.match(css, /preschool-weekly-report/);
  assert.match(app, /function renderPreschoolVoxelHomeCard/);
  assert.match(app, /bridge\.readState/);
  assert.match(app.slice(growthStart, growthEnd), /renderPreschoolVoxelHomeCard\(\)/);
  assert.match(app, /我的家园/);
  assert.doesNotMatch(app, /史蒂夫/);
  assert.match(app, /'voxel-adventure': \{ href: '[^']+', label: '方块世界', unit: '任务', total: 12 \}/);
  assert.match(css, /preschool-voxel-home/);
  assert.match(bridge, /家园 /);
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
  // 2026-08-15 用户裁决：花园背景统一为 pvz-garden-lawn-bg.webp，角色为像素 pvz 套图
  assert.equal(fs.existsSync(path.join(root, 'garden-defense', 'assets', 'bg', 'pvz-garden-lawn-bg.webp')), true);
  assert.equal(fs.existsSync(path.join(root, 'garden-defense', 'assets', 'plants', 'plant-sunflower.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'garden-defense', 'assets', 'zombies', 'zombie-basic.webp')), true);
  assert.equal(fs.existsSync(path.join(root, 'voxel-adventure', 'assets', 'bg', 'sky-day.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'platform-quest', 'assets', 'bg', 'sky-day.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'platform-quest', 'assets', 'enemies', 'shroom-idle.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'platform-quest', 'assets', 'hero', 'explorer-walk-a.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'platform-quest', 'pixel-decor.js')), true);
  const gardenJs = fs.readFileSync(path.join(root, 'garden-defense', 'game.js'), 'utf8');
  assert.match(gardenJs, /bgKeyForStage|lawn-day|lawn-night/);
  const platformJs = fs.readFileSync(path.join(root, 'platform-quest', 'game.js'), 'utf8');
  assert.match(platformJs, /themeForLevel|sky-night|enemy-slime/);
});

test('growth content tables expose multiple stages or quests', () => {
  const stages = fs.readFileSync(path.join(root, 'garden-defense', 'data', 'stages.js'), 'utf8');
  const quests = fs.readFileSync(path.join(root, 'voxel-adventure', 'data', 'quests.js'), 'utf8');
  const levels = fs.readFileSync(path.join(root, 'platform-quest', 'data', 'levels.js'), 'utf8');
  assert.equal((stages.match(/\bS\(\d+/g) || []).length >= 12, true, 'garden should have 12 stages');
  assert.match(stages, /waves|阳光/);
  const voxelLevels = fs.readFileSync(path.join(root, 'voxel-adventure', 'data', 'levels.js'), 'utf8');
  assert.equal((voxelLevels.match(/id:\s*\d+/g) || []).length >= 8, true, 'voxel should have 8 region levels');
  assert.match(voxelLevels, /region:|grassland|goal:/);
  assert.match(levels, /checkpoints/);
  assert.equal((levels.match(/\bL\(\d+/g) || []).length >= 14, true, 'platform should have 14 levels');
  assert.match(levels, /function plantOn\(/);
  assert.match(levels, /L\(11, '硬壳山谷'/);
  assert.match(levels, /L\(1,\s*'青青草地',\s*6400/);
  assert.match(levels, /groundsFromPits/, 'levels must cut the floor into segments with pits');
  assert.match(levels, /function stairs\(/, 'levels must include Mario-like stair stacks');
  assert.match(levels, /function underMap\(/, 'levels must ship an underground pipe room');
  assert.match(levels, /'ball'/, 'question blocks can drop a bouncing-ball item');
  assert.match(levels, /L\(2, '砖块台阶'[\s\S]*?\[enemyOn\(12\)/, 'level 2 first enemy must stand off the pipe');
});

test('badge totals derive from the catalog length, never hardcoded', () => {
  const achievements = fs.readFileSync(path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'preschool-achievements.js'), 'utf8');
  const bridge = fs.readFileSync(path.join(root, 'shared', 'workbench-bridge.js'), 'utf8');
  assert.match(achievements, /BADGE_COUNT = BADGE_ORDER\.length/);
  assert.match(bridge, /badgeTotal: badges\.length/);
  for (const src of [achievements, bridge, fs.readFileSync(path.join(fileURLToPath(new URL('..', import.meta.url)), 'prj', 'app.js'), 'utf8')]) {
    assert.doesNotMatch(src, /badgeTotal\s*[:=]\s*11\b/, 'badge total must not be hardcoded to 11');
  }
});
