/**
 * 方块世界 · 网格挖放（Paper Minecraft / DS-Scratch-我的世界.md）
 * 工具递进链：空手 → 木镐 → 石镐；合成配方驱动解锁。
 */
(function (global) {
    'use strict';

    const COLS = 40;
    const ROWS = 18;
    const MAX_HP = 20;
    const BUMP_HP = 1;
    const KINDS = ['air', 'grass', 'dirt', 'wood', 'leaf', 'plank', 'stone', 'sand', 'water', 'coal', 'crystal', 'bedrock'];
    const TOOLS = {
        hand: { label: '空手', level: 0, mine: ['grass', 'dirt', 'sand', 'wood', 'leaf', 'plank', 'water'] },
        wood_pick: { label: '木镐', level: 1, mine: ['grass', 'dirt', 'sand', 'wood', 'leaf', 'plank', 'water', 'stone', 'coal'] },
        stone_pick: { label: '石镐', level: 2, mine: ['grass', 'dirt', 'sand', 'wood', 'leaf', 'plank', 'water', 'stone', 'coal', 'crystal'] },
        iron_pick: { label: '铁镐', level: 3, mine: ['all'] }
    };
    /** @deprecated 兼容旧测试名 */
    const TOOL_BREAKS = {
        hand: TOOLS.hand.mine,
        wood_pick: TOOLS.wood_pick.mine,
        stone_pick: TOOLS.stone_pick.mine,
        iron_pick: ['all'],
        axe: ['wood', 'leaf', 'plank'],
        pick: TOOLS.stone_pick.mine
    };
    const RECIPES = [
        { id: 'plank', name: '橡木板', nameEn: 'Oak Plank', inputs: { wood: 1 }, outputs: { plank: 4 } },
        { id: 'wood', name: '橡木', nameEn: 'Oak', inputs: { plank: 4 }, outputs: { wood: 1 } },
        { id: 'grass', name: '草方块', nameEn: 'Grass Block', inputs: { dirt: 2 }, outputs: { grass: 1 } },
        { id: 'stick', name: '木棍', nameEn: 'Stick', inputs: { plank: 2 }, outputs: { stick: 4 } },
        { id: 'wood_pick', name: '木镐', nameEn: 'Wood Pickaxe', inputs: { plank: 3, stick: 2 }, outputs: { wood_pick: 1 } },
        { id: 'stone_pick', name: '石镐', nameEn: 'Stone Pickaxe', inputs: { stone: 3, stick: 2 }, outputs: { stone_pick: 1 } }
    ];

    function emptyInv() {
        return {
            grass: 0, dirt: 0, wood: 0, leaf: 0, plank: 0, stone: 0, sand: 0, water: 0,
            coal: 0, crystal: 0, stick: 0, wood_pick: 0, stone_pick: 0
        };
    }

    function fillIsland(grid, x0, x1, grassY) {
        for (let x = x0; x <= x1; x += 1) {
            if (x < 0 || x >= COLS) continue;
            if (grassY >= 0 && grassY < ROWS) grid[grassY][x] = 'grass';
            for (let y = grassY + 1; y <= grassY + 2 && y < ROWS - 1; y += 1) grid[y][x] = 'dirt';
            for (let y = grassY + 3; y < ROWS - 1; y += 1) grid[y][x] = 'stone';
            grid[ROWS - 1][x] = 'bedrock';
        }
    }

    function plantTree(grid, x, grassY) {
        if (x < 0 || x >= COLS) return;
        if (grassY - 1 >= 0) grid[grassY - 1][x] = 'wood';
        if (grassY - 2 >= 0) grid[grassY - 2][x] = 'wood';
        [-1, 0, 1].forEach(function (dx) {
            const lx = x + dx;
            const ly = grassY - 3;
            if (lx < 0 || lx >= COLS || ly < 0) return;
            if (grid[ly][lx] === 'air') grid[ly][lx] = 'leaf';
        });
    }

    function createDefaultWorld(seed) {
        const n = Number(seed) || 7;
        const grid = [];
        for (let y = 0; y < ROWS; y += 1) {
            const row = [];
            for (let x = 0; x < COLS; x += 1) row.push('air');
            grid.push(row);
        }
        fillIsland(grid, 0, 20, 10);
        fillIsland(grid, 22, 32, 8);
        fillIsland(grid, 34, 38, 6);
        plantTree(grid, 4, 10);
        plantTree(grid, 10, 10);
        plantTree(grid, 16, 10);
        plantTree(grid, 26, 8);
        for (let i = 0; i < 6; i += 1) {
            const x = 3 + i * 2 + (n % 3);
            const y = 14 + (i % 2);
            if (x < COLS && grid[y][x] === 'stone') grid[y][x] = 'crystal';
        }
        [0, 1, 2].forEach(function (x) {
            if (grid[10][x] === 'grass') grid[10][x] = 'sand';
        });
        [14, 15].forEach(function (x) {
            if (grid[10][x] === 'grass') grid[10][x] = 'water';
        });
        [[5, 14], [8, 15], [11, 14], [17, 15]].forEach(function (spot) {
            if (grid[spot[1]][spot[0]] === 'stone') grid[spot[1]][spot[0]] = 'coal';
        });
        return { cols: COLS, rows: ROWS, grid: grid };
    }

    function cloneWorld(world) {
        return JSON.parse(JSON.stringify(world));
    }

    function isValidWorld(world) {
        return !!(world && Array.isArray(world.grid) && world.grid.length >= 8
            && world.grid[0] && world.grid[0].length >= 8
            && world.cols === world.grid[0].length
            && world.rows === world.grid.length);
    }

    function inBounds(world, x, y) {
        return world && x >= 0 && y >= 0 && x < world.cols && y < world.rows;
    }

    function getCell(world, x, y) {
        if (!world) return 'bedrock';
        if (x < 0 || x >= world.cols) return 'bedrock';
        if (y < 0 || y >= world.rows) return 'air';
        return world.grid[y][x] || 'air';
    }

    function isVoid(world, x, y) {
        return y >= (world && world.rows ? world.rows - 1 : 0) && isPassable(getCell(world, x, y)) && isPassable(getCell(world, x, y + 1));
    }

    function isPassable(kind) {
        return !kind || kind === 'air' || kind === 'water';
    }

    function minerRank(questsDone, ranks) {
        const n = Array.isArray(questsDone) ? questsDone.length : 0;
        const list = ranks || [];
        let rank = 1;
        list.forEach(function (r) {
            if (n >= (r.needQuests || 0)) rank = r.rank;
        });
        return rank;
    }

    function canBreak(kind, toolId) {
        if (!kind || kind === 'air' || kind === 'bedrock') return false;
        const tool = TOOLS[toolId] || TOOLS.hand;
        if (tool.mine.indexOf('all') !== -1) return true;
        return tool.mine.indexOf(kind) !== -1;
    }

    function breakReason(kind, toolId) {
        if (kind === 'bedrock') return '基岩挖不了';
        if (!kind || kind === 'air') return '这里没有方块';
        if (canBreak(kind, toolId)) return '';
        if ((kind === 'stone' || kind === 'coal') && !canBreak(kind, toolId) && canBreak(kind, 'wood_pick')) {
            return '需要木镐才能挖' + (kind === 'coal' ? '煤炭' : '石头');
        }
        if (kind === 'crystal' && !canBreak(kind, toolId) && canBreak(kind, 'stone_pick')) {
            return '需要石镐才能挖晶体';
        }
        return '换个工具试试';
    }

    function breakBlock(world, x, y, toolId, _rank) {
        const kind = getCell(world, x, y);
        if (!canBreak(kind, toolId)) {
            return { ok: false, reason: breakReason(kind, toolId), kind: kind, world: world };
        }
        world.grid[y][x] = 'air';
        return { ok: true, kind: kind, world: world };
    }

    function mineBlock(world, x, y, toolId, _rank) {
        const kind = getCell(world, x, y);
        const first = breakBlock(world, x, y, toolId);
        if (!first.ok) return first;
        const dropped = [first.kind];
        if (kind === 'wood') {
            let yy = y - 1;
            while (yy >= 0 && getCell(world, x, yy) === 'wood') {
                const more = breakBlock(world, x, yy, toolId);
                if (!more.ok) break;
                dropped.push('wood');
                yy -= 1;
            }
        }
        return { ok: true, kind: first.kind, dropped: dropped, world: world };
    }

    function addToInventory(inv, kind, n) {
        const bag = inv || emptyInv();
        if (!Object.prototype.hasOwnProperty.call(bag, kind)) return bag;
        bag[kind] = Math.max(0, (Number(bag[kind]) || 0) + (n || 1));
        return bag;
    }

    function consumeFromInventory(inv, kind) {
        const bag = inv || emptyInv();
        if ((Number(bag[kind]) || 0) <= 0) return { ok: false, inventory: bag };
        bag[kind] -= 1;
        return { ok: true, inventory: bag };
    }

    function placeBlock(world, x, y, kind) {
        if (!kind || kind === 'air' || kind === 'bedrock') {
            return { ok: false, reason: '不能放这个', world: world };
        }
        if (!inBounds(world, x, y)) return { ok: false, reason: '出界了', world: world };
        if (getCell(world, x, y) !== 'air') return { ok: false, reason: '这里已经有方块', world: world };
        world.grid[y][x] = kind;
        return { ok: true, kind: kind, world: world };
    }

    function countKind(world, kind) {
        let n = 0;
        if (!world || !world.grid) return 0;
        world.grid.forEach(function (row) {
            row.forEach(function (cell) { if (cell === kind) n += 1; });
        });
        return n;
    }

    function countSolid(world) {
        let n = 0;
        if (!world || !world.grid) return 0;
        world.grid.forEach(function (row) {
            row.forEach(function (cell) {
                if (cell && cell !== 'air' && cell !== 'bedrock') n += 1;
            });
        });
        return n;
    }

    function spawnCell(world) {
        const x = 2;
        let y = 0;
        const rows = world && world.rows ? world.rows : ROWS;
        for (let yy = 0; yy < rows; yy += 1) {
            if (isPassable(getCell(world, x, yy)) && !isPassable(getCell(world, x, yy + 1))) {
                y = yy;
                break;
            }
        }
        return { x: x, y: y };
    }

    function tryMove(world, x, y, dx, dy) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(world, nx, ny)) return { x: x, y: y, ok: false };
        if (!isPassable(getCell(world, nx, ny))) return { x: x, y: y, ok: false };
        return { x: nx, y: ny, ok: true };
    }

    function applyGravity(world, x, y) {
        let ny = y;
        while (inBounds(world, x, ny + 1) && isPassable(getCell(world, x, ny + 1))) {
            ny += 1;
        }
        return { x: x, y: ny };
    }

    function isGrounded(world, x, y) {
        return !isPassable(getCell(world, x, y + 1));
    }

    function stepFall(world, x, y) {
        return tryMove(world, x, y, 0, 1);
    }

    function jumpUp(world, x, y, cells) {
        if (!isGrounded(world, x, y)) return { x: x, y: y, ok: false };
        let ny = y;
        let hopped = 0;
        const max = Number(cells) || 2;
        for (let i = 0; i < max; i += 1) {
            const up = tryMove(world, x, ny, 0, -1);
            if (!up.ok) break;
            ny = up.y;
            hopped += 1;
        }
        return { x: x, y: ny, ok: hopped > 0 };
    }

    function stepWander(world, actor, roll) {
        const dx = (Number(roll) || 0) > 0.66 ? 1 : ((Number(roll) || 0) < 0.33 ? -1 : 0);
        const moved = tryMove(world, actor.x, actor.y, dx, 0);
        const next = applyGravity(world, moved.x, moved.y);
        return { x: next.x, y: next.y, kind: actor.kind };
    }

    function stepChase(world, actor, target) {
        let dx = 0;
        if (target && target.x > actor.x) dx = 1;
        else if (target && target.x < actor.x) dx = -1;
        const moved = tryMove(world, actor.x, actor.y, dx, 0);
        const next = applyGravity(world, moved.x, moved.y);
        return { x: next.x, y: next.y, kind: actor.kind };
    }

    function sameCell(a, b) {
        return !!(a && b && a.x === b.x && a.y === b.y);
    }

    function hitMiner(hp, amount) {
        return Math.max(0, (Number(hp) || 0) - (amount == null ? BUMP_HP : amount));
    }

    function questValue(quest, stats) {
        if (!quest) return 0;
        const placed = stats.placedThis || {};
        const collected = stats.collectedThis || {};
        const byKind = stats.buildTotalByKind || {};
        if (quest.type === 'build') return Number(placed[quest.block]) || 0;
        if (quest.type === 'build_any') return Number(stats.placedAnyThis) || 0;
        if (quest.type === 'build_total') return Number(stats.buildTotal) || 0;
        if (quest.type === 'build_total_block') return Number(byKind[quest.block]) || 0;
        if (quest.type === 'collect') return Number(collected.crystal) || 0;
        if (quest.type === 'collect_total') return Number(stats.crystalsTotal) || 0;
        if (quest.type === 'blocks_alive') return Number(stats.blocksAlive) || 0;
        return 0;
    }

    function isQuestComplete(quest, stats) {
        return questValue(quest, stats) >= (Number(quest && quest.need) || 0);
    }

    function craft(inv, recipeId) {
        const recipe = RECIPES.filter(function (row) { return row.id === recipeId; })[0];
        const bag = Object.assign(emptyInv(), inv || {});
        if (!recipe) return { ok: false, reason: '没有这个配方', inventory: bag };
        const inputs = recipe.inputs || {};
        const keys = Object.keys(inputs);
        for (let i = 0; i < keys.length; i += 1) {
            const kind = keys[i];
            if ((Number(bag[kind]) || 0) < inputs[kind]) {
                return { ok: false, reason: '材料不够', inventory: bag };
            }
        }
        keys.forEach(function (kind) {
            bag[kind] -= inputs[kind];
        });
        Object.keys(recipe.outputs || {}).forEach(function (kind) {
            if (!Object.prototype.hasOwnProperty.call(bag, kind)) return;
            bag[kind] += recipe.outputs[kind];
        });
        return { ok: true, recipe: recipe, inventory: bag };
    }

    global.VoxelWorld = {
        COLS: COLS,
        ROWS: ROWS,
        MAX_HP: MAX_HP,
        BUMP_HP: BUMP_HP,
        KINDS: KINDS,
        TOOLS: TOOLS,
        TOOL_BREAKS: TOOL_BREAKS,
        breakReason: breakReason,
        RECIPES: RECIPES,
        emptyInv: emptyInv,
        createDefaultWorld: createDefaultWorld,
        cloneWorld: cloneWorld,
        isValidWorld: isValidWorld,
        getCell: getCell,
        isPassable: isPassable,
        isVoid: isVoid,
        canBreak: canBreak,
        breakBlock: breakBlock,
        mineBlock: mineBlock,
        placeBlock: placeBlock,
        addToInventory: addToInventory,
        consumeFromInventory: consumeFromInventory,
        countKind: countKind,
        countSolid: countSolid,
        spawnCell: spawnCell,
        tryMove: tryMove,
        applyGravity: applyGravity,
        isGrounded: isGrounded,
        stepFall: stepFall,
        jumpUp: jumpUp,
        stepWander: stepWander,
        stepChase: stepChase,
        sameCell: sameCell,
        hitMiner: hitMiner,
        minerRank: minerRank,
        questValue: questValue,
        isQuestComplete: isQuestComplete,
        craft: craft
    };
}(typeof window !== 'undefined' ? window : globalThis));
