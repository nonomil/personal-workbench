import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

await import('../prj/games/voxel-craft/data/world.js');
await import('../prj/games/voxel-craft/data/quests.js');
const VW = globalThis.VoxelCraftWorld;
const Q = globalThis.VoxelQuests;

const gameDir = path.join(fileURLToPath(new URL('../prj/games/voxel-craft/', import.meta.url)));

test('world generates chunked terrain with layers, a tree near spawn and ore veins', () => {
  const world = VW.createWorld(7);
  assert.equal(world.cols, VW.COLS);
  assert.equal(world.rows, VW.ROWS);
  assert.equal(VW.COLS, 64);
  assert.equal(VW.ROWS, 32);
  assert.equal(VW.getCell(world, 3, VW.ROWS - 1), 'bedrock');
  assert.ok(VW.countKind(world, 'grass') > 10);
  assert.ok(VW.countKind(world, 'dirt') > 20);
  assert.ok(VW.countKind(world, 'stone') > 100);
  // 第 3 列必有一棵树（C++ 的 rig 技巧）
  assert.equal(VW.getCell(world, 3, VW.surfaceOf(world, 3) - 1), 'wood');
  assert.ok(VW.countKind(world, 'leaf') > 3);
  // 矿脉：煤浅层若干、晶体固定 6 个且在最深 8 行
  assert.ok(VW.countKind(world, 'coal') >= 4);
  assert.equal(VW.countKind(world, 'crystal'), 6);
  for (let y = 0; y < VW.ROWS - 8; y += 1) {
    for (let x = 0; x < VW.COLS; x += 1) {
      if (VW.getCell(world, x, y) === 'crystal') throw new Error('crystal above deep zone');
    }
  }
  // 沙滩与水塘存在
  assert.ok(VW.countKind(world, 'sand') > 0);
  assert.ok(VW.countKind(world, 'water') > 0);
  // 同种子可复现
  const again = VW.createWorld(7);
  assert.deepEqual(again.grid, world.grid);
});

test('spawn is safe: standing cell clear, ground solid, head clear of trees', () => {
  const world = VW.createWorld(3);
  const spawn = VW.spawnCell(world);
  assert.equal(VW.getCell(world, spawn.x, spawn.y), 'air');            // 脚下站立格是空气
  assert.equal(VW.isSolid(VW.getCell(world, spawn.x, spawn.surface)), true); // 地表是实地
  assert.equal(VW.getCell(world, spawn.x, spawn.y - 1), 'air');        // 头顶不嵌树干/树叶
  assert.equal(VW.isPassable('water'), true);
  assert.equal(VW.isPassable('grass'), false);
  assert.equal(VW.isSolid('bedrock'), true);
});

test('tool and rank gates match the design table', () => {
  assert.equal(VW.canBreak('grass', 'hand', 1), true);
  assert.equal(VW.canBreak('wood', 'hand', 1), true); // 空手可砍树（MC 起步循环）
  assert.equal(VW.canBreak('stone', 'hand', 1), false);
  assert.equal(VW.canBreak('stone', 'wood_pick', 1), false); // rank 不足
  assert.equal(VW.canBreak('stone', 'wood_pick', 3), true);
  assert.equal(VW.canBreak('coal', 'stone_pick', 3), true);
  assert.equal(VW.canBreak('crystal', 'stone_pick', 3), false); // rank 不足
  assert.equal(VW.canBreak('crystal', 'stone_pick', 5), true);
  assert.equal(VW.canBreak('bedrock', 'stone_pick', 5), false);
});

test('break and place round-trip through inventory', () => {
  const world = VW.createWorld(3);
  VW.setCell(world, 19, 4, 'dirt'); // 支撑锚点
  VW.setCell(world, 20, 4, 'stone'); // 干净列搭 staging，避开第 3 列的树
  let inv = VW.emptyInv();
  const dug = VW.breakBlock(world, 20, 4, 'wood_pick', 3);
  assert.equal(dug.ok, true);
  assert.equal(dug.kind, 'stone');
  assert.equal(VW.getCell(world, 20, 4), 'air');
  inv = VW.addToInventory(inv, 'stone', 1);
  assert.equal(inv.stone, 1);
  const bag = VW.consumeFromInventory(inv, 'stone');
  assert.equal(bag.ok, true);
  const placed = VW.placeBlock(world, 20, 4, 'stone');
  assert.equal(placed.ok, true);
  assert.equal(VW.getCell(world, 20, 4), 'stone');
  const above = VW.placeBlock(world, 20, 3, 'stone'); // 上方贴邻可放
  assert.equal(above.ok, true);
  const intoStone = VW.breakBlock(world, 20, VW.ROWS - 1, 'stone_pick', 5);
  assert.equal(intoStone.ok, false); // 基岩不可挖
});

test('break times keep C++ ratios (kids ÷4): crystal > coal > stone > grass', () => {
  assert.ok(VW.breakTime('crystal', 'stone_pick') > VW.breakTime('coal', 'stone_pick'));
  assert.ok(VW.breakTime('coal', 'stone_pick') > VW.breakTime('stone', 'wood_pick'));
  assert.ok(VW.breakTime('stone', 'wood_pick') > VW.breakTime('grass', 'hand'));
  assert.equal(VW.breakTime('bedrock', 'stone_pick'), Infinity);
});

test('quest judging supports all 8 quest types from quests.js', () => {
  const world = VW.createWorld(3);
  const q = (id) => Q.get(id);
  const stats = {
    placedThis: { grass: 8, stone: 6 },
    placedAnyThis: 14,
    collectedThis: { crystal: 3 },
    buildTotal: 40,
    buildTotalByKind: { grass: 30 },
    crystalsTotal: 25,
    blocksAlive: 60
  };
  assert.equal(VW.isQuestComplete(q('q1'), stats), true);        // build
  assert.equal(VW.isQuestComplete(q('q2'), stats), true);        // collect
  assert.equal(VW.isQuestComplete(q('q4'), stats), true);        // collect_total
  assert.equal(VW.isQuestComplete(q('q5'), stats), true);        // blocks_alive
  assert.equal(VW.isQuestComplete(q('q8'), stats), true);        // build_total
  assert.equal(VW.isQuestComplete(q('q9'), stats), true);        // build_total_block
  assert.equal(VW.isQuestComplete(q('q3'), stats), true);        // build stone 6
  assert.equal(VW.isQuestComplete(q('q12'), stats), false);      // 80 次未到
  assert.equal(VW.questValue(q('q1'), stats), 8);
  assert.equal(VW.questValue(q('q2'), stats), 3);
  // 蓝图：空世界 <80，按锚点填木后 ≥80；锚点必须贴地表上空（镜头可见）
  assert.ok(VW.blueprintCoverage(world, 'hut') < 80);
  const anchor = VW.blueprintAnchor(world, 'hut');
  assert.ok(anchor.y > 2 && anchor.y < VW.surfaceOf(world, VW.BLUEPRINTS.hut.x), 'anchor above ground');
  const filled = VW.cloneWorld(world);
  const spec = VW.BLUEPRINTS.hut;
  spec.pattern.forEach((line, row) => {
    String(line).split('').forEach((ch, col) => {
      if (ch === 'w') filled.grid[anchor.y + row][anchor.x + col] = 'wood';
      if (ch === 'p') filled.grid[anchor.y + row][anchor.x + col] = 'plank';
    });
  });
  assert.ok(VW.blueprintCoverage(filled, 'hut') >= 80);
  assert.equal(VW.isQuestComplete(q('q13'), { placedThis: {}, placedAnyThis: 0, collectedThis: {}, buildTotal: 0, buildTotalByKind: {}, crystalsTotal: 0, blocksAlive: 0, world: filled }), true);
  assert.equal(VW.minerRank(['q1', 'q2'], Q.ranks), 2);
});

test('save round-trip keeps grid, inventory and player position', () => {
  const world = VW.createWorld(3);
  VW.setCell(world, 21, 4, 'plank');
  const snap = VW.serialize(world, { grass: 2 }, { x: 4, y: 6 });
  const back = VW.deserialize(snap);
  assert.equal(back.world.cols, VW.COLS);
  assert.equal(VW.getCell(back.world, 21, 4), 'plank');
  assert.deepEqual(back.inventory, { grass: 2 });
  assert.deepEqual(back.player, { x: 4, y: 6 });
});

test('home snapshot stays under 8KB using letter codes', () => {
  const world = VW.createWorld(3);
  const snap = VW.makeHomeSnapshot(world, '2026-08-15');
  assert.ok(JSON.stringify(snap).length < 8192);
  assert.ok(/^[.a-z]+$/.test(snap.grid[0]));
  assert.equal(snap.date, '2026-08-15');
});

test('crafting and furnace recipes are pure and balanced', () => {
  let inv = VW.emptyInv();
  inv.wood = 1;
  const planks = VW.craft(inv, 'plank');
  assert.equal(planks.ok, true);
  assert.equal(planks.inventory.plank, 4);
  assert.equal(VW.craft(VW.emptyInv(), 'plank').ok, false);
  assert.equal(VW.craft(VW.emptyInv(), 'plank').reason, '材料不够');
  inv = planks.inventory;
  inv.plank = 5;
  const sticks = VW.craft(inv, 'stick');
  assert.equal(sticks.ok, true);
  assert.equal(sticks.inventory.stick, 4);
  const pick = VW.craft(sticks.inventory, 'wood_pick');
  assert.equal(pick.ok, true);
  assert.equal(pick.inventory.wood_pick, 1);
  const smelt = VW.smelt({ wood: 2 }, 'coal');
  assert.equal(smelt.ok, true);
  assert.equal(smelt.inventory.coal, 1);
  assert.equal(VW.smelt({ wood: 0 }, 'coal').ok, false);
});

test('mc texture assets and engine anchors are wired (S2)', () => {
  ['blocks/grass-block.png', 'blocks/stone.png', 'blocks/oak-log.png', 'blocks/diamond-ore.png',
    'blocks/destroy_stage_0.png', 'blocks/destroy_stage_9.png', 'items/wooden-pickaxe.png',
    'items/stone-pickaxe.png', 'ui/hotbar.png', 'ui/hotbar-selection.png'
  ].forEach((rel) => {
    assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'mc', rel)), true, rel + ' missing');
  });
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'hero', 'player.png')), true); // 用户拍板引入参考项目主角（改名避开商标门禁）
  const engine = fs.readFileSync(path.join(gameDir, 'engine.js'), 'utf8');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(engine, /destroy_stage_/);
  assert.match(engine, /imageSmoothingEnabled\s*=\s*false/);
  assert.match(engine, /hero\/player\.png/);
  assert.match(engine, /ROW_WALK/); // 8×7 帧表选帧（C++ animated_texture 语义）
  assert.match(game, /const GAME_ID = 'voxel-adventure'/);
  assert.match(game, /awardSunlight/);
  assert.match(game, /quest-' \+|'quest-' \+/);
  assert.match(game, /daily-'\s*\+/);
  assert.match(game, /getPlayMods/);
  assert.match(html, /返回工作台|preschool-workbench/);
  assert.match(html, /fullscreen|全屏/i);
});

test('no minecraft trademark leaks into public copy', () => {
  ['index.html', 'game.js', 'engine.js', 'game.css'].forEach((f) => {
    const src = fs.readFileSync(path.join(gameDir, f), 'utf8');
    assert.doesNotMatch(src, /Minecraft|我的世界/);
  });
});

test('nick workshop modules: shop, parent lock, legacy saves and free-standing blueprint placement', () => {
  const VW2 = globalThis.VoxelCraftWorld;
  // 旧横版档兼容：clearedLevels → 前 N 个生涯任务
  assert.deepEqual(VW2.legacyQuestsDone([1, 2, 3], VW2.legacyQuestsDone && [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }]), ['q1', 'q2', 'q3']);
  assert.deepEqual(VW2.legacyQuestsDone([1, 2, 3, 4, 5], [{ id: 'q1' }, { id: 'q2' }]), ['q1', 'q2']);
  assert.deepEqual(VW2.legacyQuestsDone(null, [{ id: 'q1' }]), []);
  // 蓝图案内免支撑放置（空中搭积木）
  const world = VW2.createWorld(3);
  assert.equal(VW2.placeBlock(world, 5, 5, 'plank').ok, false);           // 悬空不可放
  assert.equal(VW2.placeBlock(world, 5, 5, 'plank', { free: true }).ok, true); // 蓝图案内可放
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(game, /SHOP = \[/);
  assert.match(game, /spendSunlight/);
  assert.match(game, /parentLock/);
  assert.match(game, /inActiveBlueprint/);
  assert.match(game, /BLUEPRINT_COLORS/);
  assert.match(html, /shop-grid/);
  assert.match(html, /parent-lock-btn/);
  assert.match(html, /sun-label/);
});

test('rank reward packs grant materials once and backfill old ranks', () => {
  const pack2 = VW.rankRewardPack(2);
  assert.deepEqual(pack2, [{ kind: 'plank', n: 8 }]);
  assert.deepEqual(VW.rankRewardPack(3), [{ kind: 'stone', n: 8 }, { kind: 'torch', n: 2 }]);
  assert.deepEqual(VW.rankRewardPack(4), [{ kind: 'crystal', n: 1 }, { kind: 'torch', n: 4 }]);
  assert.equal(VW.rankRewardPack(5).some(function (item) { return item.kind === 'blueprint'; }), true);

  let inv = VW.emptyInv();
  let claimed = [];
  const first = VW.claimRankReward(inv, claimed, 2);
  assert.equal(first.ok, true);
  assert.equal(first.inventory.plank, 8);
  assert.deepEqual(first.claimed, ['rank-2']);
  const again = VW.claimRankReward(first.inventory, first.claimed, 2);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'already');
  assert.equal(again.inventory.plank, 8);

  const pending = VW.pendingRankRewards(4, []);
  assert.deepEqual(pending, [2, 3, 4]);
  const backfill = VW.claimPendingRankRewards(VW.emptyInv(), [], 4);
  assert.equal(backfill.inventory.plank, 8);
  assert.equal(backfill.inventory.stone, 8);
  assert.equal(backfill.inventory.torch, 6);
  assert.equal(backfill.inventory.crystal, 1);
  assert.deepEqual(backfill.claimed, ['rank-2', 'rank-3', 'rank-4']);

  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /claimPendingRankRewards|claimRankReward/);
  assert.match(game, /rankRewardsClaimed/);
});

test('voxel-craft wires mine jump craft and buy sounds', () => {
  const sfx = fs.readFileSync(path.join(fileURLToPath(new URL('../prj/games/shared/game-sfx.js', import.meta.url))), 'utf8');
  ['mine', 'jump', 'craft', 'buy'].forEach(function (name) {
    assert.match(sfx, new RegExp(name + ':\\s*function'));
  });
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /sfx\.mine/);
  assert.match(game, /sfx\.jump/);
  assert.match(game, /sfx\.craft/);
  assert.match(game, /sfx\.buy/);
});

test('mobile 390px panel and touch mine ring are wired', () => {
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(css, /max-width:\s*390px/);
  assert.match(css, /\.vc-mine-ring/);
  assert.match(html, /id="mine-ring"/);
  assert.match(game, /mine-ring/);
});

test('cave biome is gated at rank 4 and stores grids separately', () => {
  assert.equal(VW.canEnterCave(3), false);
  assert.equal(VW.canEnterCave(4), true);
  const meadow = VW.createWorld(7);
  assert.equal(meadow.biome, 'meadow');
  assert.ok(VW.countKind(meadow, 'portal') >= 1);
  assert.equal(VW.countKind(meadow, 'crystal'), 6);
  const cave = VW.createWorld(7, 'cave');
  assert.equal(cave.biome, 'cave');
  assert.ok(VW.countKind(cave, 'portal') >= 1);
  assert.ok(VW.countKind(cave, 'crystal') >= 12);
  assert.ok(VW.countKind(cave, 'coal') > VW.countKind(meadow, 'coal'));
  assert.equal(VW.getCell(cave, 3, VW.surfaceOf(cave, 3) - 1) === 'wood', false);
  const a = VW.serialize(meadow, VW.emptyInv(), { x: 4, y: 6 });
  const b = VW.serialize(cave, VW.emptyInv(), { x: 6, y: 10 });
  assert.equal(a.biome, 'meadow');
  assert.equal(b.biome, 'cave');
  assert.notEqual(JSON.stringify(a.grid), JSON.stringify(b.grid));
  const back = VW.deserialize(b);
  assert.equal(back.world.biome, 'cave');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /worldSaves/);
  assert.match(game, /canEnterCave|tryUsePortal|enterBiome/);
});

test('cave lighting and portal findability help kids see the mine', () => {
  const meadow = VW.createWorld(7);
  const cave = VW.createWorld(7, 'cave');
  const portal = VW.findKind(meadow, 'portal');
  assert.ok(portal);
  assert.equal(VW.getCell(meadow, portal.x, portal.y), 'portal');
  assert.equal(VW.lightAt(meadow, 8, 10, 8, 10), 1);
  const far = VW.lightAt(cave, 40, 8, 6, 16);
  const near = VW.lightAt(cave, 6, 16, 6, 16);
  assert.ok(far < 0.3);
  assert.ok(near > 0.7);
  const torchAt = { x: 20, y: 12 };
  VW.setCell(cave, torchAt.x, torchAt.y, 'torch');
  assert.ok(VW.lightAt(cave, 20, 12, 6, 16) > VW.lightAt(cave, 40, 8, 6, 16));
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(html, /id="biome-label"/);
  assert.match(game, /biome-label/);
  assert.match(game, /lightAt|shadeCell/);
  assert.match(game, /矿洞开了|发光的洞口/);
});

test('iron pick line is cut from voxel-craft', () => {
  const world = fs.readFileSync(path.join(gameDir, 'data', 'world.js'), 'utf8');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.doesNotMatch(world, /iron_pick/);
  assert.doesNotMatch(world, /铁镐/);
  assert.doesNotMatch(game, /iron_pick|iron-pickaxe|铁镐/);
});

test('debug leftovers are gone from voxel-craft', () => {
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.doesNotMatch(game, /__vcDebug/);
  assert.doesNotMatch(game, /coord-label/);
  assert.doesNotMatch(html, /coord-label/);
  assert.doesNotMatch(game, /console\.(log|info)\(.*BOOT|console\.(log|info)\(.*IMG/);
});

test('grid crafting matches shaped and shapeless recipes like 2d-minecraft', () => {
  const VW2 = globalThis.VoxelCraftWorld;
  const id = (cells, size = 3) => { const r = VW2.matchCraftGrid(cells, size); return r ? r.id : null; };
  // 有形：T 形木镐
  assert.equal(id(['plank','plank','plank', null,'stick',null, null,'stick',null]), 'wood_pick');
  // 有形：T 形石镐
  assert.equal(id(['stone','stone','stone', null,'stick',null, null,'stick',null]), 'stone_pick');
  // 2×2 整块板 → 合成台；竖排两板 → 木棍
  assert.equal(VW2.matchCraftGrid(['plank','plank','plank','plank'], 2).id, 'table');
  assert.equal(VW2.matchCraftGrid(['plank', null, 'plank', null], 2).id, 'stick');
  // 2×2 摆不下 3×3 的镐
  assert.equal(VW2.matchCraftGrid(['plank','plank','plank','stick'], 2), null);
  // 无形：木头→4 板（任意位置）；混入别的材料不匹配
  assert.equal(VW2.matchCraftGrid(['wood',null,null, null,null,null], 3).id, 'plank');
  assert.equal(VW2.matchCraftGrid(['wood','stick',null, null,null,null], 3), null);
  // 火把：煤+棍 无形
  assert.equal(VW2.matchCraftGrid([null,'coal',null, null,'stick',null, null,null,null], 3).id, 'torch');
  // game.js 接线锚点
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(game, /matchCraftGrid/);
  assert.match(game, /openBag\(3\)/);
  assert.match(game, /autofillRecipe/);
  assert.match(game, /takeCraftOut/);
  assert.match(html, /craft-grid/);
  assert.match(html, /craft-out/);
});
