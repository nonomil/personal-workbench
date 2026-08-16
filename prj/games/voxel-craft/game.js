/**
 * voxel-craft · 装配层（T20260815-voxel-remake S2–S4）
 * 接口兼容（任务包 task.md §3）：
 * - GAME_ID 仍是 'voxel-adventure'，进度键 growth.worldGames.voxel-adventure 不变
 * - 发奖口径 quest-<id> / daily-<日期>-<key> 不变
 */
(function () {
    'use strict';

    const bridge = window.WorkbenchGameBridge;
    const sfx = window.WorkbenchGameSfx;
    const MAPS = window.VoxelCraftMaps;
    const ENEMIES = window.VoxelCraftEnemies;
    const VW = window.VoxelCraftWorld;
    const Q = window.VoxelQuests;
    const ENG = window.VoxelCraftEngine;
    const GAME_ID = 'voxel-adventure';
    const TILE = ENG.TILE;
    const VIEW_W = 960;
    const VIEW_H = 540;
    const LONG_PRESS_MS = 380;

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const ITEM_SLOTS = ['grass', 'dirt', 'wood', 'plank', 'stone', 'coal'];
    /** 小卖部：材料 × 阳光价（价格沿用旧工坊，参考 Nick's Workshop 设计） */
    const SHOP = [
        { kind: 'grass', cost: 8, desc: '铺路和种草' },
        { kind: 'dirt', cost: 6, desc: '最实惠的填充' },
        { kind: 'wood', cost: 10, desc: '搭房子的骨架' },
        { kind: 'plank', cost: 12, desc: '精致的建筑板' },
        { kind: 'stone', cost: 12, desc: '坚硬的地基' },
        { kind: 'coal', cost: 15, desc: '火把的燃料' },
        { kind: 'crystal', cost: 20, desc: '闪亮的收藏' },
        { kind: 'apple', cost: 10, desc: '补充饥饿' }
    ];
    const FOOD_HEAL = { apple: 2, bread: 4 };
    const TOOL_KINDS = ['wood_pick', 'stone_pick', 'wood_axe', 'stone_axe', 'wood_shovel', 'wood_sword'];
    const BLUEPRINT_COLORS = { w: 'rgba(122, 74, 34, .38)', p: 'rgba(196, 138, 74, .38)', s: 'rgba(141, 145, 152, .38)' };
    const SWATCH = {
        sand: '#e6d08a', leaf: '#2f9a3c', water: '#3f76e4', crystal: '#9b7cff',
        torch: '#ffcc66', stick: '#9a6b3f'
    };

    let playMods = { mode: 'easy', label: '简单', sunMult: 1 };
    let progress = null;
    let world = null;
    let images = {};
    let inventory = VW.emptyInv();
    let invSlots = VW.makeSlots();
    let bagPick = -1;
    let selectedSlot = 0;
    let tool = 'hand';
    let selectedKind = null;
    let placedCells = {};
    let session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
    let player = { x: 5 * TILE, y: 16 * TILE, w: 18, h: 54, vx: 0, vy: 0, onGround: false, facing: 1, inWater: false, hp: 5, maxHp: 5, food: 10, maxFood: 10, invincibleUntil: 0 };
    let camera = { x: 0, y: 0 };
    let groundAnchor = 0; // 垂直相机锚点：只在落地/大幅跌落时更新，跳跃时镜头不动
    let keys = {};
    let holds = { left: false, right: false, jump: false };
    let pointer = null;   // {down, cellX, cellY, since, placeMode}
    let mineAct = null;   // {cellX, cellY, kind, frames, need}
    let chips = [];
    let hover = null;
    let settledQuest = null;
    let enemies = [];
    let attackUntil = 0;
    let lastDamageAt = 0;
    let lastHudAt = 0;
    let enemyKills = 0;
    /* 格子合成（2d-minecraft 移植）：随身 2×2，点世界里的合成台开 3×3 */
    let craft = { size: 2, cells: Array(9).fill(null) };

    /* ---------- 进度与存档 ---------- */

    function defaultProgress() {
        return {
            questsDone: [], crystalsTotal: 0, buildTotal: 0, buildTotalByKind: {},
            unlockedTools: ['hand', 'wood_pick'], biome: 'meadow', mapId: 'meadow', enemiesDefeated: 0,
            worldSeed: 3, homeSnapshot: null, worldSave: null,
            worldSaves: { meadow: null, cave: null },
            placedCells: [],
            parentLock: false, rankRewardsClaimed: []
        };
    }

    function normalizeMapId(id) {
        return MAPS && typeof MAPS.normalize === 'function' ? MAPS.normalize(id) : (id === 'cave' ? 'cave' : 'meadow');
    }

    function mapInfo(id) {
        return MAPS && typeof MAPS.get === 'function' ? MAPS.get(id) : { id: normalizeMapId(id), title: '草原基地', unlockRank: 1 };
    }

    function loadProgress() {
        const stored = bridge.getProgress ? bridge.getProgress(GAME_ID) : null;
        progress = Object.assign(defaultProgress(), (stored && stored.progress) || stored || {});
        if (!Array.isArray(progress.questsDone)) progress.questsDone = [];
        // 旧横版存档兼容：clearedLevels 映射为前 N 个生涯任务（只读，一次性迁移到 questsDone）
        if (progress.questsDone.length === 0 && Array.isArray(progress.clearedLevels) && progress.clearedLevels.length > 0) {
            progress.questsDone = VW.legacyQuestsDone(progress.clearedLevels, Q.list || []);
        }
        if (!Array.isArray(progress.placedCells)) progress.placedCells = [];
        placedCells = {};
        progress.placedCells.forEach(function (key) { placedCells[key] = true; });
        if (!progress.worldSaves || typeof progress.worldSaves !== 'object') progress.worldSaves = {};
        if (!progress.worldSaves.meadow && progress.worldSave) progress.worldSaves.meadow = progress.worldSave;
        progress.mapId = normalizeMapId(progress.mapId || progress.biome || 'meadow');
        progress.biome = progress.mapId;
        const snap = progress.worldSaves[progress.mapId] || (progress.mapId === 'meadow' ? progress.worldSave : null);
        const saved = VW.deserialize(snap);
        const avgSurface = saved && saved.world.surface
            ? saved.world.surface.reduce(function (a, b) { return a + b; }, 0) / saved.world.surface.length
            : 0;
        const legacyTerrain = saved && saved.world.surface && progress.mapId === 'meadow' && avgSurface < 25;
        if (saved && !legacyTerrain && saved.world.cols === VW.COLS) {
            world = saved.world;
            world.biome = world.biome || progress.mapId;
            world.mapId = world.mapId || world.biome || progress.mapId;
            progress.mapId = normalizeMapId(world.mapId);
            progress.biome = progress.mapId;
            inventory = Object.assign(VW.emptyInv(), saved.inventory);
            invSlots = Array.isArray(saved.slots) ? saved.slots : VW.slotsFromCounts(inventory);
            player.x = saved.player.x * TILE;
            player.y = saved.player.y * TILE;
            player.vx = 0;
            player.vy = 0;
            groundAnchor = player.y;
        } else {
            if (legacyTerrain) {
                placedCells = {};
                toast('世界焕新：地面变薄啦');
            }
            newWorld(progress.worldSeed, progress.mapId);
        }
        // 存档校验：旧档位置可能嵌在方块里（卡死），重置到安全出生点
        if (ENG.rectHitsSolid(solidAt, player.x, player.y, player.w, player.h)) {
            placePlayerAtSpawn();
            toast('位置已修复，回到出生点');
        }
        if (!Array.isArray(progress.rankRewardsClaimed)) progress.rankRewardsClaimed = [];
        const backfill = VW.claimPendingRankRewards(inventory, progress.rankRewardsClaimed, rank());
        inventory = backfill.inventory;
        invSlots = VW.slotsFromCounts(inventory);
        progress.rankRewardsClaimed = backfill.claimed;
        enemyKills = Number(progress.enemiesDefeated) || 0;
        spawnEnemies();
    }

    function newWorld(seed, mapId) {
        progress.mapId = normalizeMapId(mapId || progress.mapId || progress.biome || 'meadow');
        progress.biome = progress.mapId;
        world = VW.createWorld(seed || 3, progress.mapId);
        placePlayerAtSpawn();
        placedCells = {};
        inventory = VW.emptyInv();
        inventory.wood_pick = 1; // 开局默认木镐（工具链 rank1-2）
        invSlots = VW.slotsFromCounts(inventory);
        spawnEnemies();
    }

    /** 站在出生列的地面上（脚贴地表，避开树干） */
    function placePlayerAtSpawn() {
        const spawn = VW.spawnCell(world);
        player.x = spawn.x * TILE + 3;
        player.y = spawn.surface * TILE - player.h;
        player.vx = 0;
        player.vy = 0;
        player.onGround = false;
        player.hp = player.maxHp;
        player.food = player.maxFood;
        player.invincibleUntil = 0;
        groundAnchor = player.y;
    }

    function persist() {
        progress.worldSeed = world.seed;
        progress.mapId = normalizeMapId((world && (world.mapId || world.biome)) || progress.mapId || 'meadow');
        progress.biome = progress.mapId;
        progress.enemiesDefeated = enemyKills;
        progress.placedCells = Object.keys(placedCells);
        if (!progress.worldSaves || typeof progress.worldSaves !== 'object') progress.worldSaves = {};
        const snap = VW.serialize(world, effectiveInventory(), {
            x: Math.round(player.x / TILE), y: Math.round(player.y / TILE)
        }, invSlots);
        progress.worldSaves[progress.mapId] = snap;
        if (progress.mapId === 'meadow') progress.worldSave = snap;
        if (bridge.saveProgress) bridge.saveProgress(GAME_ID, progress);
    }

    /** 存档口径：网格里摆着的材料也计入背包（刷新不丢） */
    function effectiveInventory() {
        let inv = inventory;
        craft.cells.forEach(function (c) {
            if (c) inv = VW.addToInventory(inv, c, 1);
        });
        return inv;
    }

    function returnCellsToInventory() {
        craft.cells.forEach(function (c) {
            if (c) gainItem(c, 1);
        });
        craft.cells = Array(9).fill(null);
    }

    function gainItem(kind, n) {
        inventory = VW.addToInventory(inventory, kind, n);
        invSlots = VW.addToSlots(invSlots, kind, n);
        if (TOOL_KINDS.indexOf(kind) !== -1 && progress.unlockedTools.indexOf(kind) === -1) {
            progress.unlockedTools.push(kind);
        }
    }

    function spendItem(kind, n) {
        const bag = VW.consumeFromInventory(inventory, kind, n);
        if (!bag.ok) return bag;
        inventory = bag.inventory;
        let left = n || 1;
        for (let i = 0; i < invSlots.length && left > 0; i += 1) {
            if (invSlots[i] && invSlots[i].kind === kind) {
                const take = Math.min(left, invSlots[i].n);
                const res = VW.takeFromSlot(invSlots, i, take);
                invSlots = res.slots;
                left -= take;
            }
        }
        return { ok: true, inventory: inventory };
    }

    function gridRecipeOf(id) {
        return VW.GRID_RECIPES.filter(function (g) { return g.id === id; })[0] || null;
    }

    /** 配方书点击：把材料按图案自动摆进网格（幼儿也能看到"怎么摆"） */
    function autofillRecipe(id) {
        returnCellsToInventory();
        const r = VW.RECIPES.filter(function (x) { return x.id === id; })[0];
        if (!r) return;
        const g = gridRecipeOf(id);
        let layout = [];
        if (g && g.shape) {
            if (g.shape[0] > craft.size) {
                toast('这个配方要放在合成台（3×3）旁边做');
                renderBag();
                return;
            }
            layout = g.cells.slice();
        } else if (g) {
            layout = g.cells.slice();
        } else {
            Object.keys(r.inputs).forEach(function (k) {
                for (let i = 0; i < r.inputs[k]; i += 1) layout.push(k);
            });
        }
        if (layout.length > craft.size * craft.size) { toast('格子不够摆'); renderBag(); return; }
        for (let i = 0; i < layout.length; i += 1) {
            const k = layout[i];
            if (!k) continue;
            if ((inventory[k] || 0) <= 0) {
                toast('材料不够：' + (VW.KIND_LABEL[k] || k));
                break;
            }
        }
        for (let i = 0; i < layout.length; i += 1) {
            const k = layout[i];
            if (!k || (inventory[k] || 0) <= 0) continue;
            const bag = spendItem(k, 1);
            if (bag.ok) {
                craft.cells[i] = k;
            }
        }
        persist();
        renderBag();
        renderHotbar();
    }

    /** 点输出格拿产物：消耗网格材料 */
    function takeCraftOut() {
        if (progress.parentLock) { toast('家长锁开着，先请家长解锁'); return; }
        const matched = VW.matchCraftGrid(craft.cells, craft.size);
        if (!matched) return;
        for (let i = 0; i < craft.size * craft.size; i += 1) craft.cells[i] = null;
        gainItem(matched.out.kind, matched.out.n);
        if (sfx && sfx.craft) sfx.craft();
        toast('做好了！点格子可以把 ' + (VW.KIND_LABEL[matched.out.kind] || matched.out.kind) + ' 挪到物品栏');
        persist();
        renderBag();
        renderHotbar();
        renderHud();
    }

    /* ---------- 段位与任务 ---------- */

    function rank() {
        return VW.minerRank(progress.questsDone, Q.ranks);
    }

    function rankTitle(r) {
        const row = (Q.ranks || []).filter(function (x) { return x.rank === r; })[0];
        return row ? row.title : '新手矿工';
    }

    function visibleQuests() {
        const r = rank();
        return (Q.list || []).filter(function (q) { return (q.rank || 1) <= r; });
    }

    function currentQuest() {
        const list = visibleQuests();
        const career = list.filter(function (q) { return progress.questsDone.indexOf(q.id) === -1; });
        if (career.length > 0) return career[0];
        const daily = Q.dailyForDate ? Q.dailyForDate(localDateStr()) : null;
        if (daily && !isDailyDone(daily)) return daily;
        return null;
    }

    function localDateStr() {
        const d = new Date();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
    }

    function isDailyDone(daily) {
        return progress.questsDone.indexOf('daily-' + localDateStr() + '-' + daily.key) !== -1;
    }

    function statsNow() {
        let blocksAlive = 0;
        for (const k of Object.keys(placedCells)) {
            const p = k.split(',');
            if (VW.getCell(world, Number(p[0]), Number(p[1])) !== 'air') blocksAlive += 1;
        }
        return {
            placedThis: session.placedThis,
            placedAnyThis: session.placedAnyThis,
            collectedThis: session.collectedThis,
            buildTotal: progress.buildTotal,
            buildTotalByKind: progress.buildTotalByKind,
            crystalsTotal: progress.crystalsTotal,
            blocksAlive: blocksAlive,
            world: world
        };
    }

    function enemyTier() {
        return Math.max(1, Math.min(3, Math.ceil(rank() / 2)));
    }

    function spawnEnemies() {
        enemies = [];
        if (!world || !ENEMIES || typeof ENEMIES.getPool !== 'function') return;
        const pool = ENEMIES.getPool(normalizeMapId(world.mapId || world.biome), enemyTier());
        const count = Math.min(4, Math.max(2, 1 + enemyTier()));
        const spawn = VW.spawnCell(world);
        for (let i = 0; i < count; i += 1) {
            for (let attempt = 0; attempt < world.cols; attempt += 1) {
                // 首波落在出生点前方的可见范围，避免孩子只看到“敌人 2”却找不到目标。
                const x = Math.min(world.cols - 4, spawn.x + 8 + i * 5 + (attempt % 3));
                if (Math.abs(x - spawn.x) < 6) continue;
                const enemy = ENEMIES.create(pool[(i + attempt) % pool.length], x * TILE, 0);
                const surface = VW.surfaceOf(world, x);
                enemy.y = enemy.behavior === 'flyer'
                    ? Math.max(2 * TILE, surface * TILE - enemy.h - (2 + (i % 2)) * TILE)
                    : surface * TILE - enemy.h;
                if (enemy.behavior === 'flyer' || !ENG.rectHitsSolid(solidAt, enemy.x, enemy.y, enemy.w, enemy.h)) {
                    enemies.push(enemy);
                    break;
                }
            }
        }
    }

    function attackDamage() {
        if ((inventory.wood_sword || 0) > 0 || tool === 'wood_sword') return 3;
        if (tool === 'stone_pick') return 2;
        return 1;
    }

    function attack() {
        const now = Date.now();
        attackUntil = now + 180;
        let hits = 0;
        let defeated = 0;
        enemies.forEach(function (enemy) {
            const result = ENG.attackEnemy(enemy, player, attackDamage());
            if (!result.ok) return;
            hits += 1;
            if (result.defeated) {
                defeated += 1;
                enemyKills += 1;
                if (bridge.awardSunlight) {
                    bridge.awardSunlight({
                        gameId: GAME_ID,
                        reason: '击败' + enemy.title,
                        eventKey: 'enemy-' + normalizeMapId(world.mapId || world.biome) + '-' + enemyKills,
                        amount: 2
                    });
                }
            }
        });
        enemies = enemies.filter(function (enemy) { return !enemy.remove; });
        if (hits) {
            if (sfx && sfx.hit) sfx.hit();
            toast(defeated ? '命中！击败 ' + defeated + ' 个敌人' : '命中！再来一下');
            persist();
            renderHud();
        }
    }

    function tickEnemies(now) {
        if (!world || !enemies.length) return;
        enemies = enemies.map(function (enemy) {
            return ENG.updateEnemy(enemy, player, solidAt, 1);
        }).filter(function (enemy) { return !enemy.remove; });
        if (now < player.invincibleUntil) return;
        for (let i = 0; i < enemies.length; i += 1) {
            const enemy = enemies[i];
            const damage = ENG.enemyDamage(enemy, player, now);
            if (!damage) continue;
            player.hp = Math.max(0, player.hp - damage);
            player.invincibleUntil = now + 900;
            enemy.hitReadyAt = now + 1100;
            lastDamageAt = now;
            player.x += enemy.x < player.x ? 16 : -16;
            toast(enemy.title + '碰到你了，退开一点');
            if (player.hp <= 0) {
                placePlayerAtSpawn();
                toast('先休息一下，回到出生点啦');
            }
            break;
        }
    }

    function enterMap(id) {
        const next = normalizeMapId(id);
        const info = mapInfo(next);
        if (MAPS && typeof MAPS.isUnlocked === 'function' && !MAPS.isUnlocked(next, rank())) {
            toast('完成更多任务后解锁：' + info.title);
            return false;
        }
        persist();
        progress.mapId = next;
        progress.biome = next;
        placedCells = {};
        const snap = progress.worldSaves && progress.worldSaves[next];
        const saved = VW.deserialize(snap);
        let restored = false;
        if (saved && saved.world && saved.world.cols === VW.COLS) {
            world = saved.world;
            world.mapId = world.mapId || next;
            world.biome = world.biome || next;
            inventory = Object.assign(VW.emptyInv(), saved.inventory);
            invSlots = Array.isArray(saved.slots) ? saved.slots : VW.slotsFromCounts(inventory);
            player.x = saved.player.x * TILE;
            player.y = saved.player.y * TILE;
            player.vx = 0;
            player.vy = 0;
            player.onGround = false;
            player.hp = player.maxHp;
            player.invincibleUntil = 0;
            groundAnchor = player.y;
            restored = true;
        } else {
            world = VW.createWorld(progress.worldSeed || 3, next);
            placePlayerAtSpawn();
        }
        if (restored && ENG.rectHitsSolid(solidAt, player.x, player.y, player.w, player.h)) {
            placePlayerAtSpawn();
        }
        spawnEnemies();
        const layer = document.getElementById('map-layer');
        if (layer) layer.classList.add('is-hidden');
        persist();
        renderMap();
        renderHotbar();
        renderHud();
        toast('进入 ' + info.title + ' · ' + info.subtitle);
        return true;
    }

    function renderMap() {
        const grid = document.getElementById('map-grid');
        if (!grid || !MAPS) return;
        const current = normalizeMapId(world && (world.mapId || world.biome));
        const r = rank();
        grid.innerHTML = MAPS.list.map(function (map) {
            const locked = !MAPS.isUnlocked(map.id, r);
            const pool = ENEMIES && ENEMIES.getPool ? ENEMIES.getPool(map.id, enemyTier()) : [];
            return '<button type="button" class="vc-map-card ' + (locked ? 'is-locked ' : '') + (map.id === current ? 'is-current' : '') + '" data-map-id="' + map.id + '" ' + (locked ? 'disabled' : '') + '>' +
                '<i>' + (locked ? '🔒' : (map.id === current ? '📍' : '▶')) + '</i>' +
                '<strong>' + map.title + '</strong><small>' + map.subtitle + (locked ? '<br>段位 ' + map.unlockRank + ' 解锁' : '') + '</small>' +
                '<span class="vc-map-enemies">敌人：' + pool.map(function (id) { return (ENEMIES.get(id) || {}).title || id; }).join(' · ') + '</span></button>';
        }).join('');
        const copy = document.getElementById('map-copy');
        if (copy) copy.textContent = '当前地图：' + (mapInfo(current).title || '草原基地') + ' · 地图会分别保存建造进度。';
    }

    function toggleMap() {
        const layer = document.getElementById('map-layer');
        if (!layer) return;
        if (layer.classList.contains('is-hidden')) {
            renderMap();
            layer.classList.remove('is-hidden');
        } else {
            layer.classList.add('is-hidden');
        }
    }

    function scaledSun(base) {
        return Math.max(1, Math.round(Number(base || 0) * (playMods.sunMult || 1)));
    }

    function checkQuests() {
        const quest = currentQuest();
        if (!quest) return;
        if (!VW.isQuestComplete(quest, statsNow())) return;
        const isDaily = !!quest.daily || !!quest.key;
        const eventKey = isDaily
            ? 'daily-' + localDateStr() + '-' + quest.key
            : 'quest-' + quest.id;
        const doneId = isDaily ? eventKey : quest.id;
        if (progress.questsDone.indexOf(doneId) !== -1) return;
        progress.questsDone.push(doneId);
        const amount = scaledSun(quest.reward || 10);
        let awarded = amount;
        if (bridge.awardSunlight) {
            const res = bridge.awardSunlight({
                gameId: GAME_ID,
                reason: (quest.title || '任务完成'),
                eventKey: eventKey,
                amount: amount
            });
            awarded = res && res.awarded === false ? 0 : (res && res.amount) || amount;
        }
        session.placedThis = {};
        session.collectedThis = {};
        session.placedAnyThis = 0;
        const prevRank = VW.minerRank(progress.questsDone.slice(0, -1), Q.ranks);
        persist();
        showSettle(quest, awarded);
        if (sfx && sfx.celebrate) sfx.celebrate();
        const nextRank = rank();
        if (nextRank > prevRank) setTimeout(function () { showRankUp(nextRank); }, 900);
    }

    function nextGoalLine() {
        const next = currentQuest();
        if (next) return '下一个目标：' + next.title + ' · ' + (next.desc || '');
        return '所有任务都完成啦，继续自由建造吧！';
    }

    /* ---------- 挖与放 ---------- */

    function solidAt(tx, ty) {
        return VW.isSolid(VW.getCell(world, tx, ty));
    }

    function kindAt(tx, ty) {
        return VW.getCell(world, tx, ty);
    }

    function toolIdInHand() {
        const owned = progress.unlockedTools;
        if (owned.indexOf(tool) === -1) tool = 'hand';
        return tool;
    }

    function tryUsePortal() {
        const from = (world && world.biome) || progress.biome || 'meadow';
        if (from === 'meadow') {
            if (!VW.canEnterCave(rank())) {
                toast('矿工 4 段才能进矿洞');
                return false;
            }
            enterBiome('cave');
            return true;
        }
        enterBiome('meadow');
        return true;
    }

    function enterBiome(next) {
        return enterMap(next);
    }

    function tryStartMine(cell) {
        const kind = VW.getCell(world, cell.x, cell.y);
        if (kind === 'air' || kind === 'water' || kind === 'portal') return false;
        if (!ENG.inReach(player, cell.x, cell.y)) {
            toast('走近一点再挖');
            return false;
        }
        if (!VW.canBreak(kind, toolIdInHand(), rank())) {
            toast(VW.breakReason(kind, toolIdInHand(), rank()));
            return false;
        }
        const need = VW.breakTime(kind, toolIdInHand());
        if (!mineAct || mineAct.cellX !== cell.x || mineAct.cellY !== cell.y) {
            mineAct = { cellX: cell.x, cellY: cell.y, kind: kind, frames: 0, need: need };
            if (sfx && sfx.mine) sfx.mine();
        }
        player.facing = (cell.x + 0.5) * TILE < player.x + player.w / 2 ? -1 : 1;
        return true;
    }

    function doBreakMine() {
        const cx = mineAct.cellX;
        const cy = mineAct.cellY;
        const dug = VW.breakBlock(world, cx, cy, toolIdInHand(), rank());
        mineAct = null;
        if (!dug.ok) {
            if (dug.reason) toast(dug.reason);
            return;
        }
        gainItem(dug.kind, 1);
        session.collectedThis[dug.kind] = (session.collectedThis[dug.kind] || 0) + 1;
        if (dug.kind === 'crystal') progress.crystalsTotal = (progress.crystalsTotal || 0) + 1;
        delete placedCells[placedKey(cx, cy)];
        ENG.spawnChips(chips, cx, cy, dug.kind);
        if (sfx && sfx.mine) sfx.mine();
        persist();
        renderHotbar();
        renderHud();
        checkQuests();
    }

    function placedKey(x, y) { return x + ',' + y; }

    /** 当前任务若是蓝图，返回目标格在图案内的代号（w/p/s），否则 null（锚定地表上空） */
    function inActiveBlueprint(cell) {
        const quest = currentQuest();
        if (!quest || quest.type !== 'blueprint') return null;
        const spec = VW.BLUEPRINTS[quest.blueprint];
        const anchor = VW.blueprintAnchor(world, quest.blueprint);
        if (!spec || !anchor) return null;
        const row = String(spec.pattern[cell.y - anchor.y] || '');
        const ch = row.charAt(cell.x - anchor.x);
        return (ch && ch !== '.') ? ch : null;
    }

    function wallet() {
        const w = bridge.getWallet ? bridge.getWallet() : { sunlight: 0 };
        return Math.max(0, Number(w.sunlight) || 0);
    }

    function tryPlace(cell) {
        if (!selectedKind) { toast('先在热键栏选一个方块'); return; }
        if ((inventory[selectedKind] || 0) <= 0) { toast('背包里没有' + (VW.KIND_LABEL[selectedKind] || '材料')); return; }
        if (!ENG.inReach(player, cell.x, cell.y)) { toast('走近一点再放'); return; }
        const res = VW.placeBlock(world, cell.x, cell.y, selectedKind, { free: inActiveBlueprint(cell) });
        if (!res.ok) { toast(res.reason); return; }
        const bag = spendItem(selectedKind, 1);
        if (!bag.ok) return;
        placedCells[placedKey(cell.x, cell.y)] = true;
        session.placedThis[selectedKind] = (session.placedThis[selectedKind] || 0) + 1;
        session.placedAnyThis += 1;
        progress.buildTotal = (progress.buildTotal || 0) + 1;
        progress.buildTotalByKind[selectedKind] = (progress.buildTotalByKind[selectedKind] || 0) + 1;
        if (sfx && sfx.place) sfx.place();
        persist();
        renderHotbar();
        renderHud();
        checkQuests();
    }

    /* ---------- HUD 渲染 ---------- */

    function iconMarkup(id) {
        const item = VW.itemIcon ? VW.itemIcon(id) : '';
        if (item) return '<img src="./assets/mc/' + item + '" alt="">';
        const tex = ENG.MC_TEXTURES[id];
        if (tex) return '<img src="./assets/mc/' + tex + '" alt="">';
        if (SWATCH[id]) return '<span class="vc-swatch" style="background:' + SWATCH[id] + '"></span>';
        return '';
    }

    function renderHotbar() {
        const bar = document.getElementById('hotbar');
        if (!bar) return;
        let html = '';
        for (let i = 0; i < VW.HOTBAR_COUNT; i += 1) {
            const row = invSlots[i];
            const on = selectedSlot === i;
            html += '<button type="button" class="vc-slot' + (on ? ' is-on' : '') + (row ? '' : ' is-empty') + '" data-slot="' + i + '">' +
                (row ? iconMarkup(row.kind) : '') +
                '<kbd>' + (i + 1) + '</kbd>' +
                (row && row.n > 1 ? '<b>' + row.n + '</b>' : '') +
                (row ? '<small>' + (VW.KIND_LABEL[row.kind] || row.kind) + '</small>' : '') +
                '</button>';
        }
        bar.innerHTML = html;
        renderSurvivalHud();
    }

    function renderSurvivalHud() {
        const hearts = document.getElementById('hearts');
        const food = document.getElementById('food-bar');
        const bagHearts = document.getElementById('bag-hearts');
        const bagFood = document.getElementById('bag-food');
        const hp = Math.max(0, player.hp);
        const foodN = Math.max(0, player.food);
        const heartHtml = Array.from({ length: player.maxHp }, function (_, i) {
            return '<img src="./assets/ui/heart.png" alt="" class="' + (i < hp ? 'is-on' : 'is-off') + '">';
        }).join('');
        const foodHtml = Array.from({ length: player.maxFood }, function (_, i) {
            return '<img src="./assets/ui/food.png" alt="" class="' + (i < foodN ? 'is-on' : 'is-off') + '">';
        }).join('');
        if (hearts) hearts.innerHTML = heartHtml;
        if (food) food.innerHTML = foodHtml;
        if (bagHearts) bagHearts.innerHTML = heartHtml;
        if (bagFood) bagFood.innerHTML = foodHtml;
        const hpEl = document.getElementById('hp-label');
        if (hpEl) hpEl.textContent = hp + '/' + player.maxHp;
    }

    function ownedTools() {
        const all = [
            { id: 'hand', label: '空手' },
            { id: 'wood_pick', label: '木镐' },
            { id: 'stone_pick', label: '石镐' }
        ];
        return all.filter(function (t) {
            return progress.unlockedTools.indexOf(t.id) !== -1;
        });
    }

    function renderHud() {
        const quest = currentQuest();
        const r = rank();
        document.getElementById('rank-label').textContent = r + ' · ' + rankTitle(r);
        document.getElementById('quest-done').textContent = progress.questsDone.filter(function (id) { return id.indexOf('daily-') !== 0; }).length;
        document.getElementById('quest-total').textContent = (Q.list || []).length;
        const sunEl = document.getElementById('sun-label');
        if (sunEl) sunEl.textContent = wallet();
        const biomeEl = document.getElementById('biome-label');
        if (biomeEl) biomeEl.textContent = mapInfo(world && (world.mapId || world.biome)).title || '草原基地';
        const hpEl = document.getElementById('hp-label');
        if (hpEl) hpEl.textContent = Math.max(0, player.hp) + '/' + player.maxHp;
        const enemyEl = document.getElementById('enemy-label');
        if (enemyEl) enemyEl.textContent = enemies.filter(function (enemy) { return !enemy.remove; }).length;
        const title = document.getElementById('quest-title');
        const desc = document.getElementById('quest-desc');
        const fill = document.getElementById('quest-bar-fill');
        if (quest) {
            const value = VW.questValue(quest, statsNow());
            title.textContent = quest.title;
            desc.textContent = (quest.desc || '') + ' · ' + value + '/' + quest.need;
            fill.style.width = Math.min(100, Math.round((value / (quest.need || 1)) * 100)) + '%';
        } else {
            title.textContent = '自由建造时间';
            desc.textContent = '今天的任务都完成啦';
            fill.style.width = '100%';
        }
    }

    let bagTab = 'craft';

    function miniPattern(recipeId) {
        const g = gridRecipeOf(recipeId);
        const r = VW.RECIPES.filter(function (x) { return x.id === recipeId; })[0];
        if (!r) return '';
        let cells = null;
        let w = 0;
        if (g && g.shape) {
            cells = g.cells;
            w = g.shape[0];
        } else if (g) {
            cells = g.cells;
            w = cells.length;
        } else {
            cells = [];
            Object.keys(r.inputs).forEach(function (k) {
                for (let i = 0; i < r.inputs[k]; i += 1) cells.push(k);
            });
            w = cells.length;
        }
        let html = '<span class="vc-mini-pattern">';
        cells.forEach(function (k, i) {
            if (w && i > 0 && i % w === 0) html += '<i style="width:0;border:0"></i>';
            html += '<i>' + (k ? iconMarkup(k).replace('<img ', '<img width="14" height="14" ') : '') + '</i>';
        });
        return html + '</span>';
    }

    function renderBag() {
        const locked = !!progress.parentLock;
        const sun = wallet();
        const sunEl = document.getElementById('bag-sun');
        if (sunEl) sunEl.textContent = '☀ ' + sun;
        const lockBtn = document.getElementById('parent-lock-btn');
        if (lockBtn) {
            lockBtn.textContent = locked ? '🔒' : '🔓';
            lockBtn.classList.toggle('is-locked', locked);
        }
        // 标签页
        document.querySelectorAll('#bag-tabs [data-tab]').forEach(function (btn) {
            btn.classList.toggle('is-on', btn.dataset.tab === bagTab);
        });
        ['craft', 'book', 'smelt', 'shop'].forEach(function (t) {
            const body = document.getElementById('tab-' + t);
            if (body) body.classList.toggle('is-hidden', t !== bagTab);
        });

        // 合成格 + 输出
        const craftGrid = document.getElementById('craft-grid');
        if (craftGrid) {
            craftGrid.classList.remove('size2', 'size3');
            craftGrid.classList.add('size' + craft.size);
            let ch = '';
            for (let i = 0; i < craft.size * craft.size; i += 1) {
                const k = craft.cells[i];
                ch += '<button type="button" class="vc-mc-slot" data-cell="' + i + '" title="' +
                    (k ? (VW.KIND_LABEL[k] || k) + '（点一下拿回）' : '点背包材料放入') + '">' +
                    (k ? iconMarkup(k) : '') + '</button>';
            }
            craftGrid.innerHTML = ch;
            const sizeLabel = document.getElementById('craft-size-label');
            if (sizeLabel) sizeLabel.textContent = craft.size === 3 ? '3×3' : '2×2';
            const matched = VW.matchCraftGrid(craft.cells, craft.size);
            const outBtn = document.getElementById('craft-out');
            if (outBtn) {
                outBtn.innerHTML = matched ? iconMarkup(matched.out.kind) + '<b>×' + matched.out.n + '</b>' : '';
                outBtn.disabled = !matched || locked;
            }
        }

        const grid = document.getElementById('bag-grid');
        if (grid) {
            let html = '';
            for (let i = 0; i < VW.INV_SLOT_COUNT; i += 1) {
                const row = invSlots[i];
                const on = bagPick === i;
                html += '<button type="button" class="vc-mc-slot' + (row ? '' : ' is-empty') + (on ? ' is-picked' : '') + '" data-slot="' + i + '"' +
                    ' title="' + (row ? (VW.KIND_LABEL[row.kind] || row.kind) + ' ×' + row.n : '空格子，点一下放下') + '">' +
                    (row ? iconMarkup(row.kind) : '') + (row && row.n > 1 ? '<b>' + row.n + '</b>' : '') + '</button>';
            }
            grid.innerHTML = html;
        }
        renderSurvivalHud();

        // 配方书：迷你图案 + 摆一摆
        const recipes = document.getElementById('recipe-grid');
        if (recipes) {
            recipes.innerHTML = VW.RECIPES.map(function (r) {
                const outKind = Object.keys(r.outputs)[0];
                const g = gridRecipeOf(r.id);
                const tooBig = g && g.shape && g.shape[0] > craft.size;
                const can = !tooBig && Object.keys(r.inputs).every(function (k) { return (inventory[k] || 0) >= r.inputs[k]; });
                return '<div class="vc-mc-row">' + miniPattern(r.id) +
                    '<span class="vc-mc-slot">' + iconMarkup(outKind) + '</span>' +
                    '<div class="vc-row-copy"><strong>' + r.name + '</strong><small>' + lineOf(r.inputs) + ' → ' + lineOf(r.outputs) + '</small></div>' +
                    '<button type="button" class="vc-mc-buy" data-fill="' + r.id + '"' + (can ? '' : ' disabled') + '>' +
                    (tooBig ? '要合成台' : '摆一摆') + '</button></div>';
            }).join('');
        }

        const smelts = document.getElementById('smelt-grid');
        if (smelts) {
            smelts.innerHTML = VW.SMELT_RECIPES.map(function (r) {
                const can = !locked && Object.keys(r.inputs).every(function (k) { return (inventory[k] || 0) >= r.inputs[k]; });
                return '<div class="vc-mc-row">' + iconMarkup(Object.keys(r.inputs)[0]).replace('<img ', '<img width="26" height="26" ') +
                    '<div class="vc-row-copy"><strong>烧' + (VW.KIND_LABEL[r.id] || r.id) + '</strong><small>' + lineOf(r.inputs) + ' → ' + lineOf(r.outputs) + '</small></div>' +
                    '<button type="button" class="vc-mc-buy" data-smelt="' + r.id + '"' + (can ? '' : ' disabled') + '>烧制</button></div>';
            }).join('');
        }

        const shop = document.getElementById('shop-grid');
        if (shop) {
            shop.innerHTML = SHOP.map(function (item) {
                const can = !locked && sun >= item.cost;
                return '<div class="vc-mc-row">' + iconMarkup(item.kind) +
                    '<div class="vc-row-copy"><strong>' + (VW.KIND_LABEL[item.kind] || item.kind) + '</strong><small>' + item.desc + ' · 库存 ×' + (inventory[item.kind] || 0) + '</small></div>' +
                    '<button type="button" class="vc-mc-buy" data-buy="' + item.kind + '" data-cost="' + item.cost + '"' + (can ? '' : ' disabled') + '>☀' + item.cost + '</button></div>';
            }).join('');
        }
    }

    function tryEat(kind) {
        const heal = FOOD_HEAL[kind];
        if (!heal) return false;
        if (player.food >= player.maxFood) {
            toast('现在不饿');
            return false;
        }
        const bag = spendItem(kind, 1);
        if (!bag.ok) return false;
        player.food = Math.min(player.maxFood, player.food + heal);
        if (kind === 'bread') player.hp = Math.min(player.maxHp, player.hp + 1);
        toast('吃了一口' + (VW.KIND_LABEL[kind] || kind));
        persist();
        renderHotbar();
        renderBag();
        renderHud();
        return true;
    }

    function buyItem(kind, cost) {
        if (progress.parentLock) { toast('家长锁开着，先请家长解锁'); return; }
        if (!bridge.spendSunlight) { toast('账本还没准备好'); return; }
        const pay = bridge.spendSunlight(cost);
        if (!pay || pay.ok === false) {
            toast((pay && pay.reason) || '阳光不够，去做任务赚阳光吧');
            renderBag();
            return;
        }
        gainItem(kind, 1);
        persist();
        renderHotbar();
        renderBag();
        renderHud();
        toast('买到了 1 个' + (VW.KIND_LABEL[kind] || kind));
        if (sfx && sfx.buy) sfx.buy();
    }

    function lineOf(map) {
        return Object.keys(map).map(function (k) {
            return (VW.KIND_LABEL[k] || k) + '×' + map[k];
        }).join(' + ');
    }

    /* ---------- 弹层 ---------- */

    function toast(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
    }

    function showSettle(quest, amount) {
        settledQuest = quest;
        document.getElementById('settle-title').textContent = quest.title || '任务完成';
        document.getElementById('settle-gain').textContent = '阳光 +' + amount;
        document.getElementById('settle-progress').textContent = '已点亮 ' + progress.questsDone.filter(function (id) { return id.indexOf('daily-') !== 0; }).length + ' / ' + (Q.list || []).length + ' 个生涯任务';
        document.getElementById('settle-next').textContent = nextGoalLine();
        document.getElementById('settle-layer').classList.remove('is-hidden');
    }

    function showRankUp(r) {
        document.getElementById('rankup-img').src = './assets/mc/items/stone-pickaxe.png';
        document.getElementById('rankup-title').textContent = rankTitle(r);
        const ability = r >= 5
            ? '石镐可以挖晶体矿脉了！'
            : (r >= 4
                ? '矿洞开了！往最深处挖，找发光的洞口'
                : (r >= 3 ? '获得了石镐：可以挖石头和煤矿了！' : '继续完成任务，解锁更深的矿层'));
        document.getElementById('rankup-sub').textContent = '段位 ' + r + ' · ' + ability;
        if (r >= 3 && progress.unlockedTools.indexOf('stone_pick') === -1) {
            progress.unlockedTools.push('stone_pick');
            gainItem('stone_pick', 1);
        }
        const grant = VW.claimRankReward(inventory, progress.rankRewardsClaimed || [], r);
        if (grant.ok) {
            inventory = grant.inventory;
            invSlots = VW.slotsFromCounts(inventory);
            progress.rankRewardsClaimed = grant.claimed;
            const names = grant.pack.filter(function (item) { return item.kind !== 'blueprint'; })
                .map(function (item) { return (VW.KIND_LABEL[item.kind] || item.kind) + '×' + item.n; }).join('、');
            if (names) toast('奖励箱：' + names);
        }
        persist();
        document.getElementById('rankup-layer').classList.remove('is-hidden');
        if (sfx && sfx.rankUp) sfx.rankUp();
        renderHotbar();
    }

    function say(text) {
        const el = document.getElementById('companion-say');
        if (el) el.textContent = text;
    }

    /* ---------- 主循环 ---------- */

    function tick(now) {
        const input = {
            left: holds.left || keys['a'] || keys['arrowleft'],
            right: holds.right || keys['d'] || keys['arrowright'],
            jump: holds.jump || keys[' '] || keys['w'] || keys['arrowup'],
            run: keys['shift']
        };
        const wasGround = player.onGround;
        const result = ENG.updatePlayer(player, input, solidAt, kindAt);
        if (input.jump && wasGround && !player.onGround && sfx && sfx.jump) sfx.jump();
        if (result === 'void') {
            placePlayerAtSpawn();
            toast('掉进虚空啦，回到出生点');
        }
        // 按住持续挖
        if (pointer && pointer.down && !pointer.placeMode) {
            tryStartMine({ x: pointer.cellX, y: pointer.cellY });
            // 触屏长按：合成台开 3×3 面板；空气格放置当前选中的方块
            if (!pointer.placed && pointer.startKind === 'table' &&
                Date.now() - pointer.since >= LONG_PRESS_MS) {
                pointer.placed = true;
                pointer = null;
                openBag(3);
            } else if (!pointer.placed && pointer.startKind === 'air' &&
                Date.now() - pointer.since >= LONG_PRESS_MS) {
                pointer.placed = true;
                tryPlace({ x: pointer.cellX, y: pointer.cellY });
            }
        }
        if (mineAct) {
            mineAct.frames += 1;
            if (mineAct.frames >= mineAct.need) doBreakMine();
        }
        tickEnemies(now);
        if (now - lastHudAt > 120) {
            lastHudAt = now;
            renderHud();
        }
        // 相机：横向跟随；纵向只以落地高度为目标、每帧 8% 缓动追踪——
        // 跳跃期间目标不变（镜头静止），地形起伏变成缓慢滑动而不是一格格跳变
        camera.x = Math.round(player.x + player.w / 2 - VIEW_W / 2);
        if (player.onGround) groundAnchor = player.y;
        const targetCamY = Math.round(groundAnchor + player.h / 2 - VIEW_H / 2);
        camera.y += Math.round((targetCamY - camera.y) * 0.08);
        ENG.clampCamera(camera, world, VIEW_W, VIEW_H);
        maybePortalHint();
    }

    function updateMineRing() {
        const el = document.getElementById('mine-ring');
        if (!el) return;
        if (!mineAct) {
            el.hidden = true;
            return;
        }
        const view = el.parentElement;
        const viewRect = view ? view.getBoundingClientRect() : { left: 0, top: 0 };
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / VIEW_W;
        const scaleY = canvasRect.height / VIEW_H;
        const sx = canvasRect.left - viewRect.left + (mineAct.cellX * TILE - camera.x + TILE / 2) * scaleX;
        const sy = canvasRect.top - viewRect.top + (mineAct.cellY * TILE - camera.y + TILE / 2) * scaleY;
        el.hidden = false;
        el.style.left = sx + 'px';
        el.style.top = sy + 'px';
        el.style.setProperty('--p', String(Math.round(100 * mineAct.frames / mineAct.need)));
    }

    let portalHintAt = 0;
    function maybePortalHint() {
        if (!world || world.biome === 'cave' || !VW.canEnterCave(rank())) return;
        const portal = VW.findKind(world, 'portal');
        if (!portal) return;
        const px = Math.floor((player.x + player.w / 2) / TILE);
        const py = Math.floor((player.y + player.h / 2) / TILE);
        if (Math.abs(px - portal.x) + Math.abs(py - portal.y) > 8) return;
        if (Date.now() - portalHintAt < 8000) return;
        portalHintAt = Date.now();
        toast('洞口就在附近，点发光的方块进去');
    }

    function shadeCell(ctx, x, y, light) {
        if (light >= 0.98) return;
        ctx.fillStyle = 'rgba(4, 8, 18,' + (1 - light) + ')';
        ctx.fillRect(x, y, TILE, TILE);
    }

    function drawAttackFx(now) {
        if (now >= attackUntil) return;
        const x = player.facing < 0 ? player.x - TILE : player.x + player.w;
        const y = player.y + 12;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 225, 130, .95)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x + (player.facing < 0 ? TILE : 0), y + 12, 24, player.facing < 0 ? 1.7 : -1.7, player.facing < 0 ? 4.5 : 1.5);
        ctx.stroke();
        ctx.restore();
    }

    function draw(now) {
        const t = Number(now) || 0;
        ENG.drawSky(ctx, images, VIEW_W, VIEW_H, camera, world.rows * TILE, world.mapId || world.biome);
        updateMineRing();
        const startCol = Math.max(0, Math.floor(camera.x / TILE));
        const endCol = Math.min(world.cols - 1, Math.ceil((camera.x + VIEW_W) / TILE));
        const startRow = Math.max(0, Math.floor(camera.y / TILE));
        const endRow = Math.min(world.rows - 1, Math.ceil((camera.y + VIEW_H) / TILE));
        const px = Math.floor((player.x + player.w / 2) / TILE);
        const py = Math.floor((player.y + player.h / 2) / TILE);
        for (let y = startRow; y <= endRow; y += 1) {
            for (let x = startCol; x <= endCol; x += 1) {
                const kind = world.grid[y][x];
                const dx = x * TILE - camera.x;
                const dy = y * TILE - camera.y;
                if (kind && kind !== 'air') {
                    ENG.drawBlock(ctx, images, kind, dx, dy);
                    if (kind === 'portal') {
                        const pulse = 0.28 + 0.22 * (0.5 + 0.5 * Math.sin(t / 180));
                        ctx.fillStyle = 'rgba(168, 130, 255,' + pulse + ')';
                        ctx.fillRect(dx, dy, TILE, TILE);
                    }
                }
                if (world.biome === 'cave') shadeCell(ctx, dx, dy, VW.lightAt(world, x, y, px, py));
            }
        }
        if (ENG.drawDecorations) ENG.drawDecorations(ctx, images, world.decorations, camera);
        if (mineAct) {
            ENG.drawCrack(ctx, images, mineAct.frames / mineAct.need,
                mineAct.cellX * TILE - camera.x, mineAct.cellY * TILE - camera.y);
        }
        // 蓝图任务：把目标轮廓半透明画在世界上（锚定地表上空，Nick 风蓝图底图）
        const quest = currentQuest();
        if (quest && quest.type === 'blueprint' && VW.BLUEPRINTS[quest.blueprint]) {
            const spec = VW.BLUEPRINTS[quest.blueprint];
            const anchor = VW.blueprintAnchor(world, quest.blueprint);
            ctx.save();
            ctx.lineWidth = 2;
            spec.pattern.forEach(function (line, row) {
                String(line).split('').forEach(function (ch, col) {
                    if (ch === '.') return;
                    const x = (anchor.x + col) * TILE - camera.x;
                    const y = (anchor.y + row) * TILE - camera.y;
                    ctx.fillStyle = BLUEPRINT_COLORS[ch] || 'rgba(255,255,255,.25)';
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = 'rgba(255, 255, 255, .5)';
                    ctx.setLineDash([4, 3]);
                    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
                });
            });
            ctx.restore();
        }
        if (hover) {
            const reach = ENG.inReach(player, hover.x, hover.y);
            ctx.strokeStyle = reach ? (selectedKind ? '#ffd98a' : '#ffffff') : 'rgba(255,255,255,.35)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hover.x * TILE - camera.x + 1, hover.y * TILE - camera.y + 1, TILE - 2, TILE - 2);
        }
        enemies.forEach(function (enemy) { ENG.drawEnemy(ctx, images, enemy, camera, t); });
        ENG.drawPlayer(ctx, images, player, camera, !!mineAct, t);
        drawAttackFx(t);
        ENG.drawChips(ctx, chips, camera);
    }

    /** 主循环：rAF 优先，被挂起（嵌入式 webview/后台标签）时降级为 setInterval 驱动 */
    let lastFrameAt = 0;
    function pump() {
        lastFrameAt = Date.now();
        frame(lastFrameAt);
    }
    function startLoop() {
        requestAnimationFrame(function rafTick() {
            requestAnimationFrame(rafTick);
            pump();
        });
        setInterval(function () {
            if (Date.now() - lastFrameAt > 500) pump();
        }, 33);
    }

    function frame(now) {
        tick(now);
        draw(now);
    }

    /* ---------- 输入 ---------- */

    function onPointerDown(e) {
        e.preventDefault();
        const cell = ENG.screenToCell(canvas, camera, e.clientX, e.clientY);
        const startKind = VW.getCell(world, cell.x, cell.y);
        const placeMode = e.button === 2;
        if (startKind === 'portal') {
            tryUsePortal();
            pointer = null;
            return;
        }
        // 右键合成台 → 打开 3×3 合成（2d-minecraft 的 CLICKABLES 手法）
        if (placeMode && startKind === 'table') {
            openBag(3);
            pointer = null;
            return;
        }
        pointer = {
            down: true, cellX: cell.x, cellY: cell.y, since: Date.now(),
            placeMode: placeMode, startKind: startKind, placed: false
        };
        if (placeMode) tryPlace(cell);
    }

    function onPointerMove(e) {
        const cell = ENG.screenToCell(canvas, camera, e.clientX, e.clientY);
        hover = cell;
        if (pointer && pointer.down) {
            pointer.cellX = cell.x;
            pointer.cellY = cell.y;
            if (pointer.placeMode) tryPlace(cell);
        }
    }

    function onPointerUp() {
        pointer = null;
    }

    function onContextMenu(e) { e.preventDefault(); }

    function setHold(name, on) { holds[name] = on; }

    function bind() {
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('contextmenu', onContextMenu);

        document.addEventListener('keydown', function (e) {
            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
            keys[k] = true;
            if (k >= '1' && k <= '9') selectSlot(Number(k) - 1);
            if (k === 'f' && hover) {
                const hoverKind = VW.getCell(world, hover.x, hover.y);
                if (hoverKind === 'portal') tryUsePortal();
                else if (hoverKind === 'table') openBag(3);
                else tryPlace({ x: hover.x, y: hover.y });
            }
            if (k === 'k' || k === 'j') attack();
            if (k === 'm') toggleMap();
            if (k === 'e' || k === 'escape') toggleBag();
        });
        document.addEventListener('keyup', function (e) {
            keys[e.key.toLowerCase()] = false;
        });

        document.querySelectorAll('#move-pad button').forEach(function (btn) {
            const name = btn.dataset.hold;
            btn.addEventListener('pointerdown', function (e) { e.preventDefault(); setHold(name, true); });
            btn.addEventListener('pointerup', function () { setHold(name, false); });
            btn.addEventListener('pointerleave', function () { setHold(name, false); });
        });

        document.getElementById('hotbar').addEventListener('click', function (e) {
            const slot = e.target.closest('.vc-slot');
            if (!slot) return;
            selectSlot(Number(slot.dataset.slot));
        });

        document.getElementById('map-btn').addEventListener('click', toggleMap);
        document.getElementById('map-close-btn').addEventListener('click', toggleMap);
        document.getElementById('attack-btn').addEventListener('click', attack);
        document.getElementById('map-grid').addEventListener('click', function (e) {
            const card = e.target.closest('[data-map-id]');
            if (card && !card.disabled) enterMap(card.dataset.mapId);
        });
        document.getElementById('map-layer').addEventListener('click', function (e) {
            if (e.target === e.currentTarget) toggleMap();
        });
        document.getElementById('bag-btn').addEventListener('click', toggleBag);
        document.getElementById('bag-close-btn').addEventListener('click', toggleBag);
        document.getElementById('bag-tabs').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-tab]');
            if (!btn) return;
            bagTab = btn.dataset.tab;
            renderBag();
        });

        document.getElementById('bag-layer').addEventListener('click', function (e) {
            const fill = e.target.closest('[data-fill]');
            const cellBtn = e.target.closest('[data-cell]');
            const outBtn = e.target.closest('#craft-out');
            const bagCell = e.target.closest('#bag-grid [data-slot]');
            const smelt = e.target.closest('[data-smelt]');
            const buy = e.target.closest('[data-buy]');
            const lockBtn = e.target.closest('#parent-lock-btn');
            if (fill) {
                autofillRecipe(fill.dataset.fill);
                return;
            } else if (cellBtn) {
                const idx = Number(cellBtn.dataset.cell) || 0;
                if (craft.cells[idx]) {
                    gainItem(craft.cells[idx], 1);
                    craft.cells[idx] = null;
                    persist();
                    renderBag();
                    renderHotbar();
                } else if (bagPick >= 0 && invSlots[bagPick]) {
                    const kind = invSlots[bagPick].kind;
                    const bag = spendItem(kind, 1);
                    if (bag.ok) {
                        craft.cells[idx] = kind;
                        if (!invSlots[bagPick]) bagPick = -1;
                        persist();
                        renderBag();
                        renderHotbar();
                    }
                }
                return;
            } else if (outBtn) {
                takeCraftOut();
                return;
            } else if (bagCell) {
                const idx = Number(bagCell.dataset.slot);
                if (bagPick < 0) {
                    if (!invSlots[idx]) return;
                    if (FOOD_HEAL[invSlots[idx].kind] && player.food < player.maxFood && e.detail === 2) {
                        tryEat(invSlots[idx].kind);
                    } else {
                        bagPick = idx;
                    }
                } else {
                    invSlots = VW.moveSlot(invSlots, bagPick, idx);
                    inventory = VW.countsFromSlots(invSlots);
                    bagPick = -1;
                    persist();
                }
                renderBag();
                renderHotbar();
                return;
            } else if (smelt) {
                if (progress.parentLock) { toast('家长锁开着，先请家长解锁'); return; }
                const res = VW.smelt(inventory, smelt.dataset.smelt);
                if (res.ok) {
                    inventory = res.inventory;
                    invSlots = VW.slotsFromCounts(inventory);
                    toast('烧好了！');
                } else toast(res.reason);
            } else if (buy) {
                buyItem(buy.dataset.buy, Number(buy.dataset.cost) || 0);
                return;
            } else if (lockBtn) {
                progress.parentLock = !progress.parentLock;
                persist();
                toast(progress.parentLock ? '已上锁：购买、合成、烧制都停了' : '已解锁');
            }
            persist();
            renderBag();
            renderHotbar();
        });

        document.getElementById('home-shot-btn').addEventListener('click', function () {
            progress.homeSnapshot = VW.makeHomeSnapshot(world, localDateStr());
            persist();
            toast('家园照片已存进成长档案');
        });

        document.getElementById('reset-btn').addEventListener('click', function () {
            if (!window.confirm('重开一个新世界？（任务和进度都保留）')) return;
            newWorld(Math.floor(Math.random() * 99999) + 1);
            persist();
            renderHotbar();
            renderHud();
            toast('新世界！');
        });

        document.getElementById('settle-close-btn').addEventListener('click', function () {
            document.getElementById('settle-layer').classList.add('is-hidden');
            say(nextGoalLine());
        });
        document.getElementById('rankup-close-btn').addEventListener('click', function () {
            document.getElementById('rankup-layer').classList.add('is-hidden');
        });

        const fullBtn = document.getElementById('fullscreen-btn');
        fullBtn.addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });

        const back = document.getElementById('back-link');
        if (back && bridge.backHref) back.href = bridge.backHref('voxel-adventure');
    }

    function selectSlot(i) {
        const idx = Number(i);
        if (idx < 0 || idx >= VW.HOTBAR_COUNT) return;
        selectedSlot = idx;
        const row = invSlots[idx];
        if (!row) {
            tool = 'hand';
            selectedKind = null;
        } else if (TOOL_KINDS.indexOf(row.kind) !== -1) {
            tool = row.kind;
            selectedKind = null;
            if (progress.unlockedTools.indexOf(row.kind) === -1) progress.unlockedTools.push(row.kind);
        } else if (FOOD_HEAL[row.kind]) {
            tool = 'hand';
            selectedKind = null;
            tryEat(row.kind);
        } else {
            tool = 'hand';
            selectedKind = row.kind;
        }
        renderHotbar();
    }

    function openBag(size) {
        const layer = document.getElementById('bag-layer');
        if (size) craft.size = size;
        if (layer.classList.contains('is-hidden')) {
            renderBag();
            layer.classList.remove('is-hidden');
        } else {
            renderBag();
        }
    }

    function toggleBag() {
        const layer = document.getElementById('bag-layer');
        if (layer.classList.contains('is-hidden')) {
            openBag(2);
        } else {
            returnCellsToInventory();
            persist();
            layer.classList.add('is-hidden');
        }
    }

    /* ---------- 启动 ---------- */

    /** 从工作台进入时显示同主题侧栏，导航链接指向工作台各页 */
    function setupSidebar() {
        const params = new URLSearchParams(location.search || '');
        const from = params.get('from');
        if (!from) return;
        document.body.classList.add('vc-with-side');
        const base = decodeURIComponent(from).split('#')[0];
        const items = [
            { ico: '🏠', label: '首页', hash: '#overview' },
            { ico: '⛏️', label: '方块世界', hash: null },
            { ico: '📚', label: '学习专区', hash: '#courses' },
            { ico: '📖', label: '错题本', hash: '#mistakes' },
            { ico: '🎁', label: '奖励商城', hash: '#rewards' },
            { ico: '🤝', label: '家长互动', hash: '#family' },
            { ico: '⚙️', label: '设置', hash: '#settings' }
        ];
        const nav = document.getElementById('vc-side-nav');
        if (!nav) return;
        nav.innerHTML = items.map(function (it) {
            if (!it.hash) {
                return '<a class="is-active" href="javascript:void(0)"><span class="vc-nav-ico">' + it.ico + '</span>' +
                    it.label + '<kbd>当前</kbd></a>';
            }
            return '<a href="' + base + it.hash + '"><span class="vc-nav-ico">' + it.ico + '</span>' + it.label + '</a>';
        }).join('');
    }

    function boot() {
        window.__vcErr = '';
        window.onerror = function (msg) {
            window.__vcErr = String(msg).slice(0, 300);
            const t = document.getElementById('toast');
            if (t) {
                t.textContent = '出错了：' + window.__vcErr;
                t.classList.add('is-on');
            }
            return false;
        };
        if (bridge.getPlayMods) playMods = bridge.getPlayMods();
        loadProgress();
        if (bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
        setupSidebar();
        bind();
        renderHotbar();
        renderMap();
        renderHud();
        say('欢迎来到方块世界！先挖点草，铺一条小路吧。');
        ENG.loadAllImages().then(function (store) {
            images = store;
            startLoop();
        });
        window.addEventListener('beforeunload', persist);
        setInterval(persist, 15000);
    }

    boot();
}());
