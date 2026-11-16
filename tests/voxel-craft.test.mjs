import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

await import('../prj/games/voxel-craft/data/world.js');
await import('../prj/games/voxel-craft/data/quests.js');
await import('../prj/games/voxel-craft/engine.js');
const VW = globalThis.VoxelCraftWorld;
const Q = globalThis.VoxelQuests;
const ENG = globalThis.VoxelCraftEngine;

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
  assert.ok(spawn.x >= 10, 'close camera needs spawn away from the left wall');
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
  assert.match(html, /class="vc-back"/);
  assert.match(html, />地图</);
  assert.match(html, />背包</);
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  assert.match(css, /\.vc-back[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.vc-tool[\s\S]*min-height:\s*44px/);
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
  const surfaceY = VW.surfaceOf(meadow, 8);
  assert.ok(VW.lightAt(meadow, 8, surfaceY, 8, surfaceY - 1) >= 0.98);
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

test('wood pick and other tools have item icons, not empty slots', () => {
  const VW2 = globalThis.VoxelCraftWorld;
  assert.equal(VW2.itemIcon('wood_pick'), 'items/wooden-pickaxe.png');
  assert.equal(VW2.itemIcon('stone_pick'), 'items/stone-pickaxe.png');
  assert.equal(VW2.itemIcon('wood_axe'), 'items/wooden-axe.png');
  assert.equal(VW2.itemIcon('wood_sword'), 'items/wooden-sword.png');
  assert.equal(VW2.itemIcon('stick'), 'items/stick.png');
  assert.equal(VW2.itemIcon('bread'), 'items/bread.png');
  assert.equal(VW2.itemIcon('chest'), 'items/chest.png');
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'mc', 'items', 'wooden-pickaxe.png')), true);
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'mc', 'items', 'bread.png')), true);
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'mc', 'items', 'chest.png')), true);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /itemIcon\(|ITEM_ICONS|VW\.itemIcon/);
  assert.doesNotMatch(game, /function iconMarkup\(id\) \{\s*const tex = ENG\.MC_TEXTURES\[id\];/);
});

test('crafted result can move into a 36-slot inventory', () => {
  const VW2 = globalThis.VoxelCraftWorld;
  assert.equal(VW2.INV_SLOT_COUNT, 36);
  assert.equal(VW2.HOTBAR_COUNT, 9);
  const slots = VW2.makeSlots();
  assert.equal(slots.length, 36);
  const filled = VW2.addToSlots(slots, 'wood_pick', 1);
  assert.equal(filled[0].kind, 'wood_pick');
  assert.equal(filled[0].n, 1);
  const moved = VW2.moveSlot(filled, 0, 10);
  assert.equal(moved[0], null);
  assert.equal(moved[10].kind, 'wood_pick');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /addToSlots|moveSlot|invSlots/);
  assert.match(game, /takeCraftOut/);
});

test('more craftables and survival HUD hearts plus food icons', () => {
  const VW2 = globalThis.VoxelCraftWorld;
  assert.equal(VW2.matchCraftGrid(['plank','plank','plank','plank',null,'plank','plank','plank','plank'], 3).id, 'chest');
  assert.equal(VW2.matchCraftGrid(['plank',null,'plank',null,'plank',null,null,null,null], 3).id, 'bowl');
  assert.equal(VW2.matchCraftGrid(['wheat','wheat','wheat',null,null,null,null,null,null], 3).id, 'bread');
  assert.ok(VW2.RECIPES.some((r) => r.id === 'chest'));
  assert.ok(VW2.RECIPES.some((r) => r.id === 'bread'));
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(html, /id="survival-hud"|vc-survival-hud/);
  assert.match(html, /id="hearts"|vc-hearts/);
  assert.match(html, /id="food-bar"|vc-food/);
  assert.match(css, /vc-hearts|vc-food/);
  assert.match(game, /player\.food|renderSurvivalHud/);
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'ui', 'heart.png')), true);
  assert.equal(fs.existsSync(path.join(gameDir, 'assets', 'ui', 'food.png')), true);
});

test('surface skylight darkens buried blocks like FlatMC occlusion', () => {
  const world = VW.createWorld(7);
  const col = 11;
  for (let y = 0; y < VW.ROWS - 1; y += 1) VW.setCell(world, col, y, 'air');
  VW.setCell(world, col, VW.ROWS - 2, 'grass');
  const open = VW.lightAt(world, col, VW.ROWS - 2, col, VW.ROWS - 3);
  assert.ok(open >= 0.98, 'open sky grass should stay bright, got ' + open);

  const buryCol = 14;
  for (let y = 0; y <= 8; y += 1) VW.setCell(world, buryCol, y, y === 8 ? 'stone' : 'dirt');
  const buried = VW.lightAt(world, buryCol, 8, buryCol, 3);
  assert.ok(buried < 0.72, 'buried stone should darken, got ' + buried);
  assert.ok(buried > 0.22, 'buried stone should still be visible, got ' + buried);
  assert.ok(buried < open, 'buried light should be less than open sky');

  VW.setCell(world, buryCol + 1, 8, 'torch');
  const lit = VW.lightAt(world, buryCol, 8, buryCol, 3);
  assert.ok(lit > buried, 'torch should lift buried light');
});

test('play view is full-bleed overlay HUD like FlatMC', () => {
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(html, /vc-immersive/);
  assert.match(css, /\.vc-hotbar-row[\s\S]{0,240}position:\s*absolute/);
  assert.match(css, /#world-canvas[\s\S]{0,320}height:\s*100%/);
  assert.doesNotMatch(css, /max-height:\s*min\(\s*64vh/);
  assert.match(css, /\.vc-hearts img[\s\S]{0,120}width:\s*2[24]px/);
  assert.match(css, /\.vc-hotbar .vc-slot small[\s\S]{0,80}display:\s*none/);
  assert.match(game, /function fitView/);
  assert.doesNotMatch(game, /if \(world\.biome === 'cave'\) shadeCell/);
  assert.match(game, /shadeCell\(ctx, dx, dy, VW\.lightAt/);
});

test('broken blocks hop out as magnet pickups', () => {
  assert.equal(typeof ENG.spawnDrop, 'function');
  assert.equal(typeof ENG.updateDrops, 'function');
  const drops = [];
  ENG.spawnDrop(drops, 2, 4, 'dirt', { x: 60, y: 40, vx: 0, vy: 0 });
  assert.equal(drops.length, 1);
  assert.equal(drops[0].kind, 'dirt');
  const player = { x: 0, y: 10, w: 18, h: 54 };
  const picked = [];
  for (let i = 0; i < 180; i += 1) {
    Array.prototype.push.apply(picked, ENG.updateDrops(drops, player, function () { return false; }));
    if (picked.length) break;
  }
  assert.ok(picked.some(function (row) { return row.kind === 'dirt'; }), 'nearby drop should magnet into the miner');
  assert.equal(drops.length, 0);
});

test('far drops stay on the ground until the miner walks over', () => {
  const drops = [];
  ENG.spawnDrop(drops, 0, 0, 'stone', { x: 20, y: 20, vx: 0, vy: 0 });
  const player = { x: 400, y: 400, w: 18, h: 54 };
  const picked = ENG.updateDrops(drops, player, function () { return false; });
  assert.equal(picked.length, 0);
  assert.equal(drops.length, 1);
  assert.equal(drops[0].kind, 'stone');
});

test('pick-block copies world cells except air bedrock portal water', () => {
  assert.equal(VW.pickableKind('grass'), 'grass');
  assert.equal(VW.pickableKind('torch'), 'torch');
  assert.equal(VW.pickableKind('stone'), 'stone');
  assert.equal(VW.pickableKind('air'), null);
  assert.equal(VW.pickableKind('bedrock'), null);
  assert.equal(VW.pickableKind('portal'), null);
  assert.equal(VW.pickableKind('water'), null);
});

test('game wires drop magnet and creative pick-block, no death screen', () => {
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(game, /spawnDrop/);
  assert.match(game, /updateDrops/);
  assert.match(game, /drawDrops/);
  assert.match(game, /tryPickBlock|pickableKind/);
  assert.match(game, /button === 1|e\.button === 1/);
  assert.match(game, /dblclick/);
  assert.doesNotMatch(game, /gainItem\(dug\.kind, 1\)/);
  assert.doesNotMatch(game, /Respawn|You Died|gameOver/);
  assert.match(html, /中键|双击/);
});

test('hero skin is steve spritesheet or AB stickman', () => {
  assert.equal(ENG.heroSkinOf('stick'), 'stick');
  assert.equal(ENG.heroSkinOf('steve'), 'steve');
  assert.equal(ENG.heroSkinOf(''), 'steve');
  const fills = [];
  const ctx = {
    save: function () {}, restore: function () {}, translate: function () {}, scale: function () {},
    fillRect: function (x, y, w, h) { fills.push([x, y, w, h]); },
    drawImage: function () { fills.push('image'); },
    imageSmoothingEnabled: true
  };
  const player = { x: 40, y: 80, w: 18, h: 54, vx: 2, vy: 0, onGround: true, facing: 1, inWater: false, skin: 'stick' };
  ENG.drawPlayer(ctx, {}, player, { x: 0, y: 0 }, false, 800);
  assert.ok(fills.length >= 6, 'stickman draws head/torso/limbs');
  assert.equal(fills.filter(function (row) { return row === 'image'; }).length, 0);
  const images = [];
  const ctx2 = {
    save: function () {}, restore: function () {}, translate: function () {}, scale: function () {},
    fillRect: function () {},
    drawImage: function () { images.push(1); },
    imageSmoothingEnabled: true
  };
  player.skin = 'steve';
  ENG.drawPlayer(ctx2, { hero_steve: { width: 192, height: 168 } }, player, { x: 0, y: 0 }, false, 800);
  assert.ok(images.length >= 1, 'steve skin uses the spritesheet');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(html, /id="skin-btn"/);
  assert.match(html, /火柴人|方块人|史蒂夫/);
  assert.match(game, /heroSkin|toggleSkin|skin-btn/);
});

test('play camera zooms to a FlatMC close side-view', () => {
  assert.equal(typeof ENG.zoomFor, 'function');
  assert.equal(typeof ENG.viewSize, 'function');
  assert.equal(ENG.zoomFor(1920), 3);
  assert.equal(ENG.zoomFor(1280), 2);
  assert.equal(ENG.zoomFor(390), 1);
  const hd = ENG.viewSize(1920, 1080);
  assert.equal(hd.zoom, 3);
  assert.equal(hd.w, 640);
  assert.equal(hd.h, 360);
  assert.ok(hd.w / ENG.TILE <= 22, 'desktop should show about 20 tiles, not the whole map');
  const phone = ENG.viewSize(390, 844);
  assert.equal(phone.zoom, 1);
  assert.equal(phone.w, 390);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /ENG\.viewSize/);
});

test('target box and cracks snap to the block cell', () => {
  assert.equal(typeof ENG.drawSelectBox, 'function');
  const fills = [];
  const ctx = {
    fillRect: function (x, y, w, h) { fills.push([x, y, w, h]); },
    fillStyle: ''
  };
  ENG.drawSelectBox(ctx, 10.4, 20.6, '#ffffff');
  assert.ok(fills.length >= 4, 'four edges of the cell');
  fills.forEach(function (row) {
    assert.equal(row[0], Math.round(row[0]));
    assert.equal(row[1], Math.round(row[1]));
  });
  assert.equal(Math.min.apply(null, fills.map(function (row) { return row[0]; })), 10);
  assert.equal(Math.min.apply(null, fills.map(function (row) { return row[1]; })), 21);
  const draws = [];
  const ctx2 = { drawImage: function (img, x, y, w, h) { draws.push([x, y, w, h]); } };
  ENG.drawCrack(ctx2, { destroy0: { width: 16, height: 16 } }, 0.1, 3.2, 5.8);
  assert.equal(draws.length, 1);
  assert.deepEqual(draws[0], [3, 6, ENG.TILE, ENG.TILE]);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  assert.match(game, /drawSelectBox/);
  assert.match(game, /TILE \* scaleX/);
  assert.match(css, /\.vc-mine-ring[\s\S]{0,220}width:\s*56px/);
});

test('first path quest is playable from the hotbar', () => {
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  assert.match(game, /inventory\.grass\s*=\s*8/);
  assert.match(game, /selectKindInHotbar/);
  assert.match(game, /tryPlaceAtPointer|faceAirCell/);
  assert.match(game, /row && row\.n/);
  assert.match(html, /点空地铺|对着空地|点方块贴着放/);
  assert.doesNotMatch(css, /\.vc-immersive \.vc-hint \{\s*display:\s*none/);
});

test('holding a block places against the clicked face', () => {
  const kindAt = function (x, y) {
    if (x === 5 && y === 10) return 'grass';
    return 'air';
  };
  assert.equal(typeof ENG.faceAirCell, 'function');
  assert.deepEqual(ENG.faceAirCell({ x: 5, y: 10 }, 16, 2, kindAt), { x: 5, y: 9 });
  assert.deepEqual(ENG.faceAirCell({ x: 5, y: 10 }, 30, 16, kindAt), { x: 6, y: 10 });
  const hit = ENG.screenToHit({
    width: 640, height: 360,
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 640, height: 360 }; }
  }, { x: 0, y: 0 }, 5 * ENG.TILE + 16, 10 * ENG.TILE + 2);
  assert.equal(hit.x, 5);
  assert.equal(hit.y, 10);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /tryPlaceAtPointer|faceAirCell|placeTarget/);
});

test('place ghost sits on the air cell that will receive the block', () => {
  const kindAt = function (x, y) {
    if (x === 5 && y === 10) return 'grass';
    return 'air';
  };
  assert.equal(typeof ENG.placeTarget, 'function');
  assert.equal(typeof ENG.drawPlaceGhost, 'function');
  assert.deepEqual(ENG.placeTarget({ x: 5, y: 10, lx: 16, ly: 2 }, kindAt), { x: 5, y: 9 });
  assert.deepEqual(ENG.placeTarget({ x: 5, y: 9, lx: 16, ly: 16 }, kindAt), { x: 5, y: 9 });
  const ops = [];
  const ctx = {
    save: function () { ops.push('save'); },
    restore: function () { ops.push('restore'); },
    drawImage: function () { ops.push('img'); },
    fillRect: function () { ops.push('rect'); },
    globalAlpha: 1,
    imageSmoothingEnabled: true
  };
  ENG.drawPlaceGhost(ctx, { tex_grass: { width: 16, height: 16 } }, 'grass', 10, 20);
  assert.ok(ops.indexOf('save') >= 0);
  assert.ok(ops.indexOf('img') >= 0 || ops.indexOf('rect') >= 0);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /drawPlaceGhost|placeTarget/);
  assert.match(game, /aimHit/);
});

test('held item chooses place, mine or attack and is drawn in hand', () => {
  assert.equal(ENG.heldUse('grass'), 'place');
  assert.equal(ENG.heldUse('wood_pick'), 'mine');
  assert.equal(ENG.heldUse('wood_axe'), 'mine');
  assert.equal(ENG.heldUse('wood_sword'), 'attack');
  assert.equal(ENG.heldUse(''), 'hand');
  assert.equal(ENG.heldDamage('wood_sword'), 3);
  assert.equal(ENG.heldDamage('wood_pick'), 2);
  assert.equal(ENG.heldDamage(''), 1);
  const ops = [];
  const ctx = {
    save: function () { ops.push('save'); },
    restore: function () { ops.push('restore'); },
    translate: function () {},
    scale: function () {},
    drawImage: function () { ops.push('img'); },
    fillRect: function () { ops.push('rect'); },
    globalAlpha: 1,
    imageSmoothingEnabled: true
  };
  ENG.drawHeldItem(ctx, { tex_grass: { width: 16, height: 16 } }, 'grass', 0, 0, 0);
  assert.ok(ops.indexOf('img') >= 0 || ops.indexOf('rect') >= 0);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(game, /heldUse|player\.held/);
  assert.match(game, /inventory\.wood_sword\s*=\s*1/);
  assert.match(html, /拿剑|点敌人/);
});

test('sword hits the slime standing next to the sprite and aimed clicks reach', () => {
  const player = { x: 524.6, y: 810.84, w: 18, h: 54, facing: 1 };
  const slime = { x: 576.2, y: 842.96, w: 24, h: 22, hp: 2, remove: false };
  const near = ENG.attackEnemy(slime, player, 1);
  assert.equal(near.ok, true, 'melee should cover the visible neighbor slime');
  assert.equal(slime.hp, 1);
  const far = { x: player.x + 3.2 * ENG.TILE, y: player.y + 20, w: 24, h: 22, hp: 3, remove: false };
  const miss = ENG.attackEnemy(far, player, 1);
  assert.equal(miss.ok, false);
  const aimed = ENG.attackEnemy(far, player, 1, { aimed: true });
  assert.equal(aimed.ok, true);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /\{ aimed:/);
});

test('place target skips the cell the miner is standing in', () => {
  const kindAt = function (x, y) {
    if (x === 18) return 'air';
    if (y >= 27) return 'grass';
    return 'air';
  };
  const blockedAt = function (x, y) { return x === 17 && y === 26; };
  const air = ENG.faceAirCell({ x: 17, y: 27 }, 16, 8, kindAt, blockedAt);
  assert.ok(air);
  assert.notEqual(air.y, 26);
  const ghost = ENG.placeTarget({ x: 17, y: 27, lx: 16, ly: 8 }, kindAt, blockedAt);
  assert.ok(ghost);
  assert.notEqual(ghost.x === 17 && ghost.y === 26, true);
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /blockedAt|cellBlocked|rectsOverlap\(player/);
});

test('clicking the grass at your feet places the next path tile in front', () => {
  const TILE = ENG.TILE;
  const kindAt = function (x, y) { return y >= 27 ? 'grass' : 'air'; };
  const blockedAt = function (x, y) { return x === 16 && (y === 25 || y === 26); };
  const air = ENG.faceAirCell({ x: 16, y: 27 }, 20, 8, kindAt, blockedAt);
  assert.deepEqual(air, { x: 17, y: 26 });
  const player = { x: 16 * TILE + 3, y: 27 * TILE - 54, w: 18, h: 54, facing: 1 };
  assert.equal(typeof ENG.footPlaceCell, 'function');
  assert.deepEqual(ENG.footPlaceCell(player, kindAt, blockedAt), { x: 17, y: 26 });
  const left = Object.assign({}, player, { facing: -1 });
  assert.deepEqual(ENG.footPlaceCell(left, kindAt, blockedAt), { x: 15, y: 26 });
  const after = function (x, y) {
    if (x === 17 && y === 26) return 'grass';
    return y >= 27 ? 'grass' : 'air';
  };
  assert.deepEqual(ENG.footPlaceCell(player, after, blockedAt), { x: 18, y: 26 });
  let filled = { 17: true };
  const walk = function (x, y) {
    if (y === 26 && filled[x]) return 'grass';
    return y >= 27 ? 'grass' : 'air';
  };
  for (let n = 18; n <= 21; n += 1) {
    assert.deepEqual(ENG.footPlaceCell(player, walk, blockedAt), { x: n, y: 26 });
    filled[n] = true;
  }
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  assert.match(game, /footPlaceCell/);
});

test('leaf blocks are tinted green over the grayscale texture', () => {
  const ops = [];
  const ctx = {
    save: function () { ops.push('save'); },
    restore: function () { ops.push('restore'); },
    drawImage: function () { ops.push('img'); },
    fillRect: function () { ops.push('rect'); },
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: true
  };
  ENG.drawBlock(ctx, { tex_leaf: { width: 16, height: 16 } }, 'leaf', 0, 0);
  assert.ok(ops.indexOf('img') >= 0);
  const engine = fs.readFileSync(path.join(gameDir, 'engine.js'), 'utf8');
  assert.match(engine, /LEAF_TINT|multiply/);
  assert.match(engine, /#3|#4|#2f9a3c|#48b03c|#3fae3a|#3d9e34/);
});

test('attack button lights up only when a sword is held', () => {
  const css = fs.readFileSync(path.join(gameDir, 'game.css'), 'utf8');
  const game = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  assert.match(html, /id="attack-btn"/);
  assert.match(css, /vc-attack-btn\.is-on/);
  assert.match(game, /syncAttackBtn|attack-btn['"]\)[\s\S]{0,180}is-on/);
  assert.match(game, /heldUse\(heldKind\(\)\) === 'attack'/);
});
