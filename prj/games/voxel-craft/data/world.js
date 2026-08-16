/**
 * voxel-craft · 纯函数世界模块（T20260815-voxel-remake S1）
 * 玩法规格抽取自 cheyao/2d-minecraft（C++，zlib）的 chunk/physics/registers，
 * 按《steps.md 附录 A》幼儿化（挖掘时长 ÷4、有限世界 4 区块）。
 * 无 DOM 依赖，node --test 直测。
 */
(function (global) {
    'use strict';

    const COLS = 64;   // 4 区块 × 16 列（C++ CHUNK_WIDTH=16）
    const ROWS = 32;   // C++ WATER_LEVEL*2 = 32
    const DEEP_ZONE = 6;      // 最深 6 行才可能出现晶体
    const CRYSTAL_COUNT = 6;

    const KINDS = ['air', 'grass', 'dirt', 'wood', 'leaf', 'plank', 'stone', 'sand', 'water', 'coal', 'crystal', 'bedrock', 'torch', 'table', 'portal'];
    const KIND_CODE = { air: '.', grass: 'g', dirt: 'd', wood: 'w', leaf: 'l', plank: 'p', stone: 's', sand: 'a', water: 'u', coal: 'c', crystal: 'x', bedrock: 'b', torch: 't', table: 'e', portal: 'o' };
    const CODE_KIND = Object.keys(KIND_CODE).reduce(function (m, k) { m[KIND_CODE[k]] = k; return m; }, {});

    const KIND_LABEL = {
        grass: '草方块', dirt: '泥土', sand: '沙子', wood: '橡木', plank: '橡木板', leaf: '树叶',
        stone: '石头', coal: '煤矿', crystal: '晶体', torch: '火把', stick: '木棍',
        wood_pick: '木镐', stone_pick: '石镐', table: '合成台',
        wood_axe: '木斧', stone_axe: '石斧', wood_shovel: '木铲', wood_sword: '木剑',
        portal: '矿洞洞口',
        wheat: '麦穗', bread: '面包', chest: '箱子', bowl: '碗', ladder: '梯子', fence: '木栅栏', apple: '苹果'
    };

    const INV_SLOT_COUNT = 36;
    const HOTBAR_COUNT = 9;
    const ITEM_ICONS = {
        wood_pick: 'items/wooden-pickaxe.png',
        stone_pick: 'items/stone-pickaxe.png',
        wood_axe: 'items/wooden-axe.png',
        stone_axe: 'items/stone-axe.png',
        wood_shovel: 'items/wooden-shovel.png',
        wood_sword: 'items/wooden-sword.png',
        stick: 'items/stick.png',
        apple: 'items/apple.png',
        bread: 'items/bread.png',
        chest: 'items/chest.png',
        bowl: 'items/bowl.png',
        ladder: 'items/ladder.png',
        fence: 'items/fence.png',
        wheat: 'items/wheat.png',
        coal: 'items/coal.png',
        crystal: 'items/diamond.png',
        grass: 'blocks/grass-block.png',
        dirt: 'blocks/dirt.png',
        stone: 'blocks/stone.png',
        wood: 'blocks/oak-log.png',
        leaf: 'blocks/oak-leaves.png',
        plank: 'blocks/oak-planks.png',
        torch: 'blocks/torch.png',
        table: 'blocks/crafting-table.png',
        portal: 'blocks/furnace-on.png'
    };

    function itemIcon(kind) {
        return ITEM_ICONS[kind] || '';
    }

    function makeSlots(count) {
        const n = count || INV_SLOT_COUNT;
        const slots = [];
        for (let i = 0; i < n; i += 1) slots.push(null);
        return slots;
    }

    function cloneSlots(slots) {
        return (slots || makeSlots()).map(function (row) {
            return row ? { kind: row.kind, n: row.n } : null;
        });
    }

    function addToSlots(slots, kind, n) {
        const next = cloneSlots(slots);
        let left = n || 1;
        for (let i = 0; i < next.length && left > 0; i += 1) {
            if (next[i] && next[i].kind === kind) {
                next[i].n += left;
                left = 0;
            }
        }
        for (let i = 0; i < next.length && left > 0; i += 1) {
            if (!next[i]) {
                next[i] = { kind: kind, n: left };
                left = 0;
            }
        }
        return next;
    }

    function moveSlot(slots, from, to) {
        const next = cloneSlots(slots);
        const a = Number(from);
        const b = Number(to);
        if (a === b || a < 0 || b < 0 || a >= next.length || b >= next.length) return next;
        const src = next[a];
        const dst = next[b];
        if (!src) return next;
        if (!dst) {
            next[b] = src;
            next[a] = null;
        } else if (dst.kind === src.kind) {
            next[b] = { kind: dst.kind, n: dst.n + src.n };
            next[a] = null;
        } else {
            next[a] = dst;
            next[b] = src;
        }
        return next;
    }

    function takeFromSlot(slots, index, n) {
        const next = cloneSlots(slots);
        const i = Number(index);
        const need = n || 1;
        if (!next[i] || next[i].n < need) return { ok: false, slots: next, kind: '' };
        const kind = next[i].kind;
        next[i].n -= need;
        if (next[i].n <= 0) next[i] = null;
        return { ok: true, slots: next, kind: kind };
    }

    function countsFromSlots(slots) {
        const inv = emptyInv();
        (slots || []).forEach(function (row) {
            if (row && row.kind) inv[row.kind] = (inv[row.kind] || 0) + (row.n || 0);
        });
        return inv;
    }

    function slotsFromCounts(inv) {
        let slots = makeSlots();
        const row = inv || {};
        Object.keys(row).forEach(function (kind) {
            if ((row[kind] || 0) > 0) slots = addToSlots(slots, kind, row[kind]);
        });
        return slots;
    }

    /** 工具能力表（对齐 C++ 挖掘等级：木头等级 0，空手可砍——这是 MC 的起步循环） */
    const TOOL_MINE = {
        hand: ['grass', 'dirt', 'sand', 'leaf', 'table', 'wood', 'plank', 'torch'],
        wood_pick: ['grass', 'dirt', 'sand', 'leaf', 'table', 'wood', 'plank', 'torch', 'stone', 'coal'],
        stone_pick: ['grass', 'dirt', 'sand', 'leaf', 'table', 'wood', 'plank', 'torch', 'stone', 'coal', 'crystal'],
        wood_axe: ['grass', 'dirt', 'sand', 'leaf', 'table', 'wood', 'plank', 'torch'],
        stone_axe: ['grass', 'dirt', 'sand', 'leaf', 'table', 'wood', 'plank', 'torch'],
        wood_shovel: ['grass', 'dirt', 'sand', 'leaf'],
        wood_sword: ['leaf']
    };

    /** 顺手工具提速：对应类别方块挖掘时间减半（斧砍木、铲挖土、镐凿石） */
    const TOOL_FAST = {
        wood_axe: ['wood', 'plank', 'leaf'],
        stone_axe: ['wood', 'plank', 'leaf'],
        wood_shovel: ['dirt', 'sand', 'grass'],
        wood_pick: ['stone', 'coal'],
        stone_pick: ['stone', 'coal', 'crystal']
    };
    /** 段位门禁：低于该 rank 的方块提示先做前面的任务 */
    const KIND_RANK = { stone: 3, coal: 3, crystal: 5 };

    /** 挖掘时长（帧@60fps）＝ C++ BREAK_TIMES 比例 ÷4（草30 石80 矿120+） */
    const BREAK_TIME = {
        grass: 8, dirt: 8, sand: 6, leaf: 5, torch: 1, table: 15,
        wood: 13, plank: 15, stone: 20, coal: 30, crystal: 45, bedrock: Infinity
    };

    const RECIPES = [
        { id: 'plank', name: '橡木板', inputs: { wood: 1 }, outputs: { plank: 4 } },
        { id: 'wood', name: '橡木', inputs: { plank: 4 }, outputs: { wood: 1 } },
        { id: 'grass', name: '草方块', inputs: { dirt: 2 }, outputs: { grass: 1 } },
        { id: 'stick', name: '木棍', inputs: { plank: 2 }, outputs: { stick: 4 } },
        { id: 'table', name: '合成台', inputs: { plank: 4 }, outputs: { table: 1 } },
        { id: 'torch', name: '火把', inputs: { coal: 1, stick: 1 }, outputs: { torch: 4 } },
        { id: 'wood_pick', name: '木镐', inputs: { plank: 3, stick: 2 }, outputs: { wood_pick: 1 } },
        { id: 'stone_pick', name: '石镐', inputs: { stone: 3, stick: 2 }, outputs: { stone_pick: 1 } },
        { id: 'wood_axe', name: '木斧', inputs: { plank: 3, stick: 2 }, outputs: { wood_axe: 1 } },
        { id: 'stone_axe', name: '石斧', inputs: { stone: 3, stick: 2 }, outputs: { stone_axe: 1 } },
        { id: 'wood_shovel', name: '木铲', inputs: { plank: 1, stick: 2 }, outputs: { wood_shovel: 1 } },
        { id: 'wood_sword', name: '木剑', inputs: { plank: 2, stick: 1 }, outputs: { wood_sword: 1 } },
        { id: 'chest', name: '箱子', inputs: { plank: 8 }, outputs: { chest: 1 } },
        { id: 'bowl', name: '碗', inputs: { plank: 3 }, outputs: { bowl: 1 } },
        { id: 'ladder', name: '梯子', inputs: { stick: 7 }, outputs: { ladder: 1 } },
        { id: 'fence', name: '木栅栏', inputs: { plank: 4, stick: 2 }, outputs: { fence: 2 } },
        { id: 'wheat', name: '麦穗', inputs: { grass: 1, leaf: 1 }, outputs: { wheat: 1 } },
        { id: 'bread', name: '面包', inputs: { wheat: 3 }, outputs: { bread: 1 } }
    ];

    /** 格子合成配方（移植 2d-minecraft CRAFTING_RECIPIES）：
        shape = [宽, 高] 有形配方，图案在网格内可任意偏移；shape = null 为无形（凑齐即可）。
        cells 按行主序，null 表示空格。随身 2×2，点世界里的合成台开 3×3。 */
    const GRID_RECIPES = [
        { id: 'table', shape: [2, 2], cells: ['plank', 'plank', 'plank', 'plank'], out: { kind: 'table', n: 1 } },
        { id: 'stick', shape: [1, 2], cells: ['plank', 'plank'], out: { kind: 'stick', n: 4 } },
        { id: 'wood_pick', shape: [3, 3], cells: ['plank', 'plank', 'plank', null, 'stick', null, null, 'stick', null], out: { kind: 'wood_pick', n: 1 } },
        { id: 'stone_pick', shape: [3, 3], cells: ['stone', 'stone', 'stone', null, 'stick', null, null, 'stick', null], out: { kind: 'stone_pick', n: 1 } },
        { id: 'wood_axe', shape: [2, 3], cells: ['plank', 'plank', 'plank', 'stick', null, 'stick'], out: { kind: 'wood_axe', n: 1 } },
        { id: 'stone_axe', shape: [2, 3], cells: ['stone', 'stone', 'stone', 'stick', null, 'stick'], out: { kind: 'stone_axe', n: 1 } },
        { id: 'wood_shovel', shape: [1, 3], cells: ['plank', 'stick', 'stick'], out: { kind: 'wood_shovel', n: 1 } },
        { id: 'wood_sword', shape: [1, 3], cells: ['plank', 'plank', 'stick'], out: { kind: 'wood_sword', n: 1 } },
        { id: 'plank', shape: null, cells: ['wood'], out: { kind: 'plank', n: 4 } },
        { id: 'torch', shape: null, cells: ['coal', 'stick'], out: { kind: 'torch', n: 4 } },
        { id: 'grass', shape: null, cells: ['dirt', 'dirt'], out: { kind: 'grass', n: 1 } },
        { id: 'chest', shape: [3, 3], cells: ['plank', 'plank', 'plank', 'plank', null, 'plank', 'plank', 'plank', 'plank'], out: { kind: 'chest', n: 1 } },
        { id: 'bowl', shape: [3, 2], cells: ['plank', null, 'plank', null, 'plank', null], out: { kind: 'bowl', n: 1 } },
        { id: 'ladder', shape: [3, 3], cells: ['stick', null, 'stick', 'stick', 'stick', 'stick', 'stick', null, 'stick'], out: { kind: 'ladder', n: 3 } },
        { id: 'fence', shape: [3, 2], cells: ['plank', 'stick', 'plank', 'plank', 'stick', 'plank'], out: { kind: 'fence', n: 2 } },
        { id: 'wheat', shape: null, cells: ['grass', 'leaf'], out: { kind: 'wheat', n: 1 } },
        { id: 'bread', shape: [3, 1], cells: ['wheat', 'wheat', 'wheat'], out: { kind: 'bread', n: 1 } }
    ];

    /** 网格匹配（C++ CraftingInventory::checkRecipie 移植）：cells 为 size×size 扁平数组（kind|null），不足自动补空 */
    function matchCraftGrid(cells, size) {
        const n = size * size;
        if (!Array.isArray(cells)) return null;
        const view = [];
        for (let i = 0; i < n; i += 1) view.push(cells[i] || null);
        for (let ri = 0; ri < GRID_RECIPES.length; ri += 1) {
            const r = GRID_RECIPES[ri];
            if (r.shape) {
                const w = r.shape[0];
                const h = r.shape[1];
                if (w > size || h > size) continue;
                for (let yoff = 0; yoff <= size - h; yoff += 1) {
                    for (let xoff = 0; xoff <= size - w; xoff += 1) {
                        let ok = true;
                        for (let y = 0; y < size && ok; y += 1) {
                            for (let x = 0; x < size && ok; x += 1) {
                                const inPattern = x >= xoff && x < xoff + w && y >= yoff && y < yoff + h;
                                const want = inPattern ? (r.cells[(y - yoff) * w + (x - xoff)] || null) : null;
                                if (view[y * size + x] !== want) ok = false;
                            }
                        }
                        if (ok) return r;
                    }
                }
            } else {
                const need = r.cells.slice().sort();
                const have = view.filter(function (k) { return k; }).sort();
                if (need.length === have.length && need.every(function (k, i) { return k === have[i]; })) return r;
            }
        }
        return null;
    }

    /** 熔炉：木柴烧炭、沙烧石（燃料另计） */
    const SMELT_RECIPES = [
        { id: 'coal', inputs: { wood: 2 }, outputs: { coal: 1 } },
        { id: 'stone', inputs: { sand: 2 }, outputs: { stone: 1 } }
    ];
    const FUELS = { wood: 1, plank: 1, coal: 4, stick: 1 };

    /** 蓝图任务（q13–q15）：w=木 p=板 s=石 ·=任意 */
    const BLUEPRINTS = {
        hut: { x: 20, y: 8, pattern: ['..w..', '.ppp.', 'wp.pw', 'ppppp'] },
        tower: { x: 44, y: 4, pattern: ['.s.', 'sss', '.s.', 'sss', 'sss'] },
        garden: { x: 30, y: 12, pattern: ['w.w.w', '.....', 'w.w.w'] }
    };

    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** 值噪声（格距 8 列 + smoothstep），C++ NoiseGenerator 的简化等价 */
    function noise1D(seed) {
        const rand = mulberry32(seed);
        const lattice = [];
        for (let i = 0; i <= Math.ceil(COLS / 8) + 1; i += 1) lattice.push(rand());
        return function (x) {
            const i = Math.floor(x / 8);
            const t = (x - i * 8) / 8;
            const s = t * t * (3 - 2 * t);
            return lattice[i] * (1 - s) + lattice[i + 1] * s;
        };
    }

    function emptyGrid() {
        return Array.from({ length: ROWS }, function () {
            return Array.from({ length: COLS }, function () { return 'air'; });
        });
    }

    function mapConfig(id) {
        if (global.VoxelCraftMaps && typeof global.VoxelCraftMaps.get === 'function') {
            return global.VoxelCraftMaps.get(id);
        }
        return null;
    }

    function canEnterCave(rank) {
        return (Number(rank) || 1) >= 4;
    }

    function placePortal(grid, x, y) {
        if (!grid[y] || x < 0 || x >= COLS) return;
        grid[y][x] = 'portal';
        if (grid[y - 1]) grid[y - 1][x] = 'air';
        if (grid[y - 2]) grid[y - 2][x] = 'air';
    }

    function columnHasCrystal(grid, x, y) {
        for (let dy = 0; dy <= 2; dy += 1) {
            const row = grid[y - dy];
            if (row && row[x] === 'crystal') return true;
        }
        return false;
    }

    function placePortalAwayFromCrystals(grid, preferredX, y) {
        for (let dx = 0; dx < COLS; dx += 1) {
            const x = (preferredX + dx) % COLS;
            if (!grid[y] || grid[y][x] === 'bedrock') continue;
            if (columnHasCrystal(grid, x, y)) continue;
            placePortal(grid, x, y);
            return;
        }
        placePortal(grid, preferredX, y);
    }

    function createWorld(seed, biome) {
        if (biome && biome !== 'meadow' && biome !== 'cave' && mapConfig(biome)) {
            return createMapWorld(seed, biome);
        }
        const mode = biome === 'cave' ? 'cave' : 'meadow';
        if (mode === 'cave') return createCaveWorld(seed);
        const s = Number(seed) || 1;
        const rand = mulberry32(s * 2654435761);
        const noise = noise1D(s);
        const grid = emptyGrid();
        const surface = [];
        for (let x = 0; x < COLS; x += 1) {
            // 地表 = 26 + 2*noise：天空 ~27 行、地下 ~5 行（用户四轮反馈「地面太多」）
            surface[x] = 26 + Math.round(2 * noise(x));
        }
        // 沙滩水塘段（48–56 列）
        for (let x = 48; x <= 56; x += 1) surface[x] = Math.min(ROWS - 6, surface[x] + 1);
        for (let x = 0; x < COLS; x += 1) {
            for (let y = surface[x]; y < ROWS; y += 1) {
                if (y === ROWS - 1) grid[y][x] = 'bedrock';
                else if (y === surface[x]) grid[y][x] = (x >= 48 && x <= 56) ? 'sand' : 'grass';
                else if (y === surface[x] + 1) grid[y][x] = (x >= 48 && x <= 56) ? 'sand' : 'dirt';
                else grid[y][x] = 'stone';
            }
        }
        for (let x = 50; x <= 54; x += 1) {
            grid[surface[x] - 1][x] = 'water';
            if (surface[x] >= 1 && rand() < 0.5) grid[surface[x] - 2][x] = 'water';
        }
        // 树：第 3 列必出（C++ rig），其余概率 12%
        for (let x = 2; x < COLS - 2; x += 1) {
            if (x >= 46 && x <= 58) continue;
            if (x !== 3 && rand() >= 0.12) continue;
            plantTree(grid, x, surface[x], rand);
        }
        // 煤矿脉：石头里随机游走（地下收窄后深度同步上收）
        for (let v = 0; v < 8; v += 1) {
            let x = 2 + Math.floor(rand() * (COLS - 4));
            let y = surface[x] + 2 + Math.floor(rand() * 3);
            const count = 2 + Math.floor(rand() * 3);
            for (let c = 0; c < count; c += 1) {
                if (grid[y] && grid[y][x] === 'stone') grid[y][x] = 'coal';
                x += Math.floor(rand() * 3) - 1;
                y += Math.floor(rand() * 3) - 1;
                x = Math.max(0, Math.min(COLS - 1, x));
                y = Math.max(0, Math.min(ROWS - 2, y));
            }
        }
        // 晶体：最深 8 行内固定 6 个
        let placed = 0;
        let guard = 0;
        while (placed < CRYSTAL_COUNT && guard < 500) {
            guard += 1;
            const x = 1 + Math.floor(rand() * (COLS - 2));
            const y = ROWS - DEEP_ZONE + Math.floor(rand() * (DEEP_ZONE - 1));
            if (grid[y][x] === 'stone') { grid[y][x] = 'crystal'; placed += 1; }
        }
        placePortalAwayFromCrystals(grid, 32, ROWS - 3);
        return attachLook({
            cols: COLS, rows: ROWS, seed: s, grid: grid, surface: surface, biome: 'meadow', mapId: 'meadow'
        }, { id: 'meadow', sky: 'day', color: '#5db54a' }, rand);
    }

    function createCaveWorld(seed) {
        const s = Number(seed) || 1;
        const rand = mulberry32((s + 91) * 2654435761);
        const noise = noise1D(s + 17);
        const grid = emptyGrid();
        const surface = [];
        for (let x = 0; x < COLS; x += 1) {
            surface[x] = 18 + Math.round(2 * noise(x));
        }
        for (let x = 0; x < COLS; x += 1) {
            for (let y = 0; y < ROWS; y += 1) {
                if (y === ROWS - 1) grid[y][x] = 'bedrock';
                else if (y < 3) grid[y][x] = 'stone';
                else if (y < surface[x]) grid[y][x] = 'air';
                else grid[y][x] = 'stone';
            }
        }
        for (let v = 0; v < 16; v += 1) {
            let x = 2 + Math.floor(rand() * (COLS - 4));
            let y = surface[x] + 1 + Math.floor(rand() * 4);
            const count = 3 + Math.floor(rand() * 4);
            for (let c = 0; c < count; c += 1) {
                if (grid[y] && grid[y][x] === 'stone') grid[y][x] = 'coal';
                x += Math.floor(rand() * 3) - 1;
                y += Math.floor(rand() * 3) - 1;
                x = Math.max(0, Math.min(COLS - 1, x));
                y = Math.max(0, Math.min(ROWS - 2, y));
            }
        }
        let placed = 0;
        let guard = 0;
        while (placed < CRYSTAL_COUNT * 2 && guard < 800) {
            guard += 1;
            const x = 1 + Math.floor(rand() * (COLS - 2));
            const y = ROWS - DEEP_ZONE + Math.floor(rand() * (DEEP_ZONE - 1));
            if (grid[y][x] === 'stone') { grid[y][x] = 'crystal'; placed += 1; }
        }
        placePortal(grid, 6, surface[6]);
        return attachLook({
            cols: COLS, rows: ROWS, seed: s, grid: grid, surface: surface, biome: 'cave', mapId: 'cave'
        }, { id: 'cave', sky: 'cave', color: '#3b3b4f' }, rand);
    }

    /**
     * 参考群系的当前引擎适配器：保持 64×32 网格，替换地表材质、天空主题、
     * 装饰密度和敌人池所需的 mapId。这样旧的挖放/存档/碰撞代码无需分叉。
     */
    function createMapWorld(seed, mapId) {
        const spec = mapConfig(mapId) || mapConfig('meadow');
        const s = Number(seed) || 1;
        const rand = mulberry32((s + String(spec.id).length * 97) * 2654435761);
        const noise = noise1D(s + spec.id.length * 13);
        const grid = emptyGrid();
        const surface = [];
        const surfaceKind = KINDS.indexOf(spec.surface) >= 0 ? spec.surface : 'grass';
        const subKind = KINDS.indexOf(spec.sub) >= 0 ? spec.sub : 'dirt';
        const deepKind = KINDS.indexOf(spec.deep) >= 0 ? spec.deep : 'stone';

        for (let x = 0; x < COLS; x += 1) {
            surface[x] = Math.max(8, Math.min(ROWS - 5, 24 + Math.round(noise(x) * 3) + (Number(spec.bias) || 0)));
        }
        for (let x = 0; x < COLS; x += 1) {
            for (let y = surface[x]; y < ROWS; y += 1) {
                if (y === ROWS - 1) grid[y][x] = 'bedrock';
                else if (y === surface[x]) grid[y][x] = surfaceKind;
                else if (y <= surface[x] + 2) grid[y][x] = subKind;
                else grid[y][x] = deepKind;
            }
        }

        if (spec.water) {
            const waterStart = spec.id === 'ocean' ? 20 : 42;
            const waterEnd = spec.id === 'ocean' ? 42 : 48;
            for (let x = waterStart; x <= waterEnd && x < COLS; x += 1) {
                const y = surface[x] - 1;
                if (y >= 0 && grid[y][x] === 'air') grid[y][x] = 'water';
            }
        }
        const treeChance = Math.max(0, Math.min(0.42, Number(spec.tree) || 0));
        for (let x = 2; x < COLS - 2; x += 1) {
            if (spec.id === 'ocean' && x >= 18 && x <= 44) continue;
            if (rand() < treeChance) plantTree(grid, x, surface[x], rand);
        }

        const oreKind = spec.id === 'end' ? 'crystal' : (spec.id === 'volcano' || spec.id === 'nether' ? 'coal' : 'coal');
        const oreVeins = spec.id === 'ocean' ? 5 : (spec.id === 'deep_dark' ? 12 : 8);
        for (let v = 0; v < oreVeins; v += 1) {
            let x = 2 + Math.floor(rand() * (COLS - 4));
            let y = surface[x] + 2 + Math.floor(rand() * 4);
            const count = 2 + Math.floor(rand() * 3);
            for (let c = 0; c < count; c += 1) {
                if (grid[y] && grid[y][x] === deepKind) grid[y][x] = oreKind;
                x = Math.max(1, Math.min(COLS - 2, x + Math.floor(rand() * 3) - 1));
                y = Math.max(1, Math.min(ROWS - 2, y + Math.floor(rand() * 3) - 1));
            }
        }
        let crystals = spec.id === 'end' || spec.id === 'deep_dark' ? 10 : 6;
        let guard = 0;
        while (crystals > 0 && guard < 600) {
            guard += 1;
            const x = 1 + Math.floor(rand() * (COLS - 2));
            const y = ROWS - 7 + Math.floor(rand() * 5);
            if (grid[y] && grid[y][x] === deepKind) {
                grid[y][x] = 'crystal';
                crystals -= 1;
            }
        }
        return attachLook({
            cols: COLS, rows: ROWS, seed: s, grid: grid, surface: surface,
            biome: spec.id, mapId: spec.id
        }, spec, rand);
    }

    function plantDecorations(world, spec, rand) {
        const list = [];
        const id = (spec && spec.id) || world.mapId || world.biome || 'meadow';
        const surface = world.surface || [];
        function push(type, x) {
            if (x < 1 || x >= COLS - 1) return;
            list.push({ type: type, x: x, y: surface[x] || 0 });
        }
        if (id === 'forest' || id === 'cherry_grove') {
            for (let x = 2; x < COLS - 2; x += 1) {
                if (rand() < 0.2) push('bush', x);
            }
        } else if (id === 'desert') {
            for (let x = 3; x < COLS - 3; x += 2) {
                if (rand() < 0.28) push('cactus', x);
            }
        } else if (id === 'nether' || id === 'volcano') {
            for (let x = 2; x < COLS - 2; x += 1) {
                if (rand() < 0.14) push('ember', x);
            }
        } else if (id === 'cave' || id === 'deep_dark') {
            for (let x = 4; x < COLS - 4; x += 5) push('crystal_glow', x);
        }
        world.decorations = list;
        return list;
    }

    function attachLook(world, spec, rand) {
        const row = spec || mapConfig(world.mapId || world.biome) || { id: 'meadow', sky: 'day', color: '#5db54a' };
        world.theme = { sky: row.sky || 'day', color: row.color || '#5db54a', floating: !!row.floating };
        plantDecorations(world, row, rand || function () { return 0.5; });
        return world;
    }

    function lookOf(world) {
        const id = (world && (world.mapId || world.biome)) || 'meadow';
        const spec = mapConfig(id) || { sky: 'day', color: '#5db54a', surface: 'grass' };
        const theme = (world && world.theme) || {};
        return {
            id: id,
            sky: theme.sky || spec.sky || 'day',
            color: theme.color || spec.color || '#5db54a',
            surface: spec.surface || 'grass',
            decorations: ((world && world.decorations) || []).map(function (row) { return row.type; })
        };
    }

    function plantTree(grid, x, surfaceY, rand) {
        const trunk = 3 + (rand() < 0.5 ? 1 : 0);
        for (let i = 1; i <= trunk; i += 1) {
            if (surfaceY - i >= 0) grid[surfaceY - i][x] = 'wood';
        }
        const top = surfaceY - trunk;
        for (let dy = -1; dy <= 0; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
                const yy = top + dy;
                const xx = x + dx;
                if (yy < 0 || xx < 0 || xx >= COLS) continue;
                if (grid[yy][xx] === 'air' && !(dy === -1 && Math.abs(dx) === 2)) grid[yy][xx] = 'leaf';
            }
        }
        if (top - 1 >= 0 && grid[top - 1][x] === 'air') grid[top - 1][x] = 'leaf';
    }

    function getCell(world, x, y) {
        if (!world || x < 0 || x >= world.cols || y < 0 || y >= world.rows) return 'bedrock';
        return world.grid[y][x] || 'air';
    }

    function setCell(world, x, y, kind) {
        if (!world || x < 0 || x >= world.cols || y < 0 || y >= world.rows) return;
        world.grid[y][x] = kind || 'air';
    }

    function surfaceOf(world, x) {
        return world.surface[Math.max(0, Math.min(world.cols - 1, x))];
    }

    function findKind(world, kind) {
        if (!world || !world.grid) return null;
        for (let y = 0; y < world.rows; y += 1) {
            for (let x = 0; x < world.cols; x += 1) {
                if (world.grid[y][x] === kind) return { x: x, y: y };
            }
        }
        return null;
    }

    function lightAt(world, x, y, playerX, playerY) {
        if (!world || world.biome !== 'cave') return 1;
        let light = 0.16;
        const px = Number(playerX);
        const py = Number(playerY);
        if (isFinite(px) && isFinite(py)) {
            const pd = Math.abs(x - px) + Math.abs(y - py);
            if (pd <= 6) light = Math.max(light, 1 - pd / 7);
        }
        for (let ty = y - 6; ty <= y + 6; ty += 1) {
            for (let tx = x - 6; tx <= x + 6; tx += 1) {
                if (getCell(world, tx, ty) === 'torch') {
                    const d = Math.abs(x - tx) + Math.abs(y - ty);
                    if (d <= 6) light = Math.max(light, 1 - d / 7);
                }
            }
        }
        if (getCell(world, x, y) === 'portal') light = Math.max(light, 0.88);
        return Math.min(1, light);
    }

    function countKind(world, kind) {
        let n = 0;
        for (let y = 0; y < world.rows; y += 1) {
            for (let x = 0; x < world.cols; x += 1) {
                if (world.grid[y][x] === kind) n += 1;
            }
        }
        return n;
    }

    function isPassable(kind) {
        // 树叶可穿行：避免树冠挡住跳跃与走路（幼儿手感优先，仍可点击采集）
        return kind === 'air' || kind === 'water' || kind === 'torch' || kind === 'leaf';
    }

    function isSolid(kind) {
        return kind !== 'air' && kind !== 'water' && kind !== 'torch' && kind !== 'leaf';
    }

    /** 出生点：找一棵树旁的干净列（脚/头两格都是空气，脚下是实地） */
    function spawnCell(world) {
        for (let x = 4; x < 16 && x < world.cols; x += 1) {
            const s = surfaceOf(world, x);
            if (world.grid[s - 1][x] === 'air' && world.grid[s - 2][x] === 'air') {
                return { x: x, y: s - 1, surface: s };
            }
        }
        return { x: 5, y: surfaceOf(world, 5) - 1, surface: surfaceOf(world, 5) };
    }

    function isVoid(world, x, y) {
        return getCell(world, x, y) === 'air' && y <= surfaceOf(world, x);
    }

    function canBreak(kind, toolId, rank) {
        if (kind === 'bedrock' || kind === 'air' || kind === 'water' || kind === 'portal') return false;
        const mine = TOOL_MINE[toolId] || TOOL_MINE.hand;
        if (mine.indexOf(kind) === -1) return false;
        const need = KIND_RANK[kind] || 1;
        return (rank || 1) >= need;
    }

    function breakReason(kind, toolId, rank) {
        const need = KIND_RANK[kind] || 1;
        if ((rank || 1) < need) return '先完成前面的任务，解锁更深的矿层';
        const mine = TOOL_MINE[toolId] || TOOL_MINE.hand;
        if (mine.indexOf(kind) === -1) {
            return (kind === 'wood' || kind === 'plank') ? '需要木镐来砍木' : '换把更好的镐子试试';
        }
        return '挖不动';
    }

    function breakTime(kind, toolId) {
        if (!canBreak(kind, toolId, 5)) return Infinity;
        let t = BREAK_TIME[kind] === undefined ? Infinity : BREAK_TIME[kind];
        const fast = TOOL_FAST[toolId] || [];
        if (t !== Infinity && fast.indexOf(kind) !== -1) t = Math.max(3, Math.round(t / 2));
        return t;
    }

    function breakBlock(world, x, y, toolId, rank) {
        const kind = getCell(world, x, y);
        if (kind === 'air' || kind === 'water') return { ok: false, reason: '这里没有方块' };
        if (!canBreak(kind, toolId, rank)) return { ok: false, reason: breakReason(kind, toolId, rank) };
        setCell(world, x, y, 'air');
        return { ok: true, kind: kind };
    }

    /** 放置：只能放在空气且四邻/上下有支撑；opts.free 允许悬空（蓝图案内搭积木用） */
    function placeBlock(world, x, y, kind, opts) {
        if (getCell(world, x, y) !== 'air') return { ok: false, reason: '这里已经有方块了' };
        if (!(opts && opts.free)) {
            const neighbors = [getCell(world, x - 1, y), getCell(world, x + 1, y), getCell(world, x, y - 1), getCell(world, x, y + 1)];
            if (!neighbors.some(function (n) { return n !== 'air' && n !== 'water'; })) {
                return { ok: false, reason: '要贴着别的方块放' };
            }
        }
        setCell(world, x, y, kind);
        return { ok: true };
    }

    function emptyInv() {
        return {
            grass: 0, dirt: 0, sand: 0, wood: 0, leaf: 0, plank: 0, stone: 0, coal: 0,
            crystal: 0, torch: 0, table: 0, stick: 0,
            wood_pick: 0, stone_pick: 0,
            wood_axe: 0, stone_axe: 0, wood_shovel: 0, wood_sword: 0,
            wheat: 0, bread: 0, chest: 0, bowl: 0, ladder: 0, fence: 0, apple: 0
        };
    }

    function addToInventory(inv, kind, n) {
        const next = Object.assign({}, inv);
        next[kind] = (next[kind] || 0) + (n || 1);
        return next;
    }

    function consumeFromInventory(inv, kind, n) {
        const need = n || 1;
        if ((inv[kind] || 0) < need) return { ok: false, reason: '背包里没有 ' + (KIND_LABEL[kind] || kind) };
        const next = Object.assign({}, inv);
        next[kind] -= need;
        return { ok: true, inventory: next };
    }

    function findRecipe(id) {
        return RECIPES.filter(function (r) { return r.id === id; })[0] || null;
    }

    function craft(inv, recipeId) {
        const recipe = findRecipe(recipeId);
        if (!recipe) return { ok: false, reason: '没有这个配方' };
        let next = Object.assign({}, inv);
        for (const kind of Object.keys(recipe.inputs)) {
            if ((next[kind] || 0) < recipe.inputs[kind]) return { ok: false, reason: '材料不够' };
        }
        for (const kind of Object.keys(recipe.inputs)) next[kind] -= recipe.inputs[kind];
        for (const kind of Object.keys(recipe.outputs)) {
            next[kind] = (next[kind] || 0) + recipe.outputs[kind];
        }
        return { ok: true, inventory: next };
    }

    function smelt(inv, outId) {
        const recipe = SMELT_RECIPES.filter(function (r) { return r.id === outId; })[0] || null;
        if (!recipe) return { ok: false, reason: '熔炉做不了这个' };
        let next = Object.assign({}, inv);
        for (const kind of Object.keys(recipe.inputs)) {
            if ((next[kind] || 0) < recipe.inputs[kind]) return { ok: false, reason: '材料不够' };
        }
        for (const kind of Object.keys(recipe.inputs)) next[kind] -= recipe.inputs[kind];
        next[outId] = (next[outId] || 0) + recipe.outputs[outId];
        return { ok: true, inventory: next };
    }

    /** 任务判定（与 quests.js 的 8 种 type 一一对应） */
    function questValue(quest, stats) {
        if (!quest) return 0;
        const s = stats || {};
        switch (quest.type) {
            case 'build': return (s.placedThis && s.placedThis[quest.block || 'grass']) || 0;
            case 'collect': return (s.collectedThis && s.collectedThis[quest.block || 'crystal']) || 0;
            case 'collect_total': return s.crystalsTotal || 0;
            case 'blocks_alive': return s.blocksAlive || 0;
            case 'build_total': return s.buildTotal || 0;
            case 'build_total_block': return (s.buildTotalByKind && s.buildTotalByKind[quest.block || 'grass']) || 0;
            case 'build_any': return s.placedAnyThis || 0;
            case 'blueprint': return blueprintCoverage(s.world, quest.blueprint);
            default: return 0;
        }
    }

    function isQuestComplete(quest, stats) {
        if (!quest) return false;
        return questValue(quest, stats) >= (quest.need || 1);
    }

    /** 蓝图锚点：贴着对应列的地表上空（地形下移后固定 y 会飘出镜头视野） */
    function blueprintAnchor(world, name) {
        const spec = BLUEPRINTS[name];
        if (!spec || !world) return null;
        const y = Math.max(2, surfaceOf(world, spec.x) - spec.pattern.length - 1);
        return { x: spec.x, y: y };
    }

    function blueprintCoverage(world, name) {
        const spec = BLUEPRINTS[name];
        const anchor = blueprintAnchor(world, name);
        if (!spec || !anchor) return 0;
        let need = 0;
        let hit = 0;
        spec.pattern.forEach(function (line, row) {
            String(line).split('').forEach(function (ch, col) {
                if (ch === '.') return;
                need += 1;
                const kind = { w: 'wood', p: 'plank', s: 'stone' }[ch];
                if (getCell(world, anchor.x + col, anchor.y + row) === kind) hit += 1;
            });
        });
        return need === 0 ? 0 : Math.round((hit / need) * 100);
    }

    function minerRank(questsDone, ranks) {
        const n = (Array.isArray(questsDone) ? questsDone : []).length;
        let rank = 1;
        (ranks || []).forEach(function (r) {
            if (n >= r.needQuests) rank = Math.max(rank, r.rank);
        });
        return rank;
    }

    /** 旧横版存档兼容：clearedLevels 数量映射为前 N 个生涯任务（任务包接口 3.2「只读不写」） */
    function legacyQuestsDone(clearedLevels, questsList) {
        const cleared = Array.isArray(clearedLevels) ? clearedLevels.length : 0;
        const list = Array.isArray(questsList) ? questsList : [];
        const n = Math.min(cleared, list.length);
        return list.slice(0, n).map(function (q) { return q.id; });
    }

    function cloneWorld(world) {
        return {
            cols: world.cols, rows: world.rows, seed: world.seed, biome: world.biome || 'meadow', mapId: world.mapId || world.biome || 'meadow',
            surface: world.surface.slice(),
            grid: world.grid.map(function (row) { return row.slice(); }),
            theme: world.theme ? Object.assign({}, world.theme) : undefined,
            decorations: Array.isArray(world.decorations) ? world.decorations.map(function (row) { return Object.assign({}, row); }) : []
        };
    }

    function serialize(world, inventory, player, slots) {
        return {
            cols: world.cols, rows: world.rows, seed: world.seed, biome: world.biome || 'meadow', mapId: world.mapId || world.biome || 'meadow',
            surface: world.surface,
            grid: world.grid.map(function (row) { return row.join(','); }),
            theme: world.theme || null,
            decorations: Array.isArray(world.decorations) ? world.decorations : [],
            inventory: inventory || emptyInv(),
            slots: Array.isArray(slots) ? slots : slotsFromCounts(inventory || emptyInv()),
            player: player || spawnCell(world)
        };
    }

    function deserialize(snap) {
        if (!snap || !Array.isArray(snap.grid)) return null;
        const inventory = snap.inventory || emptyInv();
        return {
            world: {
                cols: snap.cols, rows: snap.rows, seed: snap.seed,
                biome: snap.biome || snap.mapId || 'meadow', mapId: snap.mapId || snap.biome || 'meadow',
                surface: snap.surface,
                grid: snap.grid.map(function (row) { return String(row).split(','); }),
                theme: snap.theme || null,
                decorations: Array.isArray(snap.decorations) ? snap.decorations : []
            },
            inventory: inventory,
            slots: Array.isArray(snap.slots) ? snap.slots : slotsFromCounts(inventory),
            player: snap.player || { x: 3, y: 8 }
        };
    }

    const RANK_REWARDS = {
        2: [{ kind: 'plank', n: 8 }],
        3: [{ kind: 'stone', n: 8 }, { kind: 'torch', n: 2 }],
        4: [{ kind: 'crystal', n: 1 }, { kind: 'torch', n: 4 }],
        5: [{ kind: 'blueprint', n: 1 }]
    };

    function rankRewardPack(rank) {
        return (RANK_REWARDS[rank] || []).map(function (item) { return { kind: item.kind, n: item.n }; });
    }

    function claimKey(rank) { return 'rank-' + rank; }

    function claimRankReward(inventory, claimed, rank) {
        const key = claimKey(rank);
        const nextClaimed = Array.isArray(claimed) ? claimed.slice() : [];
        if (nextClaimed.indexOf(key) !== -1) {
            return { ok: false, reason: 'already', inventory: inventory, claimed: nextClaimed, pack: [] };
        }
        const pack = rankRewardPack(rank);
        let inv = inventory || emptyInv();
        pack.forEach(function (item) {
            if (item.kind === 'blueprint') return;
            inv = addToInventory(inv, item.kind, item.n);
        });
        nextClaimed.push(key);
        return { ok: true, inventory: inv, claimed: nextClaimed, pack: pack };
    }

    function pendingRankRewards(currentRank, claimed) {
        const have = Array.isArray(claimed) ? claimed : [];
        const pending = [];
        for (let r = 2; r <= currentRank; r += 1) {
            if (have.indexOf(claimKey(r)) === -1 && RANK_REWARDS[r]) pending.push(r);
        }
        return pending;
    }

    function claimPendingRankRewards(inventory, claimed, currentRank) {
        let inv = inventory || emptyInv();
        let next = Array.isArray(claimed) ? claimed.slice() : [];
        pendingRankRewards(currentRank, next).forEach(function (r) {
            const res = claimRankReward(inv, next, r);
            inv = res.inventory;
            next = res.claimed;
        });
        return { inventory: inv, claimed: next };
    }

    function makeHomeSnapshot(world, date) {
        return {
            date: date || '',
            cols: world.cols, rows: world.rows,
            grid: world.grid.map(function (row) {
                return row.map(function (kind) { return KIND_CODE[kind] || '.'; }).join('');
            })
        };
    }

    global.VoxelCraftWorld = {
        COLS: COLS, ROWS: ROWS, DEEP_ZONE: DEEP_ZONE,
        KINDS: KINDS, KIND_LABEL: KIND_LABEL, TOOL_MINE: TOOL_MINE, TOOL_FAST: TOOL_FAST, KIND_RANK: KIND_RANK,
        BREAK_TIME: BREAK_TIME, RECIPES: RECIPES, GRID_RECIPES: GRID_RECIPES, matchCraftGrid: matchCraftGrid,
        SMELT_RECIPES: SMELT_RECIPES, FUELS: FUELS,
        BLUEPRINTS: BLUEPRINTS,
        INV_SLOT_COUNT: INV_SLOT_COUNT, HOTBAR_COUNT: HOTBAR_COUNT, ITEM_ICONS: ITEM_ICONS,
        itemIcon: itemIcon, makeSlots: makeSlots, addToSlots: addToSlots, moveSlot: moveSlot,
        takeFromSlot: takeFromSlot, countsFromSlots: countsFromSlots, slotsFromCounts: slotsFromCounts,
        createWorld: createWorld, createMapWorld: createMapWorld, canEnterCave: canEnterCave,
        lookOf: lookOf,
        getCell: getCell, setCell: setCell, surfaceOf: surfaceOf,
        findKind: findKind, lightAt: lightAt,
        countKind: countKind, isPassable: isPassable, isSolid: isSolid,
        spawnCell: spawnCell, isVoid: isVoid, cloneWorld: cloneWorld,
        canBreak: canBreak, breakReason: breakReason, breakTime: breakTime,
        breakBlock: breakBlock, placeBlock: placeBlock,
        emptyInv: emptyInv, addToInventory: addToInventory, consumeFromInventory: consumeFromInventory,
        craft: craft, smelt: smelt,
        questValue: questValue, isQuestComplete: isQuestComplete,
        blueprintAnchor: blueprintAnchor, blueprintCoverage: blueprintCoverage, minerRank: minerRank, legacyQuestsDone: legacyQuestsDone,
        serialize: serialize, deserialize: deserialize, makeHomeSnapshot: makeHomeSnapshot,
        RANK_REWARDS: RANK_REWARDS, rankRewardPack: rankRewardPack,
        claimRankReward: claimRankReward, pendingRankRewards: pendingRankRewards,
        claimPendingRankRewards: claimPendingRankRewards
    };
}(typeof window !== 'undefined' ? window : globalThis));
