import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

await import('../prj/games/blocklegend/data/combat.js');
const C = globalThis.BlockLegendCombat;

test('combat namespace exposes damage constants and pure helpers', () => {
  assert.equal(typeof C, 'object');
  assert.equal(typeof C.critMultiplier, 'function');
  assert.equal(typeof C.damage, 'function');
  assert.equal(typeof C.canAttack, 'function');
  assert.equal(typeof C.monsterOf, 'function');
  assert.equal(C.CRIT_MULT, 3);
  assert.ok(C.BASE_MELEE > 0);
  assert.ok(C.BASE_BOLT > 0);
  assert.notEqual(C.BASE_BOLT, C.BASE_MELEE);
  assert.ok(C.MELEE_COOLDOWN_MS > 0);
  assert.ok(C.BOLT_COOLDOWN_MS > 0);
  assert.equal(C.INVINCIBLE_MS, 1600);
  assert.ok(C.MELEE_RANGE > 1);
  assert.ok(C.BOLT_SPEED > 0);
  assert.ok(C.BOLT_TURN > 0);
});

test('unanswered or wrong attack stays at base damage and does not keep combo', () => {
  assert.equal(C.critMultiplier({ answered: false }), 1);
  assert.equal(C.critMultiplier({ answered: true, correct: false }), 1);
  assert.equal(C.critMultiplier({ answered: true, correct: false, combo: 5 }), 1);
  assert.equal(C.damage({ kind: 'melee', answered: false }), C.BASE_MELEE);
  assert.equal(C.damage({ kind: 'bolt', answered: true, correct: false }), C.BASE_BOLT);
  assert.equal(C.nextCombo({ answered: false, combo: 2 }), 0);
  assert.equal(C.nextCombo({ answered: true, correct: false, combo: 4 }), 0);
});

test('correct answer multiplies by CRIT_MULT, combo 3+ caps at CRIT_MULT+1', () => {
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 0 }), C.CRIT_MULT);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 2 }), C.CRIT_MULT);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 3 }), C.CRIT_MULT + 1);
  assert.equal(C.critMultiplier({ answered: true, correct: true, combo: 9 }), C.CRIT_MULT + 1);
  assert.equal(C.damage({ kind: 'melee', answered: true, correct: true, combo: 0 }), C.BASE_MELEE * C.CRIT_MULT);
  assert.equal(C.damage({ kind: 'bolt', answered: true, correct: true, combo: 3 }), C.BASE_BOLT * (C.CRIT_MULT + 1));
  assert.equal(C.nextCombo({ answered: true, correct: true, combo: 0 }), 1);
  assert.equal(C.nextCombo({ answered: true, correct: true, combo: 2 }), 3);
});

test('attack cooldown is kind-specific', () => {
  assert.equal(C.canAttack({ kind: 'melee', lastAt: 1000, now: 1000 + C.MELEE_COOLDOWN_MS - 1 }), false);
  assert.equal(C.canAttack({ kind: 'melee', lastAt: 1000, now: 1000 + C.MELEE_COOLDOWN_MS }), true);
  assert.equal(C.canAttack({ kind: 'bolt', lastAt: 0, now: 0 }), true);
  assert.equal(C.canAttack({ kind: 'bolt', lastAt: 100, now: 100 + C.BOLT_COOLDOWN_MS - 1 }), false);
});

test('monster table has 2-3 kinds with hp and coin drops', () => {
  assert.ok(Array.isArray(C.MONSTER_KINDS));
  assert.ok(C.MONSTER_KINDS.length >= 2 && C.MONSTER_KINDS.length <= 3);
  C.MONSTER_KINDS.forEach((k) => {
    const m = C.monsterOf(k);
    assert.equal(m.kind, k);
    assert.ok(m.hp >= 8);
    assert.ok(m.coins >= 1);
    assert.ok(m.contact >= 1);
    assert.ok(m.speed > 0);
    assert.ok(m.loot);
  });
});

test('loot bag counts drops for the merchant and coins add up', () => {
  const bag = C.emptyBag();
  const after = C.addLoot(bag, 'slime-gel', 1);
  assert.equal(after['slime-gel'], 1);
  assert.equal(C.addLoot(after, 'slime-gel', 2)['slime-gel'], 3);
  assert.equal(C.pickupCoins(10, C.monsterOf('slime').coins), 10 + C.monsterOf('slime').coins);
});

test('melee fan and bolt homing stay deterministic', () => {
  // yaw 0 朝 -Z，前方目标应命中，背后不应
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: -1.4 }), true);
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: 2 }), false);
  assert.equal(C.inMeleeArc({ x: 0, z: 0 }, 0, { x: 0, z: -8 }), false);
  const nearest = C.nearestMonster({ x: 0, z: 0 }, [
    { id: 'a', x: 4, z: 0, hp: 4 },
    { id: 'b', x: 1, z: -1, hp: 4 },
    { id: 'c', x: 0, z: 0, hp: 0 }
  ]);
  assert.equal(nearest.id, 'b');
  const bolt = C.steerBolt({ x: 0, z: 0, vx: 0, vz: -C.BOLT_SPEED }, { x: 3, z: -4 }, 0.05);
  assert.ok(bolt.vx > 0, 'bolt should yaw toward +X');
});

await import('../prj/games/blocklegend/data/words.js');
const W = globalThis.BlockLegendWords;
const coreCatalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'prj', 'assets', 'vocab', 'core-english-2026.08.15', 'catalog.json'), 'utf8'));
const bank = W.cardsToBank(coreCatalog);

test('word pools use core-english 597 daily words, easy themes first', () => {
  assert.equal(typeof W, 'object');
  assert.equal(typeof W.poolForLevel, 'function');
  assert.equal(typeof W.quizFor, 'function');
  assert.equal(bank.length, 597);
  const black = bank.find((w) => w.text === 'black');
  assert.ok(black);
  assert.equal(black.zh, '黑色');
  assert.match(black.media.image, /media\/semantic\/black\.png$/);
  const pools = [1, 2, 3, 4, 5, 6].map((lv) => W.poolForLevel(bank, lv));
  pools.forEach((p) => assert.ok(p.length > 0, 'level pool empty'));
  const ids = pools.flat().map((w) => w.id);
  assert.equal(new Set(ids).size, 597);
  assert.equal(ids.length, 597);
  assert.ok(pools[0].some((w) => w.theme === '颜色'));
  assert.ok(!pools[0].some((w) => w.theme === '学校' || w.theme === '生活'));
  assert.ok(pools[5].some((w) => w.theme === '学校' || w.theme === '生活'));
});

test('quizFor picks 3 unique same-theme distractors or marks fallback', () => {
  const word = bank.find((w) => w.text === 'black') || bank[0];
  const quiz = W.quizFor(word, bank);
  assert.equal(quiz.word.id, word.id);
  assert.equal(quiz.answer, word.zh);
  assert.equal(quiz.choices.length, 4);
  assert.equal(new Set(quiz.choices).size, 4);
  assert.ok(quiz.choices.includes(word.zh));
  const others = quiz.choices.filter((c) => c !== word.zh);
  assert.equal(others.length, 3);
});

test('look-at labels keep short Chinese fallbacks when the daily bank has no MC nouns', () => {
  const dirt = W.labelFor('dirt', bank);
  assert.equal(dirt.en, 'dirt');
  assert.equal(dirt.zh, '泥土');
  const log = W.labelFor('log', bank);
  assert.equal(log.zh, '原木');
  const leaf = W.labelFor('leaf', bank);
  assert.equal(leaf.zh, '树叶');
  const slime = W.labelFor('slime', bank);
  assert.equal(slime.zh, '史莱姆');
  const grass = W.labelFor('grass', bank);
  assert.equal(grass.zh, '草坪');
  const strip = W.sayStrip(W.poolForLevel(bank, 1), 6);
  assert.match(strip, /^Say: /);
  assert.ok(strip.split(' ').length >= 4);
});

test('quiz cadence asks on first hit then skips after a correct streak', () => {
  assert.equal(W.shouldAsk({ firstHit: true, combo: 0 }), true);
  assert.equal(W.shouldAsk({ firstHit: false, combo: 0 }), true);
  assert.equal(W.shouldAsk({ firstHit: false, combo: W.SKIP_COMBO }), false);
  assert.equal(W.shouldAsk({ firstHit: true, combo: W.SKIP_COMBO }), true);
});

await import('../prj/games/blocklegend/data/levels.js');
const L = globalThis.BlockLegendLevels;

test('unlock prices are child-reachable and reject unpaid unlocks', () => {
  assert.deepEqual(L.UNLOCK_COST, [0, 50, 150, 300, 500, 800]);
  assert.equal(L.SUN_PER_LEVEL, 8);
  assert.equal(L.eventKey(1), 'level-1');
  const poor = L.tryUnlock({ unlockedLevel: 1, coined: 49 }, 2);
  assert.equal(poor.ok, false);
  assert.equal(poor.coined, 49);
  assert.equal(poor.unlockedLevel, 1);
  const ok = L.tryUnlock({ unlockedLevel: 1, coined: 50 }, 2);
  assert.equal(ok.ok, true);
  assert.equal(ok.coined, 0);
  assert.equal(ok.unlockedLevel, 2);
});

test('boss shield state machine: shielded reduce, broken window, recover 50%', () => {
  const boss = L.createBoss(1);
  assert.equal(boss.state, 'shielded');
  assert.equal(boss.color, 'blue');
  const tick = L.applyBossDamage(boss, 10, { now: 1000 });
  assert.equal(tick.dealt, 10 * L.SHIELD_REDUCE);
  assert.equal(tick.boss.state, 'shielded');
  let b = tick.boss;
  while (b.shield > 0) {
    const r = L.chipShield(b, b.shield, { now: 2000 });
    b = r.boss;
  }
  assert.equal(b.state, 'broken');
  assert.equal(b.color, 'red');
  const open = L.applyBossDamage(b, 10, { now: 2100 });
  assert.equal(open.dealt, 10);
  const recovered = L.tickBoss(open.boss, 2100 + L.BROKEN_MS);
  assert.equal(recovered.state, 'shielded');
  assert.equal(recovered.color, 'blue');
  assert.ok(recovered.shield >= Math.floor(recovered.shieldMax * 0.5));
  const dying = L.applyBossDamage(Object.assign({}, open.boss, { hp: 4, state: 'broken', color: 'red' }), 10, { now: 2200 });
  assert.equal(dying.boss.dead, true);
  assert.notEqual(dying.boss.state, 'shielded');
});

test('workbench voxel home and game shell wire the S5 entry, help and merchant', () => {
  const app = fs.readFileSync(path.join(repoRoot, 'prj', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(app, /方块传奇 · 学英语/);
  assert.match(app, /games\/blocklegend\/index\.html/);
  assert.match(html, /id="help-layer"/);
  assert.match(html, /How to play/);
  assert.match(html, /id="trade-layer"/);
  assert.match(html, /id="look-card"/);
  assert.match(html, /Listening/);
  assert.match(game, /Press F to trade|openTrade|sellAll/);
});

test('contact hit respects invincible frames', () => {
  const first = C.applyContact({ hp: 10, lastHitAt: 0 }, { contact: 2 }, 1000);
  assert.equal(first.hit, true);
  assert.equal(first.hp, 8);
  const blocked = C.applyContact({ hp: first.hp, lastHitAt: first.lastHitAt }, { contact: 2 }, 1000 + C.INVINCIBLE_MS - 1);
  assert.equal(blocked.hit, false);
  assert.equal(blocked.hp, 8);
  const again = C.applyContact({ hp: first.hp, lastHitAt: first.lastHitAt }, { contact: 2 }, 1000 + C.INVINCIBLE_MS);
  assert.equal(again.hit, true);
  assert.equal(again.hp, 6);
});

await import('../prj/games/blocklegend/engine.js');
const E = globalThis.BlockLegendEngine;

test('terrain mesher emits unit cubes with grass/dirt/stone fill, not a paper-thin heightfield', () => {
  assert.equal(typeof E.collectChunkFaces, 'function');
  assert.equal(typeof E.hasBlock, 'function');
  const world = E.createWorld(7);
  const faces = E.collectChunkFaces(world, 0, 0);
  assert.ok(faces.length > 16 * 16, 'chunk should have more than just top skins');
  faces.forEach((f) => {
    const xs = f.corners.map((c) => c[0]);
    const ys = f.corners.map((c) => c[1]);
    const zs = f.corners.map((c) => c[2]);
    assert.ok(Math.max(...xs) - Math.min(...xs) <= 1);
    assert.ok(Math.max(...ys) - Math.min(...ys) <= 1);
    assert.ok(Math.max(...zs) - Math.min(...zs) <= 1);
  });
  assert.ok(E.WORLD_SIZE >= 80, 'playable map should be at least 80×80');
  assert.equal(E.WORLD_SIZE, 192);
  assert.equal(world.size, E.WORLD_SIZE);
  const species = new Set((world.trees || []).map((t) => t.species || 'oak'));
  assert.ok(species.size >= 2, 'trees should mix oak / birch / spruce');
  const dirtTint = E.blockColor('dirt', 3, 1, 3);
  assert.ok(dirtTint[0] > 0.72 && dirtTint[1] > 0.55, 'dirt under grass should be sandy, not chocolate');
  const kinds = new Set(faces.map((f) => f.kind));
  assert.ok(kinds.has('grass') || kinds.has('sand') || kinds.has('snow') || kinds.has('stone'));
  assert.ok(kinds.has('dirt') || kinds.has('sand') || kinds.has('stone'));
  let tops = 0;
  let treesInChunk = 0;
  for (let z = 0; z < 16; z += 1) {
    for (let x = 0; x < 16; x += 1) {
      const h = world.surfaceAt(x, z);
      assert.equal(E.hasBlock(world, x, h - 1, z), true);
      const topKind = E.blockKindAt(world, x, h - 1, z);
      assert.ok(['grass', 'sand', 'snow', 'stone', 'water'].indexOf(topKind) >= 0);
      const tree = world.treeAt(x, z);
      if (tree) {
        treesInChunk += 1;
        assert.equal(E.voxelAt(world, x, h, z), 'log');
      } else {
        assert.equal(E.hasBlock(world, x, h, z), false);
      }
      const top = faces.find((f) => f.x === x && f.z === z && f.y === h - 1 && f.dir === '+y');
      if (top) tops += 1;
    }
  }
  assert.equal(tops, 16 * 16 - treesInChunk);
});

test('six climates make distinct Minecraft-like maps', () => {
  assert.equal(typeof E.biomeAt, 'function');
  const plains = E.createWorld(7, { climate: 'plains' });
  const forest = E.createWorld(21, { climate: 'forest' });
  const quarry = E.createWorld(33, { climate: 'quarry' });
  const astral = E.createWorld(71, { climate: 'astral' });
  assert.ok(forest.trees.length > quarry.trees.length, 'forest should be denser than quarry');
  const mid = Math.floor(plains.size / 2);
  assert.ok(['plains', 'forest', 'desert', 'mountain', 'snow'].indexOf(E.biomeAt(plains, mid, mid)) >= 0);
  let snow = 0;
  let sand = 0;
  let grass = 0;
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 19) % plains.size;
    const z = (i * 23) % plains.size;
    const top = E.blockKindAt(plains, x, plains.surfaceAt(x, z) - 1, z);
    if (top === 'grass') grass += 1;
    const at = E.blockKindAt(astral, x, astral.surfaceAt(x, z) - 1, z);
    if (at === 'snow') snow += 1;
    const qt = E.blockKindAt(quarry, x, quarry.surfaceAt(x, z) - 1, z);
    if (qt === 'sand' || qt === 'stone') sand += 1;
  }
  assert.ok(grass >= 20, 'plains climate should still show grass');
  assert.ok(snow + sand >= 8, 'later climates should show snow / sand / stone');
  const climates = (globalThis.BlockLegendLevels.LEVELS || []).map((row) => row.climate);
  assert.ok(new Set(climates).size >= 5, 'each chapter should pick a different climate');
});

test('plains map has caves, ores, water and a village', () => {
  const world = E.createWorld(7, { climate: 'plains' });
  assert.ok(world.hollow && Object.keys(world.hollow).length >= 20, 'caves should carve hollow cells');
  const mid = Math.floor(world.size / 2);
  let water = 0, coal = 0, iron = 0, plank = 0, hollowOpen = 0;
  for (let z = mid - 24; z <= mid + 24; z += 1) {
    for (let x = mid - 24; x <= mid + 24; x += 1) {
      const h = world.surfaceAt(x, z);
      if (E.blockKindAt(world, x, h - 1, z) === 'water') water += 1;
      if (E.blockKindAt(world, x, h - 1, z) === 'plank' || E.voxelAt(world, x, h, z) === 'plank') plank += 1;
      for (let y = 1; y < h - 1; y += 1) {
        const kind = E.voxelAt(world, x, y, z);
        if (kind === 'coal') coal += 1;
        if (kind === 'iron') iron += 1;
        if (!kind) hollowOpen += 1;
      }
    }
  }
  assert.ok(water >= 4, 'should have a pond');
  assert.ok(plank >= 8, 'village should stamp oak planks');
  assert.ok(coal + iron >= 3, 'stone should hide coal / iron');
  assert.ok(hollowOpen >= 8, 'caves should be walkable voids');
  assert.equal(E.tileIndex('water'), 14);
  assert.equal(E.tileIndex('coal'), 15);
});

test('atlas exports 18+ tiles and four distinct crack stages', () => {
  assert.ok(E.ATLAS_COLS >= 4);
  assert.ok(E.ATLAS_ROWS >= 5);
  assert.ok(E.ATLAS_COLS * E.ATLAS_ROWS >= 18, 'atlas must fit terrain + 4 crack tiles');
  const cracks = [0, 1, 2, 3].map((stage) => E.tileIndex('crack', stage));
  assert.deepEqual(new Set(cracks).size, 4);
  cracks.forEach((idx) => {
    assert.ok(idx >= 0 && idx < E.ATLAS_COLS * E.ATLAS_ROWS);
  });
  assert.equal(E.tileIndex('grass', '+y'), 0);
  assert.equal(E.tileIndex('dirt'), 2);
  assert.equal(E.tileIndex('log', '+x', 'oak'), 4);
  assert.equal(E.tileIndex('log', '+y', 'birch'), 9);
  assert.equal(E.tileIndex('leaf', '+y', 'spruce'), 13);
});

test('tree column cache keeps voxelAt stable across 200 samples', () => {
  const world = E.createWorld(7);
  assert.ok(world.treeCols);
  const tree = world.trees[0];
  assert.equal(E.voxelAt(world, tree.x, tree.surface, tree.z), 'log');
  const facesA = E.collectChunkFaces(world, 0, 0).length;
  const facesB = E.collectChunkFaces(world, 0, 0).length;
  assert.equal(facesA, facesB);
  for (let i = 0; i < 200; i += 1) {
    const x = (i * 17) % world.size;
    const z = (i * 29) % world.size;
    const y = i % 12;
    const a = E.voxelAt(world, x, y, z);
    const b = E.voxelAt(world, x, y, z);
    assert.equal(a, b);
  }
});

test('L-shaped dirt pair darkens the inner-corner face via AO', () => {
  assert.equal(E.faceShade('+x'), 0.6);
  assert.equal(E.faceShade('-y'), 0.5);
  assert.equal(E.faceShade('+y'), 1);
  const n = 16;
  const heights = new Uint8Array(n * n);
  for (let i = 0; i < heights.length; i += 1) heights[i] = 2;
  const world = {
    size: n,
    heights: heights,
    trees: [],
    treeCols: {},
    edits: {},
    surfaceAt: function (x, z) { return 2; },
    treeAt: function () { return null; }
  };
  E.placeVoxel(world, 3, 2, 3, 'dirt');
  E.placeVoxel(world, 4, 2, 4, 'dirt');
  const near = E.vertexAO(world, 3, 2, 3, '+z');
  E.placeVoxel(world, 10, 2, 10, 'dirt');
  const open = E.vertexAO(world, 10, 2, 10, '+z');
  assert.ok(Math.min.apply(null, near) < Math.min.apply(null, open), 'face beside a neighbor should AO-darken');
});

await import('../prj/games/blocklegend/data/tools.js');
const T = globalThis.BlockLegendTools;

test('chunksAround returns clamped keys within view radius', () => {
  assert.equal(typeof E.chunksAround, 'function');
  const R = E.VIEW_CHUNKS;
  const mid = E.chunksAround(64.5, 64.5, 128, 16, R);
  assert.ok(mid.length <= (2 * R + 1) * (2 * R + 1));
  assert.ok(mid.indexOf('64,64') >= 0);
  const edge = E.chunksAround(0.5, 0.5, 128, 16, R);
  assert.ok(edge.indexOf('0,0') >= 0);
  edge.forEach((key) => {
    const parts = key.split(',');
    const cx = Number(parts[0]), cz = Number(parts[1]);
    assert.ok(cx >= 0 && cz >= 0 && cx < 128 && cz < 128);
    assert.equal(cx % 16, 0);
    assert.equal(cz % 16, 0);
  });
  const corner = E.chunksAround(127.2, 127.2, 128, 16, R);
  assert.ok(corner.indexOf('112,112') >= 0);
});

test('tools table: sword/axe/pickaxe/shovel have distinct mine and melee roles', () => {
  assert.equal(typeof T, 'object');
  assert.deepEqual(T.SLOT_IDS, ['sword', 'axe', 'pickaxe', 'shovel']);
  assert.ok(T.breakMs('axe', 'log') < T.breakMs('sword', 'log'));
  assert.ok(T.breakMs('pickaxe', 'stone') < T.breakMs('axe', 'stone'));
  assert.ok(T.breakMs('shovel', 'dirt') < T.breakMs('pickaxe', 'dirt'));
  assert.ok(T.meleeScale('sword') > T.meleeScale('axe'));
  assert.equal(T.dropOf('log'), 'oak-log');
  assert.equal(T.dropOf('stone'), 'cobble');
  assert.equal(T.lookDir(0, 0).z < 0, true);
});

test('voxel ray hits the first solid cell along the look ray', () => {
  const sample = function (x, y, z) {
    if (x === 5 && y === 4 && z === 2) return 'log';
    return null;
  };
  const miss = T.voxelRay({ x: 0.5, y: 4.5, z: 8.5 }, { x: 0, y: 0, z: -1 }, 3, sample);
  assert.equal(miss.hit, false);
  const hit = T.voxelRay({ x: 5.4, y: 4.4, z: 8.5 }, { x: 0, y: 0, z: -1 }, 8, sample);
  assert.equal(hit.hit, true);
  assert.equal(hit.kind, 'log');
  assert.equal(hit.x, 5);
  assert.equal(hit.z, 2);
});

test('chopping a tree and mining a block clear voxels and drop the right item', () => {
  const world = E.createWorld(7);
  const tree = world.trees[0];
  assert.ok(tree);
  assert.equal(E.voxelAt(world, tree.x, tree.surface, tree.z), 'log');
  const chopped = E.breakVoxel(world, tree.x, tree.surface, tree.z);
  assert.equal(chopped.ok, true);
  assert.equal(chopped.drop, 'oak-log');
  assert.equal(E.voxelAt(world, tree.x, tree.surface, tree.z), null);
  assert.equal(E.voxelAt(world, tree.x, tree.surface + 1, tree.z), 'log');
  assert.ok(world.treeAt(tree.x, tree.z));
  const gx = 8, gz = 8;
  const gy = world.surfaceAt(gx, gz) - 1;
  const kind = E.voxelAt(world, gx, gy, gz);
  assert.ok(kind);
  const broke = E.breakVoxel(world, gx, gy, gz);
  assert.equal(broke.ok, true);
  assert.equal(broke.kind, kind);
  assert.equal(broke.drop, T.dropOf(kind));
  assert.equal(E.voxelAt(world, gx, gy, gz), null);
  assert.equal(E.breakVoxel(world, gx, 0, gz).ok, false);
  const py = world.surfaceAt(gx, gz);
  const put = E.placeVoxel(world, gx, py, gz, 'dirt');
  assert.equal(put.ok, true);
  assert.equal(E.voxelAt(world, gx, py, gz), 'dirt');
  assert.equal(E.placeVoxel(world, gx, 0, gz, 'dirt').ok, false);
  assert.equal(E.placeVoxel(world, gx, py, gz, 'dirt').ok, false);
});

await import('../prj/games/blocklegend/data/shop.js');
const S = globalThis.BlockLegendShop;

test('shop sells four cheap items, writes gear, and defense floors contact at 1', () => {
  assert.equal(typeof S, 'object');
  assert.equal(S.ITEMS.length, 4);
  assert.equal(S.buy({ coined: 0, gear: {} }, 'leather-cap').ok, false);
  const cap = S.buy({ coined: 20, gear: {} }, 'leather-cap');
  assert.equal(cap.ok, true);
  assert.equal(cap.coined, 0);
  assert.equal(cap.gear.helm, 'leather-cap');
  assert.equal(S.statsOf(cap.gear).def, 2);
  assert.equal(S.mitigate(2, 2), 1);
  assert.equal(S.mitigate(2, 5), 1);
  const pot = S.buy({ coined: 12, gear: {} }, 'hp-potion');
  assert.equal(pot.ok, true);
  assert.equal(pot.heal, 8);
  assert.deepEqual(pot.gear, {});
});

function addDays(date, days) {
  const stamp = new Date(String(date) + 'T12:00:00');
  stamp.setDate(stamp.getDate() + Math.max(0, Number(days) || 0));
  return stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0');
}

function loadBridgeBox(opts) {
  const store = {};
  const box = {
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = String(value); },
      removeItem(key) { delete store[key]; }
    },
    console: { warn() {}, log() {} }
  };
  box.window = box;
  box.globalThis = box;
  const files = [];
  if (!opts || opts.withEngines !== false) {
    files.push(path.join(repoRoot, 'prj', 'preschool-english-vocab.js'));
    files.push(path.join(repoRoot, 'prj', 'child-courses.js'));
  }
  files.push(path.join(repoRoot, 'prj', 'games', 'shared', 'workbench-bridge.js'));
  files.forEach((file) => vm.runInNewContext(fs.readFileSync(file, 'utf8'), box));
  if (opts && opts.seed) {
    box.localStorage.setItem(box.WorkbenchGameBridge.STORAGE_KEY, JSON.stringify(opts.seed));
  }
  return { box, store, bridge: box.WorkbenchGameBridge };
}

function masteryOf(bridge, word) {
  const state = bridge.readState();
  const mastery = state.courseProgress && state.courseProgress.minecraft && state.courseProgress.minecraft.mastery;
  return mastery ? mastery[String(word).toLowerCase()] : undefined;
}

test('recordWordAnswer marks a correct word ready and schedules +3 day review', () => {
  const { bridge } = loadBridgeBox();
  assert.equal(typeof bridge.recordWordAnswer, 'function');
  const item = bridge.recordWordAnswer('Creeper', true);
  assert.ok(item);
  assert.equal(item.attempts, 1);
  assert.equal(item.correct, 1);
  assert.equal(item.state, 'ready');
  assert.equal(item.nextReview, addDays(bridge.today(), 3));
  const stored = masteryOf(bridge, 'creeper');
  assert.equal(stored.state, 'ready');
  assert.equal(stored.attempts, 1);
  assert.equal(stored.correct, 1);
  assert.equal(stored.dates.length, 1);
  assert.equal(stored.dates[0], bridge.today());
});

test('recordWordAnswer same-day repeat increments attempts but not dates', () => {
  const { bridge } = loadBridgeBox();
  bridge.recordWordAnswer('Creeper', true);
  const again = bridge.recordWordAnswer('Creeper', true);
  assert.equal(again.attempts, 2);
  assert.equal(again.correct, 2);
  assert.equal(again.dates.length, 1);
  assert.equal(again.dates[0], bridge.today());
});

test('recordWordAnswer wrong answer stays practicing with +1 day review', () => {
  const { bridge } = loadBridgeBox();
  const item = bridge.recordWordAnswer('zombie', false);
  assert.equal(item.state, 'practicing');
  assert.equal(item.attempts, 1);
  assert.equal(item.correct, 0);
  assert.equal(item.nextReview, addDays(bridge.today(), 1));
});

test('recordWordAnswer never awards sunlight', () => {
  const { bridge } = loadBridgeBox({
    seed: {
      growth: { sunlight: 40, totalSunlightEarned: 40, awardedIds: [], worldGames: { meta: {} } },
      courseProgress: { completedLessonIds: [] }
    }
  });
  const before = bridge.readState();
  bridge.recordWordAnswer('Creeper', true);
  const after = bridge.readState();
  assert.equal(after.growth.sunlight, before.growth.sunlight);
  assert.equal(after.growth.totalSunlightEarned, before.growth.totalSunlightEarned);
  assert.deepEqual(after.growth.awardedIds || [], before.growth.awardedIds || []);
});

test('recordWordAnswer is a no-op when vocab engines are missing', () => {
  const { bridge, store } = loadBridgeBox({ withEngines: false });
  const keysBefore = Object.keys(store);
  let threw = false;
  let result;
  try {
    result = bridge.recordWordAnswer('Creeper', true);
  } catch (err) {
    threw = true;
  }
  assert.equal(threw, false);
  assert.equal(result, null);
  assert.deepEqual(Object.keys(store), keysBefore);
});

test('recordWordAnswer bootstraps missing minecraft field on old snapshots', () => {
  const { bridge } = loadBridgeBox({
    seed: {
      growth: { sunlight: 10, totalSunlightEarned: 10, awardedIds: [] },
      courseProgress: { completedLessonIds: ['preschool-chinese-1'] }
    }
  });
  const item = bridge.recordWordAnswer('oak', true);
  assert.equal(item.state, 'ready');
  const state = bridge.readState();
  assert.ok(state.courseProgress.minecraft);
  assert.ok(state.courseProgress.minecraft.mastery.oak);
  assert.equal(state.courseProgress.completedLessonIds.length, 1);
  assert.equal(state.courseProgress.completedLessonIds[0], 'preschool-chinese-1');
});

test('game.js mounts crack overlay while mining and clears it on stop', () => {
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(game, /function ensureCrack/);
  assert.match(game, /function hideCrack/);
  assert.match(game, /tileIndex\(\s*['"]crack['"]/);
  assert.match(game, /polygonOffset/);
  assert.match(game, /spawnBurst\([\s\S]{0,80}2/);
});

test('blocklegend page loads mastery engines and game.js writes answers back', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(repoRoot, 'prj', 'games', 'blocklegend', 'game.js'), 'utf8');
  assert.match(html, /preschool-english-vocab\.js\?v=/);
  assert.match(html, /child-courses\.js\?v=/);
  assert.match(game, /recordWordAnswer\(word\.text,\s*correct\)/);
});
