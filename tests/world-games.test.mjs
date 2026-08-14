import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
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
  assert.match(garden, /zombies\/zombie-football\.webp/);
  assert.match(gardenScript, /boardMetrics|lawnFromEvent|阳光/);
  assert.match(gardenScript, /laneH \* 1\.62/);
  assert.match(gardenScript, /laneH \* 2\.72/);
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

// ===== T20260815-garden-optimize S1 合同（G1 playMods / G2 结算三行 / G3 星芒陪伴）=====

function gardenSrc() {
  return fs.readFileSync(path.join(root, 'games', 'garden-defense', 'game.js'), 'utf8');
}

function extractGardenFn(src, name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n    \\}\\n');
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
  const gapMatch = src.match(/function milestoneGapText\([\s\S]*?\n    \}\n/);
  assert.ok(gapMatch, 'milestoneGapText missing in garden game.js');
  const buildMatch = src.match(/function buildSettlementLines\([\s\S]*?\n    \}\n/);
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
  const poolMatch = src.match(/const COMPANION_LINES = \{[\s\S]*?\n    \};\n/);
  assert.ok(poolMatch, 'COMPANION_LINES missing in garden game.js');
  const fnMatch = src.match(/function companionLine\([\s\S]*?\n    \}\n/);
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
