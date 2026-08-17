/**
 * blocklegend · 合成纯函数
 * 默认 3×3 合成台，配方可一键或按格子匹配。不读写 DOM。
 */
(function (global) {
    'use strict';

    const ITEM_NAME = {
        'oak-log': '原木', plank: '木板', stick: '木棍', table: '合成台', cobble: '圆石',
        dirt: '泥土', coal: '煤炭', string: '线', gold: '金粒', gold_ingot: '金锭', diamond: '钻石',
        iron_ore: '铁矿', iron_ingot: '铁锭',
        wood_sword: '木剑', wood_pick: '木镐', wood_axe: '木斧', wood_shovel: '木铲',
        wood_bow: '木弓', wood_shield: '木盾', arrow: '箭',
        stone_sword: '石剑', stone_pick: '石镐', stone_axe: '石斧', stone_shovel: '石铲',
        iron_sword: '铁剑', iron_pick: '铁镐', iron_axe: '铁斧', iron_shovel: '铁铲',
        gold_sword: '金剑', gold_pick: '金镐', gold_axe: '金斧', gold_shovel: '金铲',
        diamond_sword: '钻石剑', diamond_pick: '钻石镐', diamond_axe: '钻石斧', diamond_shovel: '钻石铲',
        torch: '火把', chest: '箱子', furnace: '熔炉', door: '木门',
        fence: '栅栏', ladder: '梯子', bowl: '碗', boat: '船',
        shears: '剪刀', fishing_rod: '钓竿', bucket: '桶'
    };

    const RECIPES = [
        { id: 'plank', name: '橡木板', zh: '1 原木 → 4 木板', inputs: { 'oak-log': 1 }, outputs: { plank: 4 }, grid: 2, shapeless: ['oak-log'] },
        { id: 'stick', name: '木棍', zh: '2 木板 → 4 木棍', inputs: { plank: 2 }, outputs: { stick: 4 }, grid: 2, shape: [1, 2], cells: ['plank', 'plank'] },
        { id: 'table', name: '合成台', zh: '4 木板 → 1 合成台', inputs: { plank: 4 }, outputs: { table: 1 }, grid: 2, shape: [2, 2], cells: ['plank', 'plank', 'plank', 'plank'] },
        { id: 'torch', name: '火把', zh: '1 煤炭 + 1 木棍 → 4 火把', inputs: { coal: 1, stick: 1 }, outputs: { torch: 4 }, grid: 2, shape: [1, 2], cells: ['coal', 'stick'] },
        { id: 'wood_sword', name: '木剑', zh: '2 木板 + 1 木棍', inputs: { plank: 2, stick: 1 }, outputs: { wood_sword: 1 }, grid: 3, shape: [1, 3], cells: ['plank', 'plank', 'stick'] },
        { id: 'wood_pick', name: '木镐', zh: '3 木板 + 2 木棍', inputs: { plank: 3, stick: 2 }, outputs: { wood_pick: 1 }, grid: 3, shape: [3, 3], cells: ['plank', 'plank', 'plank', null, 'stick', null, null, 'stick', null] },
        { id: 'wood_axe', name: '木斧', zh: '3 木板 + 2 木棍', inputs: { plank: 3, stick: 2 }, outputs: { wood_axe: 1 }, grid: 3, shape: [2, 3], cells: ['plank', 'plank', 'plank', 'stick', null, 'stick'] },
        { id: 'wood_shovel', name: '木铲', zh: '1 木板 + 2 木棍', inputs: { plank: 1, stick: 2 }, outputs: { wood_shovel: 1 }, grid: 3, shape: [1, 3], cells: ['plank', 'stick', 'stick'] },
        { id: 'wood_bow', name: '木弓', zh: '3 木棍 + 2 木板', inputs: { stick: 3, plank: 2 }, outputs: { wood_bow: 1 }, grid: 3, shape: [3, 3], cells: [null, 'stick', null, 'plank', null, 'plank', null, 'stick', 'stick'] },
        { id: 'arrow', name: '箭', zh: '1 木棍 + 1 圆石 → 4 箭', inputs: { stick: 1, cobble: 1 }, outputs: { arrow: 4 }, grid: 3, shapeless: ['stick', 'cobble'] },
        { id: 'wood_shield', name: '木盾', zh: '6 木板', inputs: { plank: 6 }, outputs: { wood_shield: 1 }, grid: 3, shape: [3, 3], cells: ['plank', 'plank', 'plank', 'plank', 'plank', 'plank', null, null, null] },
        { id: 'stone_sword', name: '石剑', zh: '2 圆石 + 1 木棍', inputs: { cobble: 2, stick: 1 }, outputs: { stone_sword: 1 }, grid: 3, shape: [1, 3], cells: ['cobble', 'cobble', 'stick'] },
        { id: 'stone_pick', name: '石镐', zh: '3 圆石 + 2 木棍', inputs: { cobble: 3, stick: 2 }, outputs: { stone_pick: 1 }, grid: 3, shape: [3, 3], cells: ['cobble', 'cobble', 'cobble', null, 'stick', null, null, 'stick', null] },
        { id: 'stone_axe', name: '石斧', zh: '3 圆石 + 2 木棍', inputs: { cobble: 3, stick: 2 }, outputs: { stone_axe: 1 }, grid: 3, shape: [2, 3], cells: ['cobble', 'cobble', 'cobble', 'stick', null, 'stick'] },
        { id: 'stone_shovel', name: '石铲', zh: '1 圆石 + 2 木棍', inputs: { cobble: 1, stick: 2 }, outputs: { stone_shovel: 1 }, grid: 3, shape: [1, 3], cells: ['cobble', 'stick', 'stick'] },
        { id: 'iron_sword', name: '铁剑', zh: '2 铁锭 + 1 木棍', inputs: { iron_ingot: 2, stick: 1 }, outputs: { iron_sword: 1 }, grid: 3, shape: [1, 3], cells: ['iron_ingot', 'iron_ingot', 'stick'] },
        { id: 'iron_pick', name: '铁镐', zh: '3 铁锭 + 2 木棍', inputs: { iron_ingot: 3, stick: 2 }, outputs: { iron_pick: 1 }, grid: 3, shape: [3, 3], cells: ['iron_ingot', 'iron_ingot', 'iron_ingot', null, 'stick', null, null, 'stick', null] },
        { id: 'iron_axe', name: '铁斧', zh: '3 铁锭 + 2 木棍', inputs: { iron_ingot: 3, stick: 2 }, outputs: { iron_axe: 1 }, grid: 3, shape: [2, 3], cells: ['iron_ingot', 'iron_ingot', 'iron_ingot', 'stick', null, 'stick'] },
        { id: 'iron_shovel', name: '铁铲', zh: '1 铁锭 + 2 木棍', inputs: { iron_ingot: 1, stick: 2 }, outputs: { iron_shovel: 1 }, grid: 3, shape: [1, 3], cells: ['iron_ingot', 'stick', 'stick'] },
        { id: 'gold_sword', name: '金剑', zh: '2 金锭 + 1 木棍', inputs: { gold_ingot: 2, stick: 1 }, outputs: { gold_sword: 1 }, grid: 3, shape: [1, 3], cells: ['gold_ingot', 'gold_ingot', 'stick'] },
        { id: 'gold_pick', name: '金镐', zh: '3 金锭 + 2 木棍', inputs: { gold_ingot: 3, stick: 2 }, outputs: { gold_pick: 1 }, grid: 3, shape: [3, 3], cells: ['gold_ingot', 'gold_ingot', 'gold_ingot', null, 'stick', null, null, 'stick', null] },
        { id: 'gold_axe', name: '金斧', zh: '3 金锭 + 2 木棍', inputs: { gold_ingot: 3, stick: 2 }, outputs: { gold_axe: 1 }, grid: 3, shape: [2, 3], cells: ['gold_ingot', 'gold_ingot', 'gold_ingot', 'stick', null, 'stick'] },
        { id: 'gold_shovel', name: '金铲', zh: '1 金锭 + 2 木棍', inputs: { gold_ingot: 1, stick: 2 }, outputs: { gold_shovel: 1 }, grid: 3, shape: [1, 3], cells: ['gold_ingot', 'stick', 'stick'] },
        { id: 'diamond_sword', name: '钻石剑', zh: '2 钻石 + 1 木棍', inputs: { diamond: 2, stick: 1 }, outputs: { diamond_sword: 1 }, grid: 3, shape: [1, 3], cells: ['diamond', 'diamond', 'stick'] },
        { id: 'diamond_pick', name: '钻石镐', zh: '3 钻石 + 2 木棍', inputs: { diamond: 3, stick: 2 }, outputs: { diamond_pick: 1 }, grid: 3, shape: [3, 3], cells: ['diamond', 'diamond', 'diamond', null, 'stick', null, null, 'stick', null] },
        { id: 'diamond_axe', name: '钻石斧', zh: '3 钻石 + 2 木棍', inputs: { diamond: 3, stick: 2 }, outputs: { diamond_axe: 1 }, grid: 3, shape: [2, 3], cells: ['diamond', 'diamond', 'diamond', 'stick', null, 'stick'] },
        { id: 'diamond_shovel', name: '钻石铲', zh: '1 钻石 + 2 木棍', inputs: { diamond: 1, stick: 2 }, outputs: { diamond_shovel: 1 }, grid: 3, shape: [1, 3], cells: ['diamond', 'stick', 'stick'] },
        { id: 'chest', name: '箱子', zh: '8 木板', inputs: { plank: 8 }, outputs: { chest: 1 }, grid: 3, shape: [3, 3], cells: ['plank', 'plank', 'plank', 'plank', null, 'plank', 'plank', 'plank', 'plank'], keepOnDeath: true },
        { id: 'furnace', name: '熔炉', zh: '8 圆石', inputs: { cobble: 8 }, outputs: { furnace: 1 }, grid: 3, shape: [3, 3], cells: ['cobble', 'cobble', 'cobble', 'cobble', null, 'cobble', 'cobble', 'cobble', 'cobble'] },
        { id: 'door', name: '木门', zh: '6 木板', inputs: { plank: 6 }, outputs: { door: 1 }, grid: 3, shape: [2, 3], cells: ['plank', 'plank', 'plank', 'plank', 'plank', 'plank'] },
        { id: 'fence', name: '栅栏', zh: '4 木板 + 2 木棍 → 2', inputs: { plank: 4, stick: 2 }, outputs: { fence: 2 }, grid: 3, shape: [3, 2], cells: ['plank', 'stick', 'plank', 'plank', 'stick', 'plank'] },
        { id: 'ladder', name: '梯子', zh: '7 木棍 → 3', inputs: { stick: 7 }, outputs: { ladder: 3 }, grid: 3, shape: [3, 3], cells: ['stick', null, 'stick', 'stick', 'stick', 'stick', 'stick', null, 'stick'] },
        { id: 'bowl', name: '碗', zh: '3 木板', inputs: { plank: 3 }, outputs: { bowl: 1 }, grid: 3, shape: [3, 2], cells: ['plank', null, 'plank', null, 'plank', null] },
        { id: 'boat', name: '船', zh: '5 木板', inputs: { plank: 5 }, outputs: { boat: 1 }, grid: 3, shape: [3, 2], cells: ['plank', null, 'plank', 'plank', 'plank', 'plank'] },
        { id: 'shears', name: '剪刀', zh: '2 铁锭', inputs: { iron_ingot: 2 }, outputs: { shears: 1 }, grid: 3, shape: [2, 2], cells: [null, 'iron_ingot', 'iron_ingot', null] },
        { id: 'bucket', name: '桶', zh: '3 铁锭', inputs: { iron_ingot: 3 }, outputs: { bucket: 1 }, grid: 3, shape: [3, 2], cells: ['iron_ingot', null, 'iron_ingot', null, 'iron_ingot', null] },
        { id: 'fishing_rod', name: '钓竿', zh: '3 木棍 + 2 线', inputs: { stick: 3, string: 2 }, outputs: { fishing_rod: 1 }, grid: 3, shape: [3, 3], cells: [null, null, 'stick', null, 'stick', 'string', 'stick', null, 'string'] }
    ];

    const HIDDEN = { bowl: true, boat: true, shears: true, bucket: true, fishing_rod: true };

    function isOffered(id) {
        return !HIDDEN[id];
    }

    function keepsBagOnDeath(bag) {
        return countOf(bag, 'chest') > 0;
    }

    function recipeOf(id) {
        for (let i = 0; i < RECIPES.length; i += 1) {
            if (RECIPES[i].id === id) return RECIPES[i];
        }
        return null;
    }

    function countOf(bag, kind) {
        return Number(bag && bag[kind]) || 0;
    }

    function itemName(id) {
        return ITEM_NAME[id] || id;
    }

    const ITEM_ICON = {
        'oak-log': 'log', plank: 'plank', stick: 'stick', table: 'table',
        cobble: 'cobble', dirt: 'dirt', coal: 'coal', string: 'string',
        gold: 'gold', gold_ingot: 'gold-ingot', diamond: 'diamond',
        iron_ore: 'iron-ore', iron_ingot: 'ingot',
        wood_sword: 'sword-wood', stone_sword: 'sword-stone', iron_sword: 'sword-iron',
        gold_sword: 'sword-gold', diamond_sword: 'sword-diamond',
        wood_pick: 'pick-wood', stone_pick: 'pick-stone', iron_pick: 'pick-iron',
        gold_pick: 'pick-gold', diamond_pick: 'pick-diamond',
        wood_axe: 'axe-wood', stone_axe: 'axe-stone', iron_axe: 'axe-iron',
        gold_axe: 'axe-gold', diamond_axe: 'axe-diamond',
        wood_shovel: 'shovel-wood', stone_shovel: 'shovel-stone',
        iron_shovel: 'shovel-iron', gold_shovel: 'shovel-gold', diamond_shovel: 'shovel-diamond',
        wood_bow: 'bow', wood_shield: 'shield', arrow: 'arrow',
        torch: 'torch', chest: 'chest', furnace: 'furnace', door: 'door',
        fence: 'fence', ladder: 'ladder', bowl: 'bowl', boat: 'boat',
        shears: 'shears', fishing_rod: 'rod', bucket: 'bucket'
    };

    function itemIcon(id) {
        return ITEM_ICON[id] || 'unknown';
    }

    function itemArt(id) {
        const key = String(id || '');
        if (/sword/.test(key)) return './assets/ui/sword.png';
        if (/pick/.test(key)) return './assets/ui/pickaxe.png';
        if (/axe/.test(key)) return './assets/ui/axe.png';
        if (/shovel/.test(key)) return './assets/ui/shovel.png';
        if (key === 'wood_bow') return './assets/ui/bow.png';
        if (key === 'arrow') return './assets/ui/arrow.png';
        if (key === 'dirt') return './assets/atlas/dirt.png';
        if (key === 'cobble') return './assets/atlas/stone.png';
        if (key === 'oak-log') return './assets/atlas/oak_side.png';
        if (key === 'plank' || key === 'table') return './assets/atlas/oak_top.png';
        return '';
    }

    function recipesFor() {
        return RECIPES.filter(function (r) {
            return isOffered(r.id);
        });
    }

    function canCraft(bag, id) {
        const recipe = recipeOf(id);
        if (!recipe || !isOffered(id)) return false;
        const keys = Object.keys(recipe.inputs);
        for (let i = 0; i < keys.length; i += 1) {
            if (countOf(bag, keys[i]) < recipe.inputs[keys[i]]) return false;
        }
        return true;
    }

    function toolBonus(bag, toolId) {
        const bonus = { mine: 1, melee: 1 };
        if (toolId === 'pickaxe') {
            if (countOf(bag, 'wood_pick') > 0) bonus.mine = 1.4;
            if (countOf(bag, 'stone_pick') > 0) bonus.mine = 1.55;
            if (countOf(bag, 'gold_pick') > 0) bonus.mine = 1.68;
            if (countOf(bag, 'iron_pick') > 0) bonus.mine = 1.75;
            if (countOf(bag, 'diamond_pick') > 0 || countOf(bag, 'diamond_pickaxe') > 0) bonus.mine = 2;
        }
        if (toolId === 'axe') {
            if (countOf(bag, 'wood_axe') > 0) bonus.mine = 1.35;
            if (countOf(bag, 'stone_axe') > 0) bonus.mine = 1.5;
            if (countOf(bag, 'gold_axe') > 0) bonus.mine = 1.62;
            if (countOf(bag, 'iron_axe') > 0) bonus.mine = 1.7;
            if (countOf(bag, 'diamond_axe') > 0) bonus.mine = 1.95;
        }
        if (toolId === 'shovel') {
            if (countOf(bag, 'wood_shovel') > 0) bonus.mine = 1.35;
            if (countOf(bag, 'stone_shovel') > 0) bonus.mine = 1.5;
            if (countOf(bag, 'gold_shovel') > 0) bonus.mine = 1.62;
            if (countOf(bag, 'iron_shovel') > 0) bonus.mine = 1.7;
            if (countOf(bag, 'diamond_shovel') > 0) bonus.mine = 1.95;
        }
        if (toolId === 'sword') {
            if (countOf(bag, 'wood_sword') > 0) bonus.melee = 1.3;
            if (countOf(bag, 'gold_sword') > 0) bonus.melee = 1.36;
            if (countOf(bag, 'stone_sword') > 0) bonus.melee = 1.42;
            if (countOf(bag, 'iron_sword') > 0) bonus.melee = 1.55;
            if (countOf(bag, 'diamond_sword') > 0) bonus.melee = 1.75;
        }
        if (countOf(bag, 'wood_bow') > 0) bonus.bolt = 1.25;
        if (countOf(bag, 'wood_shield') > 0) bonus.def = 1;
        return bonus;
    }

    function craft(bag, id, opts) {
        const recipe = recipeOf(id);
        if (!recipe) return { ok: false, bag: Object.assign({}, bag || {}), reason: '没有这个配方' };
        if (!canCraft(bag, id, opts)) return { ok: false, bag: Object.assign({}, bag || {}), reason: '材料不够' };
        const next = Object.assign({}, bag || {});
        Object.keys(recipe.inputs).forEach(function (k) {
            next[k] = countOf(next, k) - recipe.inputs[k];
            if (next[k] < 0) next[k] = 0;
        });
        Object.keys(recipe.outputs).forEach(function (k) {
            next[k] = countOf(next, k) + recipe.outputs[k];
        });
        return { ok: true, bag: next, recipe: recipe };
    }

    function cellAt(cells, size, x, y) {
        return cells[y * size + x] || null;
    }

    function matchShaped(view, size, recipe) {
        const w = recipe.shape[0], h = recipe.shape[1];
        if (w > size || h > size) return null;
        for (let yoff = 0; yoff <= size - h; yoff += 1) {
            for (let xoff = 0; xoff <= size - w; xoff += 1) {
                let ok = true;
                for (let y = 0; y < size && ok; y += 1) {
                    for (let x = 0; x < size && ok; x += 1) {
                        const inPat = x >= xoff && x < xoff + w && y >= yoff && y < yoff + h;
                        const want = inPat ? (recipe.cells[(y - yoff) * w + (x - xoff)] || null) : null;
                        if ((view[y * size + x] || null) !== want) ok = false;
                    }
                }
                if (ok) return { recipe: recipe, xoff: xoff, yoff: yoff };
            }
        }
        return null;
    }

    function matchShapeless(view, recipe) {
        const need = (recipe.shapeless || []).slice().sort();
        const have = view.filter(function (k) { return k; }).sort();
        if (need.length && need.length === have.length && need.every(function (k, i) { return k === have[i]; })) {
            return { recipe: recipe, xoff: 0, yoff: 0 };
        }
        return null;
    }

    function matchGrid(cells, size) {
        const n = size * size;
        if (!Array.isArray(cells)) return null;
        const view = [];
        for (let i = 0; i < n; i += 1) view.push(cells[i] || null);
        let found = null;
        for (let i = 0; i < RECIPES.length; i += 1) {
            const r = RECIPES[i];
            if (!isOffered(r.id)) continue;
            if ((r.grid || 2) > size) continue;
            const hit = r.shape ? matchShaped(view, size, r) : (r.shapeless ? matchShapeless(view, r) : null);
            if (!hit) continue;
            if (!found || (r.shape && !found.recipe.shape)) found = hit;
        }
        return found;
    }

    function consumeGrid(cells, size, hit) {
        const next = cells.slice();
        const r = hit.recipe;
        if (r.shape) {
            const w = r.shape[0], h = r.shape[1];
            for (let y = 0; y < h; y += 1) {
                for (let x = 0; x < w; x += 1) {
                    if (r.cells[y * w + x]) next[(hit.yoff + y) * size + (hit.xoff + x)] = null;
                }
            }
            return next;
        }
        const need = (r.shapeless || []).slice();
        for (let i = 0; i < next.length; i += 1) {
            const idx = need.indexOf(next[i]);
            if (idx >= 0) {
                need.splice(idx, 1);
                next[i] = null;
            }
        }
        return next;
    }

    function emptyGrid(size) {
        const n = (size || 3) * (size || 3);
        const cells = [];
        for (let i = 0; i < 9; i += 1) cells.push(i < n ? null : null);
        return cells;
    }

    function dumpGrid(bag, cells) {
        const next = Object.assign({}, bag || {});
        (cells || []).forEach(function (k) {
            if (!k) return;
            next[k] = countOf(next, k) + 1;
        });
        return next;
    }

    const SMELTS = {
        iron_ingot: { inputs: { iron_ore: 1, coal: 1 }, outputs: { iron_ingot: 1 } },
        gold_ingot: { inputs: { gold: 1, coal: 1 }, outputs: { gold_ingot: 1 } }
    };

    function smelt(bag, id) {
        const recipe = SMELTS[id];
        const copy = Object.assign({}, bag || {});
        if (!recipe) return { ok: false, bag: copy, reason: '没有这个熔炼' };
        const keys = Object.keys(recipe.inputs);
        for (let i = 0; i < keys.length; i += 1) {
            if (countOf(copy, keys[i]) < recipe.inputs[keys[i]]) {
                return { ok: false, bag: copy, reason: '材料不够' };
            }
        }
        const next = Object.assign({}, copy);
        keys.forEach(function (k) {
            next[k] = countOf(next, k) - recipe.inputs[k];
            if (next[k] < 0) next[k] = 0;
        });
        Object.keys(recipe.outputs).forEach(function (k) {
            next[k] = countOf(next, k) + recipe.outputs[k];
        });
        return { ok: true, bag: next, recipe: recipe };
    }

    global.BlockLegendCraft = {
        RECIPES: RECIPES,
        ITEM_NAME: ITEM_NAME,
        SMELTS: SMELTS,
        isOffered: isOffered,
        keepsBagOnDeath: keepsBagOnDeath,
        recipeOf: recipeOf,
        recipesFor: recipesFor,
        canCraft: canCraft,
        toolBonus: toolBonus,
        craft: craft,
        smelt: smelt,
        itemName: itemName,
        itemIcon: itemIcon,
        itemArt: itemArt,
        ITEM_ICON: ITEM_ICON,
        matchGrid: matchGrid,
        consumeGrid: consumeGrid,
        emptyGrid: emptyGrid,
        dumpGrid: dumpGrid
    };
}(typeof window !== 'undefined' ? window : globalThis));
