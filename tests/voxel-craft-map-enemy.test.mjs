import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameDir = path.join(repoRoot, 'prj', 'games', 'voxel-craft');

await import('../prj/games/voxel-craft/data/maps.js');
await import('../prj/games/voxel-craft/data/enemies.js');
await import('../prj/games/voxel-craft/data/world.js');
await import('../prj/games/voxel-craft/engine.js');

const Maps = globalThis.VoxelCraftMaps;
const Enemies = globalThis.VoxelCraftEnemies;
const World = globalThis.VoxelCraftWorld;
const Engine = globalThis.VoxelCraftEngine;

test('参考群系目录接入当前游戏并保留 meadow/cave 兼容入口', () => {
  assert.equal(Maps.count >= 15, true);
  ['meadow', 'forest', 'snow', 'desert', 'cave', 'ocean', 'nether', 'deep_dark', 'end', 'sky_dimension'].forEach((id) => {
    const map = Maps.get(id);
    assert.equal(map.id, id);
    assert.ok(map.title);
    assert.ok(Array.isArray(map.enemyPool));
  });
  assert.equal(Maps.isUnlocked('forest', 1), true);
  assert.equal(Maps.isUnlocked('deep_dark', 1), false);
});

test('15 张地图用同一种子生成稳定且出生点安全', () => {
  Maps.list.forEach((map) => {
    const world = World.createWorld(37, map.id);
    const again = World.createWorld(37, map.id);
    const spawn = World.spawnCell(world);
    assert.equal(world.mapId, map.id);
    assert.deepEqual(world.grid, again.grid, map.id + ' should be deterministic');
    assert.equal(World.getCell(world, spawn.x, spawn.y), 'air', map.id + ' spawn body must be clear');
    assert.equal(World.isSolid(World.getCell(world, spawn.x, spawn.surface)), true, map.id + ' spawn floor must be solid');
  });
});

test('参考项目的敌人分层池都能创建当前引擎可用的角色', () => {
  const expected = ['bee', 'fox', 'witch', 'spore_bug', 'magma_cube', 'fire_spirit', 'sculk_worm', 'shadow_stalker', 'warden', 'phantom', 'vex', 'golem'];
  expected.forEach((id) => {
    const row = Enemies.get(id);
    assert.equal(row.id, id);
    assert.ok(row.hp > 0);
    assert.ok(row.damage > 0);
    assert.ok(row.sprite);
  });
  Maps.list.forEach((map) => {
    const pool = Enemies.getPool(map.id, 3);
    assert.ok(pool.length > 0, map.id + ' must expose an enemy pool');
    pool.forEach((id) => assert.equal(Enemies.get(id).id, id, id + ' must be registered'));
  });
});

test('敌人追踪、接触伤害和攻击命中是可测试的纯行为', () => {
  const world = World.createWorld(3, 'forest');
  const enemy = Enemies.create('zombie', 12 * Engine.TILE, 0);
  enemy.y = World.surfaceOf(world, 12) * Engine.TILE - enemy.h;
  const player = { x: 15 * Engine.TILE, y: enemy.y, w: 18, h: 54, facing: 1 };
  const moved = Engine.updateEnemy(enemy, player, () => false, 1);
  assert.equal(moved.x > enemy.x, true);
  assert.equal(Engine.rectsOverlap({ x: moved.x, y: moved.y, w: moved.w, h: moved.h }, player), false);
  const hit = Engine.attackEnemy(enemy, { x: enemy.x - 4, y: enemy.y, w: 18, h: 54, facing: 1 }, 2);
  assert.equal(hit.ok, true);
  assert.equal(enemy.hp, enemy.maxHp - 2);
  const damage = Engine.enemyDamage(enemy, { x: enemy.x - 4, y: enemy.y, w: 18, h: 54, facing: 1 }, 0);
  assert.equal(damage, enemy.damage);
});

test('五张核心地图有不同天空、地形和地面装饰', () => {
  const ids = ['meadow', 'forest', 'desert', 'cave', 'nether'];
  const worlds = {};
  ids.forEach((id) => { worlds[id] = World.createWorld(37, id); });
  const skies = ids.map((id) => World.lookOf(worlds[id]).sky);
  assert.deepEqual(skies, ['day', 'forest', 'desert', 'cave', 'nether']);
  assert.equal(new Set(skies).size, 5);
  assert.ok(World.countKind(worlds.forest, 'wood') > World.countKind(worlds.meadow, 'wood'));
  assert.ok(World.countKind(worlds.desert, 'sand') > World.countKind(worlds.meadow, 'sand'));
  assert.equal(World.countKind(worlds.nether, 'water'), 0);
  assert.ok(World.countKind(worlds.nether, 'coal') > World.countKind(worlds.meadow, 'coal'));
  const types = function (world) {
    return (world.decorations || []).map((row) => row.type);
  };
  assert.equal(types(worlds.forest).includes('bush'), true);
  assert.equal(types(worlds.desert).includes('cactus'), true);
  assert.equal(types(worlds.nether).includes('ember'), true);
  assert.equal(types(worlds.cave).includes('crystal_glow'), true);
});

test('引擎为五张核心地图选择不同天空图，并绘制地面装饰', () => {
  assert.equal(Engine.skyKey('meadow'), 'skyDay');
  assert.equal(Engine.skyKey('forest'), 'skyForest');
  assert.equal(Engine.skyKey('desert'), 'skyDesert');
  assert.equal(Engine.skyKey('nether'), 'skyNether');
  assert.equal(Engine.skyKey('cave'), null);
  const engine = fs.readFileSync(path.join(gameDir, 'engine.js'), 'utf8');
  assert.match(engine, /sky-forest\.png/);
  assert.match(engine, /sky-desert\.png/);
  assert.match(engine, /sky-nether\.png/);
  assert.match(engine, /function drawDecorations/);
  assert.match(engine, /deco-bush\.png|decoBush/);
});

test('五张核心地图的天空和装饰资产已落盘', () => {
  const files = [
    'assets/bg/sky-forest.png',
    'assets/bg/sky-desert.png',
    'assets/bg/sky-nether.png',
    'assets/deco/deco-bush.png',
    'assets/deco/deco-cactus.png',
    'assets/deco/deco-ember.png'
  ];
  files.forEach((rel) => {
    assert.equal(fs.existsSync(path.join(gameDir, rel)), true, rel + ' missing');
  });
});

test('voxel-craft 页面加载地图/敌人模块并提供地图、生命、攻击 UI', () => {
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  assert.match(html, /data\/maps\.js/);
  assert.match(html, /data\/enemies\.js/);
  assert.match(html, /map-btn|map-layer/);
  assert.match(html, /hp-label|enemy-label/);
  assert.match(game, /VoxelCraftMaps/);
  assert.match(game, /VoxelCraftEnemies/);
  assert.match(game, /function enterMap/);
  assert.match(game, /function attack/);
  assert.match(css, /vc-map-grid/);
  assert.match(css, /vc-enemy-hp/);
});
