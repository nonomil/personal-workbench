import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

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
  assert.match(gardenScript, /zombies\/zombie-basic\.webp/);
  assert.match(gardenScript, /bg\/pvz-garden-lawn-bg\.webp/);
  assert.match(garden, /zombie-showcase/);
  assert.match(gardenScript, /zombies\/zombie-football\.webp/);
  assert.match(gardenScript, /boardMetrics|lawnFromEvent|阳光/);
  assert.match(gardenScript, /laneH \* 1\.08/);
  assert.match(gardenScript, /laneH \* 2\.28/);
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
  assert.match(platformScript, /sfx\.break|spawnDebris|sfx\.question/);
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
  assert.match(app, /worldGameHref:\s*'\.\.\/games\/voxel-craft\/index\.html'/);
  assert.match(app, /worldGameHref:\s*'\.\.\/games\/platform-quest\/index\.html'/);
  assert.match(app, /open-world-game/);
  assert.match(app, /function openPreschoolWorldGame\(/);
  assert.match(app, /navGameLabel/);
  assert.doesNotMatch(app, /voxel-adventure[\s\S]{0,120}exitGame: '去花园游戏'/);
  assert.match(prepare, /'games'/);
  const battleStart = app.indexOf('function renderPreschoolBattle()');
  const battleEnd = app.indexOf('function renderPreschoolDefenseGame()', battleStart);
  assert.ok(battleStart >= 0 && battleEnd > battleStart, 'battle renderer missing');
  const battleBody = app.slice(battleStart, battleEnd);
  assert.match(battleBody, /renderPreschoolWorldGameLaunch|open-world-game/);
  assert.doesNotMatch(battleBody, /renderPixelMap\(/, 'workbench battle must launch garden-defense, not the in-page 5x6 board');
  assert.match(app, /'garden-defense': \{ href: '[^']+', label: '花园保卫', unit: '关', total: 18 \}/);
});

test('garden-defense lawn is wider and ships 18 stages', () => {
  const gardenJs = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.js'), 'utf8');
  const gardenRules = fs.readFileSync(path.join(root, 'preschool-garden.js'), 'utf8');
  const stages = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'data', 'stages.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'index.html'), 'utf8');
  const bridge = fs.readFileSync(path.join(root, 'games', 'shared', 'workbench-bridge.js'), 'utf8');
  assert.match(gardenJs, /BOARD_COLUMNS = 10/);
  assert.match(gardenRules, /BOARD_COLUMNS = 10/);
  assert.equal((stages.match(/\bS\(\d+/g) || []).length >= 18, true, 'garden should have 18 stages');
  assert.match(stages, /S\(13,/);
  assert.match(stages, /S\(18,/);
  assert.match(html, /选关 · <span id="stage-count">18<\/span>/);
  assert.match(bridge, /'garden-defense': \{ label: '花园保卫', unit: '关', done: gardenClears\(wg\), total: 18 \}/);
  assert.match(bridge, /ms-garden-18/);
});

test('launcher uses the three themed workbench product names', () => {
  const launcher = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(launcher, /植物僵尸工作台/);
  assert.match(launcher, /我的世界工作台/);
  assert.match(launcher, /马里奥工作台/);
});

// ===== T20260815-garden-optimize S1 合同（G1 playMods / G2 结算三行 / G3 星芒陪伴）=====

function gardenSrc() {
  return fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.js'), 'utf8');
}

function extractGardenFn(src, name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\r?\\n    \\}\\r?\\n');
  const match = src.match(re);
  assert.ok(match, name + ' missing in garden game.js');
  const box = {};
  vm.runInNewContext(match[0] + '\nthis.' + name + ' = ' + name + ';', box);
  return box[name];
}

test('garden defense wires play mods, settlement lines, companion HUD and celebration cards', () => {
  const src = gardenSrc();
  const html = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.css'), 'utf8');

  assert.match(src, /USE_PLAY_MODS/);
  assert.match(src, /getPlayMods/);
  assert.match(src, /applyPlayMods/);
  assert.match(src, /advanceMoveClocks/);
  assert.match(src, /buildSettlementLines/);
  assert.match(src, /COMPANION_LINES/);
  assert.match(src, /companionLine/);
  assert.match(src, /milestoneCardsFrom/);
  assert.match(src, /celebrate-layer/);
  assert.match(src, /star-companion|🦄/);
  assert.match(src, /mod-badge/);
  assert.match(src, /mods\.label/);
  assert.match(src, /多认字可以解锁更强的僵尸和更多阳光/);
  assert.match(html, /id="mod-badge"/);
  assert.match(html, /id="companion-hud"/);
  assert.match(html, /id="settle-layer"/);
  assert.match(html, /id="celebrate-layer"/);
  assert.match(css, /\.mod-badge/);
  assert.match(css, /\.companion-hud/);
  assert.match(css, /\.settle-layer/);
  assert.match(css, /\.celebrate-layer/);
});

test('garden applyPlayMods scales zombie speed, sun reward and extra mob across three tiers', () => {
  const applyPlayMods = extractGardenFn(gardenSrc(), 'applyPlayMods');
  const wave = () => ({
    rewardSun: 12,
    zombies: [
      { id: 'z1', kind: 'zombie-basic', lane: 0, column: 5, health: 3, maxHealth: 3, slowTicks: 0, moveClock: 0 },
      { id: 'z2', kind: 'zombie-conehead', lane: 2, column: 5, health: 5, maxHealth: 5, slowTicks: 0, moveClock: 0 }
    ]
  });

  const easy = applyPlayMods(wave(), { mode: 'easy', label: '简单', enemySpeed: 0.75, sunMult: 1, extraMob: false });
  assert.equal(easy.zombies.length, 2);
  assert.equal(easy.zombies[0].speedMult, 0.75);
  assert.equal(easy.rewardSun, 12);
  assert.equal(easy.extraMob, 0);

  const normal = applyPlayMods(wave(), { mode: 'normal', label: '普通', enemySpeed: 1.15, sunMult: 1.5, extraMob: false });
  assert.equal(normal.zombies[0].speedMult, 1.15);
  assert.equal(normal.rewardSun, 18);
  assert.equal(normal.extraMob, 0);

  const hard = applyPlayMods(wave(), { mode: 'hard', label: '困难', enemySpeed: 1.3, sunMult: 2, extraMob: true });
  assert.equal(hard.zombies[0].speedMult, 1.3);
  assert.equal(hard.rewardSun, 24);
  assert.equal(hard.extraMob, 1);

  const noMods = applyPlayMods(wave(), null);
  assert.equal(noMods.zombies[0].speedMult, 1);
  assert.equal(noMods.rewardSun, 12);
  assert.equal(noMods.extraMob, 0);
});

test('garden advanceMoveClocks paces zombies by literacy tier without touching the rules layer', () => {
  const advanceMoveClocks = extractGardenFn(gardenSrc(), 'advanceMoveClocks');
  const MOVE_EVERY = 18;

  function simulate(mods) {
    const defense = {
      plants: [],
      zombies: [{ id: 'z1', kind: 'zombie-basic', lane: 0, column: 5, health: 3, maxHealth: 3, slowTicks: 0, moveClock: 0 }]
    };
    const acc = {};
    let moves = 0;
    for (let tick = 0; tick < 60; tick += 1) {
      advanceMoveClocks(defense, acc, mods);
      const z = defense.zombies[0];
      z.moveClock += 1;
      if (z.moveClock >= MOVE_EVERY) {
        z.moveClock = 0;
        z.column -= 1;
        moves += 1;
      }
    }
    return moves;
  }

  const easy = simulate({ mode: 'easy', enemySpeed: 0.75 });
  const normal = simulate({ mode: 'normal', enemySpeed: 1.15 });
  const hard = simulate({ mode: 'hard', enemySpeed: 1.3 });
  assert.ok(easy < normal, `easy(${easy}) should move less often than normal(${normal})`);
  assert.ok(normal < hard, `normal(${normal}) should move less often than hard(${hard})`);

  // 被植物挡住或被冰冻的僵尸不吃速度补偿
  const blocked = {
    plants: [{ lane: 0, column: 4, health: 4 }],
    zombies: [{ id: 'z2', kind: 'zombie-basic', lane: 0, column: 5, health: 3, maxHealth: 3, slowTicks: 0, moveClock: 3 }]
  };
  const accB = {};
  advanceMoveClocks(blocked, accB, { enemySpeed: 1.3 });
  assert.equal(blocked.zombies[0].moveClock, 3);
  assert.equal(accB.z2, undefined);

  const slowed = {
    plants: [],
    zombies: [{ id: 'z3', kind: 'zombie-basic', lane: 0, column: 5, health: 3, maxHealth: 3, slowTicks: 2, moveClock: 3 }]
  };
  advanceMoveClocks(slowed, {}, { enemySpeed: 1.3 });
  assert.equal(slowed.zombies[0].moveClock, 3);
});

test('garden settlement lines show gain, adventure progress and nearest locked milestone', () => {
  const src = gardenSrc();
  const gapMatch = src.match(/function milestoneGapText\([\s\S]*?\r?\n    \}\r?\n/);
  assert.ok(gapMatch, 'milestoneGapText missing in garden game.js');
  const buildMatch = src.match(/function buildSettlementLines\([\s\S]*?\r?\n    \}\r?\n/);
  assert.ok(buildMatch, 'buildSettlementLines missing in garden game.js');
  const box = {};
  vm.runInNewContext(gapMatch[0] + '\n' + buildMatch[0] + '\nthis.buildSettlementLines = buildSettlementLines;', box);
  const buildSettlementLines = box.buildSettlementLines;
  const meta = {
    adventurePoints: 50,
    adventureLevel: 3,
    adventureTitle: '阳光骑士',
    nextRank: { level: 4, title: '方块工匠', need: 80 },
    badges: [
      { id: 'ms-garden-3', title: '三关守卫', desc: '花园通关 3 关', unlocked: true },
      { id: 'ms-garden-8', title: '八关防线', desc: '花园通关 8 关', unlocked: false },
      { id: 'ms-garden-12', title: '终章守护', desc: '花园通关全部 12 关', unlocked: false }
    ],
    gardenClears: 5,
    playDaysTotal: 2,
    totalStars: 9,
    voxelQuests: 1,
    platformClears: 0
  };

  const won = buildSettlementLines({ won: true, stars: 2, sunAwarded: 24, sunMult: 2, sunCapped: false, meta });
  assert.match(won.gain, /阳光 \+24/);
  assert.match(won.gain, /×2/);
  assert.match(won.gain, /★×2/);
  assert.match(won.progressLabel, /Lv\.3/);
  assert.match(won.progressLabel, /阳光骑士/);
  assert.match(won.progressLabel, /50\/80/);
  assert.equal(won.progressPercent, 63);
  assert.match(won.nextGoal, /八关防线/);
  assert.match(won.nextGoal, /还差 3 关/);

  const lost = buildSettlementLines({ won: false, stars: 0, sunAwarded: 0, meta });
  assert.equal(lost.gain, '');

  const allDone = buildSettlementLines({
    won: true, stars: 3, sunAwarded: 10, sunMult: 1, sunCapped: false,
    meta: Object.assign({}, meta, { badges: meta.badges.map(b => ({ id: b.id, title: b.title, desc: b.desc, unlocked: true })) })
  });
  assert.ok(!/下一个目标/.test(allDone.nextGoal), 'all unlocked should not promise another goal');
});

test('garden companion pool has 12+ lines with strategy hints on failure and pet-level address', () => {
  const src = gardenSrc();
  const poolMatch = src.match(/const COMPANION_LINES = \{[\s\S]*?\r?\n    \};\r?\n/);
  assert.ok(poolMatch, 'COMPANION_LINES missing in garden game.js');
  const fnMatch = src.match(/function companionLine\([\s\S]*?\r?\n    \}\r?\n/);
  assert.ok(fnMatch, 'companionLine missing in garden game.js');
  const box = {};
  vm.runInNewContext(poolMatch[0] + '\n' + fnMatch[0] + '\nthis.COMPANION_LINES = COMPANION_LINES; this.companionLine = companionLine;', box);
  const pool = box.COMPANION_LINES;
  const companionLine = box.companionLine;

  assert.equal(pool.welcome['简单'].length, 3);
  assert.equal(pool.welcome['普通'].length, 3);
  assert.equal(pool.welcome['困难'].length, 3);
  assert.equal(pool.win.length, 4);
  assert.equal(pool.fail.length, 5);
  const total = pool.welcome['简单'].length + pool.welcome['普通'].length + pool.welcome['困难'].length + pool.win.length + pool.fail.length;
  assert.ok(total >= 12, `pool total ${total} < 12`);

  pool.fail.forEach(line => {
    assert.match(line, /坚果|向日葵|樱桃|寒冰|阳光|前排|补种|种满/, 'fail line must give a strategy hint: ' + line);
    assert.doesNotMatch(line, /笨|不行|太差|没用的/, 'fail line must not negate: ' + line);
  });

  const hardSenior = companionLine('fail', { mode: 'hard', label: '困难' }, 4, 0);
  assert.equal(hardSenior, pool.fail[0].replace(/\{who\}/g, '小园长'));
  const easyJunior = companionLine('welcome', { mode: 'easy', label: '简单' }, 1, 0);
  assert.equal(easyJunior, pool.welcome['简单'][0].replace(/\{who\}/g, '小朋友'));
});

test('garden milestone cards derive from bridge award list only for milestone kind', () => {
  const milestoneCardsFrom = extractGardenFn(gardenSrc(), 'milestoneCardsFrom');
  const cards = milestoneCardsFrom([
    { kind: 'play', amount: 3, title: '今日游玩 +3' },
    { kind: 'milestone', id: 'ms-garden-3', title: '三关守卫', amount: 12, claimed: true },
    { kind: 'milestone', id: 'ms-garden-8', title: '八关防线', amount: 0, claimed: false, reason: '今日阳光已达上限' }
  ]);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].title, '三关守卫');
  assert.equal(cards[0].sun, 12);
  assert.equal(cards[0].claimed, true);
  assert.equal(cards[1].title, '八关防线');
  assert.equal(cards[1].claimed, false);
  assert.equal(milestoneCardsFrom(null).length, 0);
  assert.equal(milestoneCardsFrom([{ kind: 'play' }]).length, 0);
});

function voxelSrc() {
  return fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'game.js'), 'utf8');
}

function extractVoxelFn(src, name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n    \\}\\n');
  const match = src.match(re);
  assert.ok(match, name + ' missing in voxel game.js');
  const box = {};
  vm.runInNewContext(match[0] + '\nthis.' + name + ' = ' + name + ';', box);
  return box[name];
}

function loadBridge(opts) {
  const store = {};
  const box = {
    VoxelQuests: opts && Object.prototype.hasOwnProperty.call(opts, 'VoxelQuests')
      ? opts.VoxelQuests
      : undefined,
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = String(value); },
      removeItem(key) { delete store[key]; }
    },
    console: { warn() {}, log() {} }
  };
  box.window = box;
  box.globalThis = box;
  const src = fs.readFileSync(path.join(root, 'games', 'shared', 'workbench-bridge.js'), 'utf8');
  vm.runInNewContext(src, box);
  return box.WorkbenchGameBridge;
}

test('voxel weekly report total follows VoxelQuests length and falls back to 12', () => {
  const bridgeSrc = fs.readFileSync(path.join(root, 'games', 'shared', 'workbench-bridge.js'), 'utf8');
  assert.doesNotMatch(bridgeSrc, /'voxel-adventure':\s*\{[^}]*total:\s*8/, 'hardcoded voxel total: 8 must be gone');

  const withQuests = loadBridge({
    VoxelQuests: { list: Array.from({ length: 12 }, (_, i) => ({ id: 'q' + (i + 1) })) }
  });
  const row12 = withQuests.getWeeklyReport().worlds.find((w) => w.id === 'voxel-adventure');
  assert.equal(row12.total, 12);

  const withMore = loadBridge({
    VoxelQuests: { list: Array.from({ length: 15 }, (_, i) => ({ id: 'q' + (i + 1) })) }
  });
  const row15 = withMore.getWeeklyReport().worlds.find((w) => w.id === 'voxel-adventure');
  assert.equal(row15.total, 15);

  const fallback = loadBridge({ VoxelQuests: undefined });
  const rowFallback = fallback.getWeeklyReport().worlds.find((w) => w.id === 'voxel-adventure');
  assert.equal(rowFallback.total, 12);
});

test('voxel quest settlement, companion HUD and rank-up card are wired', () => {
  const src = voxelSrc();
  const html = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'game.css'), 'utf8');

  assert.match(src, /buildQuestSummary/);
  assert.match(src, /onRankUp/);
  assert.match(src, /COMPANION_LINES/);
  assert.match(src, /companionLine/);
  assert.match(src, /voxel-companion|🦄/);
  assert.match(src, /lastCelebratedRank/);
  assert.match(html, /id="companion-hud"/);
  assert.match(html, /id="settle-layer"/);
  assert.match(html, /id="celebrate-layer"/);
  assert.match(css, /\.companion-hud/);
  assert.match(css, /\.settle-layer/);
  assert.match(css, /\.celebrate-layer/);
});

test('voxel buildQuestSummary shows gain, adventure progress and nearer next goal', () => {
  const src = voxelSrc();
  const nearestMatch = src.match(/function nearestVoxelGoal\([\s\S]*?\n    \}\n/);
  const buildMatch = src.match(/function buildQuestSummary\([\s\S]*?\n    \}\n/);
  assert.ok(nearestMatch, 'nearestVoxelGoal missing in voxel game.js');
  assert.ok(buildMatch, 'buildQuestSummary missing in voxel game.js');
  const box = {};
  vm.runInNewContext(
    nearestMatch[0] + '\n' + buildMatch[0] + '\nthis.buildQuestSummary = buildQuestSummary;',
    box
  );
  const buildQuestSummary = box.buildQuestSummary;
  const meta = {
    adventurePoints: 50,
    adventureLevel: 3,
    adventureTitle: '阳光骑士',
    nextRank: { level: 4, title: '方块工匠', need: 80 },
    voxelQuests: 1,
    badges: [
      { id: 'ms-voxel-5', title: '矿工新手', desc: '方块完成 5 个任务', unlocked: false },
      { id: 'ms-voxel-12', title: '方块大师徽章', desc: '方块完成 12 个任务', unlocked: false }
    ]
  };
  const quests = [
    { id: 'q1', title: '铺一条小路', desc: '放置 8 个草方块' },
    { id: 'q2', title: '第一颗晶体', desc: '收集 3 颗晶体' }
  ];

  const done = buildQuestSummary({
    sunAwarded: 12, sunCapped: false, questTitle: '铺一条小路', daily: false,
    meta, quests, questsDone: ['q1']
  });
  assert.match(done.gain, /阳光 \+12/);
  assert.match(done.gain, /铺一条小路/);
  assert.match(done.progressLabel, /Lv\.3/);
  assert.match(done.progressLabel, /阳光骑士/);
  assert.match(done.progressLabel, /50\/80/);
  assert.equal(done.progressPercent, 63);
  assert.match(done.nextGoal, /第一颗晶体/, 'nearer career quest beats a 4-quest milestone');

  const capped = buildQuestSummary({
    sunAwarded: 0, sunCapped: true, questTitle: '今日：铺草', daily: true,
    meta, quests, questsDone: ['q1', 'q2']
  });
  assert.match(capped.gain, /今日阳光已达上限/);
  assert.match(capped.nextGoal, /矿工新手/);
  assert.match(capped.nextGoal, /还差 4 个任务/);
});

test('voxel companion pool has 12+ build/collect lines and rank-up fires once from 2 to 3', () => {
  const src = voxelSrc();
  const poolMatch = src.match(/const COMPANION_LINES = \{[\s\S]*?\n    \};\n/);
  const lineMatch = src.match(/function companionLine\([\s\S]*?\n    \}\n/);
  assert.ok(poolMatch, 'COMPANION_LINES missing in voxel game.js');
  assert.ok(lineMatch, 'companionLine missing in voxel game.js');
  const box = {};
  vm.runInNewContext(
    poolMatch[0] + '\n' + lineMatch[0] + '\nthis.COMPANION_LINES = COMPANION_LINES; this.companionLine = companionLine;',
    box
  );
  const pool = box.COMPANION_LINES;
  const companionLine = box.companionLine;
  const all = []
    .concat(pool.quest || [])
    .concat(pool.daily || [])
    .concat(pool.streak || [])
    .concat(pool.welcome || []);
  assert.ok(all.length >= 12, `pool total ${all.length} < 12`);
  assert.ok(all.some((line) => /搭|放|收集/.test(line)), 'pool must use 搭/放/收集 verbs');
  assert.ok((pool.daily || []).some((line) => line.indexOf('今天的活干完啦') !== -1));
  assert.ok((pool.streak || []).length >= 1, '3-day daily streak needs exclusive praise');
  assert.match(companionLine('quest', 0), /搭|放|收集|阳光|晶体/);

  const onRankUp = extractVoxelFn(src, 'onRankUp');
  const up = onRankUp(2, 3, 2);
  assert.equal(up.rank, 3);
  assert.match(up.title, /石匠学徒/);
  assert.match(up.ability, /继续挖，更深的矿层在等你/);
  assert.equal(onRankUp(3, 3, 3), null);
  assert.equal(onRankUp(2, 3, 3), null);
});

function platformSrc() {
  return fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.js'), 'utf8');
}

function extractPlatformGameFn(src, name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n    \\}\\n');
  const match = src.match(re);
  assert.ok(match, name + ' missing in platform game.js');
  const box = {};
  vm.runInNewContext(match[0] + '\nthis.' + name + ' = ' + name + ';', box);
  return box[name];
}

test('platform wires play mods, settlement lines and throttled companion HUD', () => {
  const src = platformSrc();
  const html = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.css'), 'utf8');
  assert.match(src, /USE_PLAY_MODS/);
  assert.match(src, /getPlayMods/);
  assert.match(src, /applyPlayMods/);
  assert.match(src, /buildRunSummary/);
  assert.match(src, /companionSayAllowed/);
  assert.match(src, /COMPANION_LINES/);
  assert.match(html, /id="mod-badge"/);
  assert.match(html, /id="companion-hud"/);
  assert.match(html, /id="settle-layer"/);
  assert.match(css, /\.companion-hud/);
  assert.match(css, /\.settle-layer/);
  assert.match(css, /touch-btn[^{]*\{[\s\S]*?(width|min-width):\s*6[0-9]px/);
});

test('platform applyPlayMods scales enemy speed, sun and hard patrol, easy coyote 140', () => {
  const applyPlayMods = extractPlatformGameFn(platformSrc(), 'applyPlayMods');
  const wave = {
    rewardSun: 10,
    enemies: [{ minX: 100, maxX: 200 }]
  };
  const easy = applyPlayMods(wave, { mode: 'easy', label: '简单', enemySpeed: 0.75, sunMult: 1, extraMob: false });
  assert.equal(easy.enemySpeed, 0.75);
  assert.equal(easy.rewardSun, 10);
  assert.equal(easy.coyoteMs, 140);
  assert.equal(easy.enemies[0].maxX - easy.enemies[0].minX, 100);

  const hard = applyPlayMods(wave, { mode: 'hard', label: '困难', enemySpeed: 1.3, sunMult: 2, extraMob: true });
  assert.equal(hard.enemySpeed, 1.3);
  assert.equal(hard.rewardSun, 20);
  assert.equal(hard.coyoteMs, 120);
  assert.equal(hard.enemies[0].maxX - hard.enemies[0].minX, 120);

  const none = applyPlayMods(wave, null);
  assert.equal(none.enemySpeed, 1);
  assert.equal(none.rewardSun, 10);
  assert.equal(none.coyoteMs, 120);
});

test('platform buildRunSummary shows time coins stars record and nearer goal', () => {
  const src = platformSrc();
  const buildMatch = src.match(/function buildRunSummary\([\s\S]*?\n    \}\n/);
  assert.ok(buildMatch, 'buildRunSummary missing');
  const box = {};
  vm.runInNewContext(buildMatch[0] + '\nthis.buildRunSummary = buildRunSummary;', box);
  const meta = {
    adventurePoints: 50,
    adventureLevel: 3,
    adventureTitle: '阳光骑士',
    nextRank: { level: 4, title: '方块工匠', need: 80 },
    platformClears: 2,
    badges: [
      { id: 'ms-platform-3', title: '三旗冲线', desc: '横版通关 3 关', unlocked: false },
      { id: 'ms-platform-10', title: '彩虹终点', desc: '横版通关 10 关', unlocked: false }
    ]
  };
  const rec = box.buildRunSummary({
    time: 12.3, coins: 4, stars: 2, isNewRecord: true, parTime: 20, levelId: 1, meta
  });
  assert.match(rec.gain, /12\.3/);
  assert.match(rec.gain, /金币 4/);
  assert.match(rec.gain, /★×2/);
  assert.match(rec.gain, /新纪录/);
  assert.match(rec.progressLabel, /Lv\.3/);
  assert.match(rec.progressLabel, /50\/80/);
  assert.equal(rec.progressPercent, 63);
  assert.match(rec.nextGoal, /三旗冲线|还差 1 关/);

  const starGoal = box.buildRunSummary({
    time: 25, coins: 8, stars: 2, isNewRecord: false, parTime: 20, levelId: 6,
    meta: Object.assign({}, meta, {
      platformClears: 10,
      badges: meta.badges.map((b) => Object.assign({}, b, { unlocked: true }))
    })
  });
  assert.match(starGoal.nextGoal, /第 6 关/);
  assert.match(starGoal.nextGoal, /差 5 秒|再快 5/);
});

test('garden S2 roster first-seen kinds and star rules', () => {
  const stages = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'data', 'stages.js'), 'utf8');
  assert.match(stages, /S\(7,[\s\S]*bucket/);
  assert.match(stages, /S\(9,[\s\S]*football/);
  assert.match(stages, /plant-potatomine/);
  const src = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.js'), 'utf8');
  assert.match(src, /plants\/plant-potatomine\.png/);
  assert.ok(!/plant-potatomine['"]: LOCAL \+ 'plants\/plant-wallnut/.test(src));
  const potatoArt = path.join(root, 'games', 'garden-defense', 'assets', 'plants', 'plant-potatomine.png');
  assert.ok(fs.existsSync(potatoArt), 'potato mine sprite missing');
  assert.ok(fs.statSync(potatoArt).size > 8000, 'potato mine sprite too small');
  const start = src.indexOf('function computeGardenStars');
  const end = src.indexOf('const COMPANION_LINES', start);
  assert.ok(start >= 0 && end > start, 'computeGardenStars missing');
  const box = {};
  vm.runInNewContext(src.slice(start, end) + 'this.computeGardenStars = computeGardenStars;', box);
  assert.equal(box.computeGardenStars({ breachedMid: false, elapsed: 20, parSec: 90, remainingSun: 30 }), 3);
  assert.equal(box.computeGardenStars({ breachedMid: true, elapsed: 20, parSec: 90, remainingSun: 30 }), 2);
  assert.equal(box.computeGardenStars({ breachedMid: true, elapsed: 120, parSec: 90, remainingSun: 10 }), 1);
});

test('platform map shows challenge tag and formats best time', () => {
  const src = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.js'), 'utf8');
  assert.match(src, /可挑战/);
  assert.match(src, /function formatBestTime/);
  assert.match(src, /checkpoint/);
  const match = src.match(/function formatBestTime\([\s\S]*?\n    \}\n/);
  const box = {};
  vm.runInNewContext(match[0] + '\nthis.formatBestTime = formatBestTime;', box);
  assert.equal(box.formatBestTime(12.34), '12.3s');
  assert.equal(box.formatBestTime(0), '');
});

test('voxel S2 tool gate blueprints and master quests', async () => {
  await import(pathToFileURL(path.join(root, 'games', 'voxel-adventure', 'data', 'world.js')).href);
  await import(pathToFileURL(path.join(root, 'games', 'voxel-adventure', 'data', 'quests.js')).href);
  const world = globalThis.VoxelWorld;
  const quests = globalThis.VoxelQuests;
  assert.equal(world.canMineAtRank('stone', 'wood_pick', 1, true), false);
  assert.equal(world.canMineAtRank('stone', 'wood_pick', 3, true), true);
  assert.equal(world.canMineAtRank('crystal', 'stone_pick', 3, true), false);
  assert.equal(world.canMineAtRank('crystal', 'stone_pick', 5, true), true);
  const empty = world.createDefaultWorld(1);
  assert.equal(world.blueprintCoverage(empty, 'hut') < 80, true);
  const filled = world.cloneWorld(empty);
  const spec = world.BLUEPRINTS.hut;
  spec.pattern.forEach((line, row) => {
    String(line).split('').forEach((ch, col) => {
      if (ch === 'w') filled.grid[spec.y + row][spec.x + col] = 'wood';
    });
  });
  assert.ok(world.blueprintCoverage(filled, 'hut') >= 80);
  assert.equal(quests.list.length, 18);
  assert.equal(quests.list.filter((q) => q.rank === 5 && /^q1[3-8]$/.test(q.id)).length, 6);
  assert.equal(quests.dailyPool.length, 10);
  const src = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'game.js'), 'utf8');
  assert.match(src, /USE_TOOL_GATE/);
  assert.match(src, /homeSnapshot/);
  assert.match(src, /function captureHomeSnapshot/);
  const snap = world.makeHomeSnapshot(empty, '2026-08-15');
  assert.ok(snap.grid[0].length === world.COLS);
  assert.equal(snap.grid[0][0] === 'g' || snap.grid[0][0] === '.', true);
  assert.ok(JSON.stringify(snap).length < 8192);
  const voxelHtml = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'index.html'), 'utf8');
  assert.match(voxelHtml, /home-shot-btn/);
});

test('shared game-sfx is wired for celebrate rank-up checkpoint clear and record', () => {
  const sfx = fs.readFileSync(path.join(root, 'games', 'shared', 'game-sfx.js'), 'utf8');
  assert.match(sfx, /MAX_GAIN = 0\.3/);
  assert.match(sfx, /WorkbenchGameSfx/);
  ['celebrate', 'rankUp', 'checkpoint', 'clear', 'record'].forEach((name) => {
    assert.match(sfx, new RegExp(name + ':\\s*function'));
  });
  assert.doesNotMatch(sfx, /\.mp3|\.wav|\.ogg/);

  const gardenHtml = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'index.html'), 'utf8');
  const voxelHtml = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'index.html'), 'utf8');
  const platformHtml = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'index.html'), 'utf8');
  assert.match(gardenHtml, /game-sfx\.js/);
  assert.match(voxelHtml, /game-sfx\.js/);
  assert.match(platformHtml, /game-sfx\.js/);
  assert.match(gardenHtml, /workbench-bridge\.js\?v=/);
  assert.match(voxelHtml, /workbench-bridge\.js\?v=/);
  assert.match(platformHtml, /workbench-bridge\.js\?v=/);

  const gardenJs = fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.js'), 'utf8');
  const voxelJs = fs.readFileSync(path.join(root, 'games', 'voxel-adventure', 'game.js'), 'utf8');
  const platformJs = fs.readFileSync(path.join(root, 'games', 'platform-quest', 'game.js'), 'utf8');
  assert.match(gardenJs, /sfx\.clear/);
  assert.match(gardenJs, /sfx\.celebrate/);
  assert.match(voxelJs, /sfx\.clear/);
  assert.match(voxelJs, /sfx\.rankUp/);
  assert.match(platformJs, /gameSfx\.checkpoint/);
  assert.match(platformJs, /gameSfx\.record/);
});

test('platform companion pools hint on fail and throttle cheers to once per 5s', () => {
  const src = platformSrc();
  const poolMatch = src.match(/const COMPANION_LINES = \{[\s\S]*?\n    \};\n/);
  const lineMatch = src.match(/function companionLine\([\s\S]*?\n    \}\n/);
  assert.ok(poolMatch, 'COMPANION_LINES missing');
  assert.ok(lineMatch, 'companionLine missing');
  const box = {};
  vm.runInNewContext(poolMatch[0] + '\n' + lineMatch[0] + '\nthis.COMPANION_LINES = COMPANION_LINES; this.companionLine = companionLine;', box);
  const pool = box.COMPANION_LINES;
  assert.ok((pool.pit || []).length >= 4);
  assert.ok((pool.hit || []).length >= 4);
  [].concat(pool.pit, pool.hit).forEach((line) => {
    assert.match(line, /跳|靠近|蹲|等|再|旗|怪|落地/, 'fail line needs an action hint: ' + line);
    assert.doesNotMatch(line, /笨|不行|太差|没用/, 'fail line must not negate: ' + line);
  });
  const allowed = extractPlatformGameFn(src, 'companionSayAllowed');
  assert.equal(allowed(-1, 1000), true);
  assert.equal(allowed(1000, 3000), false);
  assert.equal(allowed(1000, 6000), true);
});

test('blocklegend records play, keeps triple-day as >=3 worlds, and appears in weekly report', () => {
  const src = fs.readFileSync(path.join(root, 'games', 'shared', 'workbench-bridge.js'), 'utf8');
  assert.match(src, /'blocklegend'/);
  assert.match(src, /function worldsPlayedToday/);
  assert.match(src, /worldsPlayedToday\([^\)]*\)\s*>=\s*3/);

  const play = loadBridge();
  const rec = play.recordPlaySession('blocklegend', { date: '2026-08-15' });
  assert.equal(rec.ok, true);
  const state = play.readState();
  assert.equal(state.growth.worldGames.meta.playByDay['2026-08-15'].blocklegend, true);

  const threeClassic = loadBridge();
  threeClassic.recordPlaySession('garden-defense', { date: '2026-08-15' });
  threeClassic.recordPlaySession('voxel-adventure', { date: '2026-08-15' });
  threeClassic.recordPlaySession('platform-quest', { date: '2026-08-15' });
  const dayClassic = threeClassic.getWeeklyReport('2026-08-15').days.find((d) => d.date === '2026-08-15');
  assert.equal(dayClassic.isTriple, true);
  assert.equal(threeClassic.getMetaSummary().badges.some((b) => b.id === 'ms-triple-day' && b.unlocked), true);

  const twoWorlds = loadBridge();
  twoWorlds.recordPlaySession('garden-defense', { date: '2026-08-15' });
  twoWorlds.recordPlaySession('voxel-adventure', { date: '2026-08-15' });
  const dayTwo = twoWorlds.getWeeklyReport('2026-08-15').days.find((d) => d.date === '2026-08-15');
  assert.equal(dayTwo.isTriple, false);
  assert.equal(twoWorlds.getMetaSummary().badges.some((b) => b.id === 'ms-triple-day' && b.unlocked), false);

  const mixed = loadBridge();
  mixed.recordPlaySession('garden-defense', { date: '2026-08-15' });
  mixed.recordPlaySession('voxel-adventure', { date: '2026-08-15' });
  mixed.recordPlaySession('blocklegend', { date: '2026-08-15' });
  const dayMixed = mixed.getWeeklyReport('2026-08-15').days.find((d) => d.date === '2026-08-15');
  assert.equal(dayMixed.isTriple, true);

  const row = play.getWeeklyReport('2026-08-15').worlds.find((w) => w.id === 'blocklegend');
  assert.ok(row);
  assert.equal(row.label, '方块传奇');
  assert.equal(row.unit, '关');
  assert.equal(row.total, 6);
});
