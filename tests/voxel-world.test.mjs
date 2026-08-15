import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

await import('../prj/games/voxel-adventure/data/world.js');
await import('../prj/games/voxel-adventure/data/quests.js');
await import('../prj/games/voxel-adventure/data/levels.js');
const VW = globalThis.VoxelWorld;
const Q = globalThis.VoxelQuests;
const VL = globalThis.VoxelLevels;

test('default voxel world is a bounded grass-dirt-stone home', () => {
  const world = VW.createDefaultWorld(3);
  assert.equal(world.cols, 40);
  assert.equal(world.rows, 18);
  assert.equal(VW.getCell(world, 0, world.rows - 1), 'bedrock');
  assert.equal(VW.getCell(world, 21, 10), 'air');
  assert.equal(VW.countKind(world, 'grass') > 0, true);
  assert.equal(VW.countKind(world, 'crystal'), 6);
});

test('hand breaks grass into inventory and place puts it back', () => {
  const world = VW.createDefaultWorld(3);
  let inv = VW.emptyInv();
  let x = 0;
  let y = 0;
  for (let yy = 0; yy < world.rows; yy += 1) {
    for (let xx = 0; xx < world.cols; xx += 1) {
      if (world.grid[yy][xx] === 'grass') { x = xx; y = yy; }
    }
  }
  const dug = VW.breakBlock(world, x, y, 'hand', 1);
  assert.equal(dug.ok, true);
  assert.equal(dug.kind, 'grass');
  inv = VW.addToInventory(inv, dug.kind, 1);
  assert.equal(inv.grass, 1);
  const bag = VW.consumeFromInventory(inv, 'grass');
  const placed = VW.placeBlock(world, x, y, 'grass');
  assert.equal(bag.ok, true);
  assert.equal(placed.ok, true);
  assert.equal(VW.getCell(world, x, y), 'grass');
});

test('hand cannot mine stone; wood pick can (Paper MC tool chain)', () => {
  const world = VW.createDefaultWorld(3);
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      if (world.grid[y][x] === 'stone') { sx = x; sy = y; }
    }
  }
  const hand = VW.breakBlock(world, sx, sy, 'hand', 1);
  assert.equal(hand.ok, false);
  assert.match(hand.reason, /木镐/);
  const pick = VW.breakBlock(world, sx, sy, 'wood_pick', 1);
  assert.equal(pick.ok, true);
  assert.equal(VW.canBreak('bedrock', 'wood_pick', 5), false);
});

test('saved home world round-trips without changing size', () => {
  const world = VW.createDefaultWorld(3);
  VW.placeBlock(world, 1, 1, 'grass');
  const snap = VW.cloneWorld(world);
  assert.equal(VW.isValidWorld(snap), true);
  assert.equal(VW.getCell(snap, 1, 1), 'grass');
  assert.notEqual(snap.grid, world.grid);
});

test('laying eight grass completes the first career quest', () => {
  const q1 = Q.get('q1');
  const stats = {
    placedThis: { grass: 8 },
    placedAnyThis: 8,
    collectedThis: {},
    buildTotal: 8,
    buildTotalByKind: { grass: 8 },
    crystalsTotal: 0,
    blocksAlive: 30
  };
  assert.equal(VW.isQuestComplete(q1, stats), true);
  assert.equal(VW.questValue(q1, { placedThis: { grass: 3 } }), 3);
  assert.equal(VW.minerRank(['q1', 'q2'], Q.ranks), 2);
});

test('home world has sand water coal and keeps six crystals', () => {
  const world = VW.createDefaultWorld(3);
  assert.equal(VW.countKind(world, 'sand') > 0, true);
  assert.equal(VW.countKind(world, 'water') > 0, true);
  assert.equal(VW.countKind(world, 'coal') > 0, true);
  assert.equal(VW.countKind(world, 'crystal'), 6);
  assert.equal(VW.isPassable('water'), true);
  assert.equal(VW.isPassable('sand'), false);
});

test('hand scoops sand and wood pick mines coal', () => {
  const world = VW.createDefaultWorld(3);
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      if (world.grid[y][x] === 'sand') { sx = x; sy = y; }
    }
  }
  const sand = VW.breakBlock(world, sx, sy, 'hand', 1);
  assert.equal(sand.ok, true);
  assert.equal(sand.kind, 'sand');
  let cx = 0;
  let cy = 0;
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      if (world.grid[y][x] === 'coal') { cx = x; cy = y; }
    }
  }
  assert.equal(VW.breakBlock(world, cx, cy, 'hand', 1).ok, false);
  const dug = VW.breakBlock(world, cx, cy, 'wood_pick', 2);
  assert.equal(dug.ok, true);
  assert.equal(dug.kind, 'coal');
});

test('stone pick mines crystal; hand cannot', () => {
  const world = VW.createDefaultWorld(3);
  let cx = 0;
  let cy = 0;
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      if (world.grid[y][x] === 'crystal') { cx = x; cy = y; break; }
    }
  }
  assert.equal(VW.breakBlock(world, cx, cy, 'wood_pick', 1).ok, false);
  assert.equal(VW.breakBlock(world, cx, cy, 'stone_pick', 1).ok, true);
});

test('craft stick and wood pick from planks', () => {
  let inv = VW.emptyInv();
  inv.plank = 5;
  const sticks = VW.craft(inv, 'stick');
  assert.equal(sticks.ok, true);
  assert.equal(sticks.inventory.stick, 4);
  assert.equal(sticks.inventory.plank, 3);
  const pick = VW.craft(sticks.inventory, 'wood_pick');
  assert.equal(pick.ok, true);
  assert.equal(pick.inventory.wood_pick, 1);
});

test('eight region levels expose goals from DS scratch doc', () => {
  assert.equal(VL.count, 8);
  assert.equal(VL.get(1).region, 'grassland');
  assert.equal(VL.get(4).goal.type, 'coal');
  assert.equal(VL.REGIONS.forest.treeDensity > 1, true);
});

test('spark chases miner one cell and bump costs one heart', () => {
  const world = VW.createDefaultWorld(3);
  const spawn = VW.spawnCell(world);
  const left = VW.tryMove(world, spawn.x, spawn.y, -1, 0);
  assert.equal(left.ok, true);
  const spark = VW.stepChase(world, { x: 15, y: spawn.y, kind: 'spark' }, spawn);
  assert.equal(spark.x < 15, true);
  assert.equal(VW.hitMiner(VW.MAX_HP, VW.BUMP_HP), VW.MAX_HP - 1);
  assert.equal(VW.hitMiner(1, 1), 0);
  assert.equal(VW.sameCell(spawn, spawn), true);
});

test('hand chops wood and the trunk above it', () => {
  const world = VW.createDefaultWorld(3);
  let wx = 0;
  let wy = 0;
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      if (world.grid[y][x] === 'wood') { wx = x; wy = y; }
    }
  }
  assert.equal(VW.getCell(world, wx, wy), 'wood');
  assert.equal(VW.getCell(world, wx, wy - 1), 'wood');
  const dug = VW.mineBlock(world, wx, wy, 'hand', 1);
  assert.equal(dug.ok, true);
  assert.equal(dug.kind, 'wood');
  assert.equal(dug.dropped.length, 2);
  assert.equal(VW.getCell(world, wx, wy), 'air');
  assert.equal(VW.getCell(world, wx, wy - 1), 'air');
  assert.equal(VW.canBreak('wood', 'hand', 1), true);
  assert.equal(VW.canBreak('leaf', 'hand', 1), true);
  assert.equal(VW.countKind(world, 'leaf') > 0, true);
});

test('jump lifts a grounded miner two cells when air is clear', () => {
  const world = VW.createDefaultWorld(3);
  const spawn = VW.spawnCell(world);
  assert.equal(VW.isGrounded(world, spawn.x, spawn.y), true);
  const hopped = VW.jumpUp(world, spawn.x, spawn.y, 2);
  assert.equal(hopped.ok, true);
  assert.equal(hopped.y < spawn.y, true);
  const fall = VW.stepFall(world, hopped.x, hopped.y);
  assert.equal(fall.ok, true);
});

test('one wood crafts four planks and missing wood fails', () => {
  let inv = VW.emptyInv();
  inv.wood = 1;
  const made = VW.craft(inv, 'plank');
  assert.equal(made.ok, true);
  assert.equal(made.inventory.wood, 0);
  assert.equal(made.inventory.plank, 4);
  const back = VW.craft(made.inventory, 'wood');
  assert.equal(back.ok, true);
  assert.equal(back.inventory.wood, 1);
  assert.equal(back.inventory.plank, 0);
  const fail = VW.craft(VW.emptyInv(), 'plank');
  assert.equal(fail.ok, false);
  assert.equal(fail.reason, '材料不够');
});

test('island gaps are void at the bottom and spawn is safe', () => {
  const world = VW.createDefaultWorld(3);
  const spawn = VW.spawnCell(world);
  assert.equal(VW.isVoid(world, spawn.x, spawn.y), false);
  assert.equal(VW.getCell(world, 21, world.rows - 1), 'air');
  assert.equal(VW.isVoid(world, 21, world.rows - 1), true);
  assert.equal(VW.isValidWorld({
    cols: 16,
    rows: 12,
    grid: Array.from({ length: 12 }, () => Array(16).fill('air'))
  }), true);
});

test('mc texture set from 2d-minecraft (zlib) backs the renderer and hotbar', () => {
  const gameDir = path.join(fileURLToPath(new URL('../prj/games/voxel-adventure/', import.meta.url)));
  const gameSrc = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  ['blocks/grass-block.png', 'blocks/dirt.png', 'blocks/stone.png', 'blocks/oak-log.png',
    'blocks/oak-leaves.png', 'blocks/oak-planks.png', 'blocks/coal-ore.png', 'blocks/diamond-ore.png',
    'blocks/destroy_stage_0.png', 'blocks/destroy_stage_9.png',
    'items/wooden-pickaxe.png', 'items/stone-pickaxe.png', 'ui/hotbar.png', 'ui/hotbar-selection.png'
  ].forEach(function (rel) {
    assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'mc', rel)), true, rel + ' missing');
  });
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'mc', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'mc', 'steve.png')), false); // Mojang IP 不入库
  assert.match(gameSrc, /MC_TEXTURES/);
  assert.match(gameSrc, /destroy_stage_/);
  assert.match(gameSrc, /tex_' \+ kind/);
  assert.match(cssSrc, /assets\/mc\/ui\/hotbar\.png/);
  assert.match(cssSrc, /image-rendering: pixelated/);
});
