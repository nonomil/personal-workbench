/**
 * 方块工作台 · 对照小孩哥 Nick's Workshop 的模块：今日/学习/家务/小卖部/世界/背包/家长锁。
 * 阳光当 XP，库存写回 voxel-adventure 进度。不拷官方贴图。
 */
(function (global) {
    'use strict';

    const GAME_ID = 'voxel-adventure';
    const THEME = '../assets/generated/preschool-theme-assets/voxel-v1/published/';
    const SHOP = [
        { id: 'wood', name: '橡木', nameEn: 'Oak', desc: '基础建筑材料', cost: 10, kind: 'wood', icon: 'voxel-wood-block.png' },
        { id: 'grass', name: '草方块', nameEn: 'Grass Block', desc: '铺路和种树', cost: 8, kind: 'grass', icon: 'voxel-grass-block.png' },
        { id: 'sand', name: '沙子', nameEn: 'Sand', desc: '柔软的方块', cost: 8, kind: 'sand', icon: '' },
        { id: 'dirt', name: '泥土', nameEn: 'Dirt', desc: '到处都能用', cost: 6, kind: 'dirt', icon: 'voxel-dirt-block.png' },
        { id: 'stone', name: '石头', nameEn: 'Stone', desc: '坚硬的地基', cost: 12, kind: 'stone', icon: 'voxel-stone-block.png' },
        { id: 'coal', name: '煤炭', nameEn: 'Coal', desc: '发光的燃料', cost: 15, kind: 'coal', icon: '' },
        { id: 'crystal', name: '晶体', nameEn: 'Crystal', desc: '闪亮的矿石', cost: 20, kind: 'crystal', icon: 'voxel-purple-crystal.png' },
        { id: 'water', name: '水', nameEn: 'Water', desc: '可以铺成水塘', cost: 8, kind: 'water', icon: 'voxel-water-channel.png' }
    ];
    const EMPTY = { grass: 0, dirt: 0, wood: 0, leaf: 0, plank: 0, stone: 0, sand: 0, water: 0, coal: 0, crystal: 0, stick: 0, wood_pick: 0, stone_pick: 0 };
    const KIND_LABEL = {
        grass: '草', dirt: '土', wood: '木', leaf: '叶', plank: '板', stone: '石', sand: '沙', water: '水',
        coal: '煤', crystal: '晶', stick: '棍', wood_pick: '木镐', stone_pick: '石镐'
    };
    const TABS = [
        { id: 'home', label: '学习', labelEn: 'Study', icon: 'book' },
        { id: 'life', label: '生活', labelEn: 'Life', icon: 'life' },
        { id: 'chores', label: '家务', labelEn: 'Chores', icon: 'chore' },
        { id: 'shop', label: '小卖部', labelEn: 'Shop', icon: 'cart' },
        { id: 'world', label: '世界', labelEn: 'World', icon: 'grass' },
        { id: 'pack', label: '背包', labelEn: 'Pack', icon: 'pack' },
        { id: 'other', label: '其他', labelEn: 'Other', icon: 'clock' }
    ];

    const api = {
        tab: 'home',
        SHOP: SHOP
    };

    function bridge() {
        return global.WorkbenchGameBridge;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function progress() {
        const b = bridge();
        const pack = b && b.getProgress ? b.getProgress(GAME_ID) : { progress: {} };
        const p = pack.progress || {};
        if (!p.inventory || typeof p.inventory !== 'object') p.inventory = {};
        return p;
    }

    function saveProgress(next) {
        const b = bridge();
        if (b && b.saveProgress) b.saveProgress(GAME_ID, next);
    }

    function inventory() {
        return Object.assign({}, EMPTY, progress().inventory || {});
    }

    function bagCount(inv) {
        const bag = inv || inventory();
        return Object.keys(EMPTY).reduce(function (sum, key) {
            return sum + (Number(bag[key]) || 0);
        }, 0);
    }

    function isLocked() {
        return !!progress().parentLock;
    }

    function xp() {
        const b = bridge();
        const w = b && b.getWallet ? b.getWallet() : { sunlight: 0 };
        return Math.max(0, Number(w.sunlight) || 0);
    }

    function level() {
        const p = progress();
        const n = Array.isArray(p.questsDone) ? p.questsDone.length : 0;
        return Math.max(1, Number(p.rank) || Math.min(5, 1 + Math.floor(n / 2)));
    }

    /* MC 贴图优先（assets/mc，源自 cheyao/2d-minecraft，zlib）；无贴图的 kind 走原创像素图 */
    const MC_TEX = {
        grass: 'mc/blocks/grass-block.png',
        dirt: 'mc/blocks/dirt.png',
        stone: 'mc/blocks/stone.png',
        wood: 'mc/blocks/oak-log.png',
        leaf: 'mc/blocks/oak-leaves.png',
        plank: 'mc/blocks/oak-planks.png',
        coal: 'mc/blocks/coal-ore.png',
        crystal: 'mc/blocks/diamond-ore.png',
        wood_pick: 'mc/items/wooden-pickaxe.png',
        stone_pick: 'mc/items/stone-pickaxe.png',
        stick: 'mc/items/stick.png'
    };

    function kindSrc(kind, size) {
        if (MC_TEX[kind]) return './assets/' + MC_TEX[kind];
        const tiles = global.VoxelPixelTiles;
        if (!tiles) return '';
        if (tiles.kindIcon) return tiles.kindIcon(kind, size || 48);
        if (tiles.tilePreviewDataUrl) return tiles.tilePreviewDataUrl(kind, size);
        if (tiles.iconPreviewDataUrl) return tiles.iconPreviewDataUrl(kind, size);
        return '';
    }

    function kindImg(kind, cls, size) {
        const src = kindSrc(kind, size);
        if (src) return '<img class="' + (cls || 'vw-pixel') + '" src="' + src + '" alt="">';
        return '<span class="vw-swatch"></span>';
    }

    function iconMarkup(name) {
        const key = name === 'grass' ? 'grass' : name;
        const src = kindSrc(key, 36);
        if (src) return '<img class="vw-rail-ico" src="' + src + '" alt="">';
        return '<span class="vw-ico">◆</span>';
    }

    function itemIcon(item) {
        return kindImg(item.kind || item.id, 'vw-pixel', 64);
    }

    function rail(active) {
        return '<nav class="vw-rail" aria-label="方块工作台">' + TABS.map(function (tab) {
            return '<button type="button" class="vw-rail-item' + (tab.id === active ? ' is-on' : '') +
                '" data-action="voxel-workshop-tab" data-tab="' + tab.id + '">' +
                iconMarkup(tab.icon) + '<span>' + tab.label + '</span></button>';
        }).join('') + '</nav>';
    }

    function headerBar() {
        const lv = level();
        const have = xp();
        const pct = Math.min(100, have % 100);
        return '<header class="vw-head">' +
            '<img class="vw-hero" src="../games/voxel-adventure/assets/hero/explorer-idle.png" alt="">' +
            '<div class="vw-title-block"><strong>方块工作台</strong><small>Block Workshop</small></div>' +
            '<span class="vw-lv">Lv.' + lv + '</span>' +
            '<div class="vw-xp" role="progressbar" aria-valuenow="' + have + '"><i style="width:' + pct + '%"></i></div>' +
            '<span class="vw-xp-label">阳光 ' + have + '</span>' +
            '</header>';
    }

    function footBar() {
        const locked = isLocked();
        return '<footer class="vw-foot">' +
            '<span class="vw-stat">' + kindImg('pack', 'vw-foot-ico', 28) + ' ' + bagCount() + '</span>' +
            '<span class="vw-stat">' + kindImg('crystal', 'vw-foot-ico', 28) + ' ' + xp() + '</span>' +
            '<button type="button" class="vw-lock-btn" data-action="voxel-parent-lock">' +
            kindImg('lock', 'vw-foot-ico', 28) + (locked ? '已锁' : '开锁') + '</button>' +
            '<span class="vw-lock-tip">家长锁</span>' +
            '</footer>';
    }

    function planCard(plan, tone) {
        const done = !!plan.done;
        return '<button type="button" class="vw-task ' + tone + (done ? ' is-done' : '') +
            '" data-action="toggle-plan" data-id="' + escapeHtml(plan.id) + '" data-date="' + escapeHtml(plan.date || '') + '">' +
            '<span class="vw-task-mark">' + (done ? '✓' : '') + '</span>' +
            '<span><strong>' + escapeHtml(plan.title || '今日任务') + '</strong>' +
            '<small>+10 XP</small></span></button>';
    }

    function renderHome(ctx) {
        const plans = (ctx && ctx.plans) || [];
        const core = plans.filter(function (p) { return p.required === true; });
        const optional = plans.filter(function (p) { return p.required !== true; });
        const alerts = plans.filter(function (p) { return !p.done; }).slice(0, 4);
        const study = (core.length ? core : plans).slice(0, 4);
        const chores = (optional.length ? optional : plans.slice().reverse()).slice(0, 4);
        const lv = level();
        return '<div class="vw-home">' +
            '<section class="vw-alerts"><h2>⚠️ 今天要处理 / Today\'s Alerts</h2><div class="vw-alerts-box">' +
            (alerts.length ? alerts.map(function (p) {
                return '<div class="vw-alert-row"><span class="vw-today">今日 TODAY</span>' + escapeHtml(p.title) + '</div>';
            }).join('') : '<div class="vw-alert-row"><span class="vw-today">今日 TODAY</span>今天的事都做完啦</div>') +
            '</div></section>' +
            '<section class="vw-block vw-study"><h2>📖 学习 / Study</h2><div class="vw-task-grid">' +
            (study.length ? study.map(function (p) { return planCard(p, 'green'); }).join('') :
                '<p class="vw-empty">去学习专区开始一课</p><button type="button" class="vw-buy" data-action="navigate" data-page="courses">打开学习</button>') +
            '</div></section>' +
            '<section class="vw-block vw-chore"><h2>家务 / Chores</h2><div class="vw-task-grid">' +
            (chores.length ? chores.map(function (p) { return planCard(p, 'brown'); }).join('') : '<p class="vw-empty">还没有家务卡片</p>') +
            '</div></section>' +
            '<section class="vw-block vw-rewards"><h2>工具柜 / Tools</h2><div class="vw-reward-grid">' +
            '<article class="vw-reward">' + kindImg('wood_pick', 'vw-tool-pic', 56) + '<strong>木镐</strong><small>挖石头和煤</small><em>' + (lv >= 1 ? '已解锁' : 'Lv.1') + '</em></article>' +
            '<article class="vw-reward">' + kindImg('stone_pick', 'vw-tool-pic', 56) + '<strong>石镐</strong><small>挖晶体</small><em>' + (lv >= 2 ? '已解锁' : 'Lv.2') + '</em></article>' +
            '<article class="vw-reward">' + kindImg('plank', 'vw-tool-pic', 56) + '<strong>橡木板</strong><small>合成材料</small><em>工作台</em></article>' +
            '</div></section></div>';
    }

    function recipeLine(parts) {
        return Object.keys(parts || {}).map(function (kind) {
            return (Number(parts[kind]) || 0) + KIND_LABEL[kind];
        }).join(' + ');
    }

    function recipeSlots(inputs) {
        const cells = [];
        Object.keys(inputs || {}).forEach(function (kind) {
            const n = Number(inputs[kind]) || 0;
            for (let i = 0; i < n && cells.length < 4; i += 1) {
                cells.push('<div class="vw-slot">' + kindImg(kind, 'vw-slot-ico', 32) + '</div>');
            }
        });
        while (cells.length < 4) cells.push('<div class="vw-slot is-empty"></div>');
        return '<div class="vw-craft-2x2">' + cells.join('') + '</div>';
    }

    function renderCraft(bag, locked) {
        const recipes = (global.VoxelWorld && global.VoxelWorld.RECIPES) || [];
        if (!recipes.length) {
            return '<section class="vw-craft"><h2>合成台 / Crafting Table</h2>' +
                '<p>合成台还没准备好。</p></section>';
        }
        return '<section class="vw-craft"><h2>合成台 / Crafting Table</h2>' +
            '<p>把左边材料合成右边的新东西。1 橡木 → 4 板 → 木棍 → 镐子。</p>' +
            '<div class="vw-recipe-grid">' + recipes.map(function (recipe) {
                const can = Object.keys(recipe.inputs || {}).every(function (kind) {
                    return (Number(bag[kind]) || 0) >= recipe.inputs[kind];
                });
                const outKind = Object.keys(recipe.outputs || {})[0] || recipe.id;
                return '<article class="vw-recipe">' +
                    recipeSlots(recipe.inputs) +
                    '<span class="vw-craft-arrow">→</span>' +
                    '<div class="vw-craft-out">' + kindImg(outKind, 'vw-out-ico', 48) +
                    '<strong>' + recipe.name + '</strong>' +
                    '<small>' + recipeLine(recipe.inputs) + ' → ' + recipeLine(recipe.outputs) + '</small></div>' +
                    '<button type="button" class="vw-buy" data-action="voxel-craft" data-recipe="' + recipe.id + '"' +
                    (locked || !can ? ' disabled' : '') + '>合成</button></article>';
            }).join('') + '</div></section>';
    }

    function renderShop() {
        const bag = inventory();
        const locked = isLocked();
        return '<div class="vw-shop"><h2>小卖部 / Shop</h2><div class="vw-shop-grid">' +
            SHOP.map(function (item) {
                const stock = Number(bag[item.kind]) || 0;
                return '<article class="vw-card">' +
                    '<div class="vw-card-icon">' + itemIcon(item) + '</div>' +
                    '<strong>' + item.name + '</strong><small>' + item.nameEn + '</small>' +
                    '<p>' + item.desc + '</p>' +
                    '<em>★ ' + item.cost + ' XP</em>' +
                    '<button type="button" class="vw-buy" data-action="voxel-buy" data-item="' + item.id + '"' +
                    (locked ? ' disabled' : '') + '>购买 Buy</button>' +
                    '<span class="vw-stock">库存: ' + stock + ' 个</span></article>';
            }).join('') +
            '</div>' + renderCraft(bag, locked) + '</div>';
    }

    function renderPack() {
        const bag = inventory();
        const kinds = Object.keys(EMPTY);
        const labels = KIND_LABEL;
        const cells = [];
        kinds.forEach(function (kind) {
            const n = Number(bag[kind]) || 0;
            if (!n) return;
            cells.push('<div class="vw-slot" title="' + labels[kind] + '">' + kindImg(kind, 'vw-slot-ico', 36) + '<b>' + n + '</b></div>');
        });
        while (cells.length < 36) cells.push('<div class="vw-slot is-empty"></div>');
        return '<div class="vw-pack"><h2>背包 / Inventory</h2><div class="vw-grid">' + cells.join('') +
            '</div><button type="button" class="vw-close" data-action="voxel-workshop-close">关闭 Close</button></div>';
    }

    function renderWorld() {
        return '<div class="vw-world-wrap"><iframe class="vw-world-frame" title="方块世界" src="../games/voxel-adventure/index.html?embed=1"></iframe></div>';
    }

    function renderOther() {
        const locked = isLocked();
        return '<div class="vw-other"><h2>其他 / Other</h2>' +
            '<p>家长锁打开后，小卖部和背包就不能再改。点一下底栏中间的锁即可开关。</p>' +
            '<p>当前：<strong>' + (locked ? '已上锁' : '未上锁') + '</strong></p>' +
            '<button type="button" class="vw-buy" data-action="voxel-parent-lock">' + (locked ? '解锁' : '上锁') + '</button>' +
            '<button type="button" class="vw-buy vw-buy-ghost" data-action="navigate" data-page="account">打开设置</button>' +
            '<button type="button" class="vw-buy vw-buy-ghost" data-action="navigate" data-page="family">家长互动</button>' +
            '</div>';
    }

    // 游戏内嵌面板:只保留方块专属模块(小卖部+合成台 / 背包 / 家长锁)
    const GAME_TABS = TABS.filter(function (tab) {
        return ['shop', 'pack', 'other'].indexOf(tab.id) !== -1;
    });

    api.renderGamePanel = function (tab) {
        const active = GAME_TABS.some(function (t) { return t.id === tab; }) ? tab : 'shop';
        let body = '';
        if (active === 'pack') body = renderPack();
        else if (active === 'other') {
            const locked = isLocked();
            body = '<div class="vw-other"><h2>家长锁 / Parent Lock</h2>' +
                '<p>上锁后，游戏里的购买和合成都不能用，只能挖方块做任务。</p>' +
                '<p>当前：<strong>' + (locked ? '已上锁' : '未上锁') + '</strong></p>' +
                '<button type="button" class="vw-buy" data-action="voxel-parent-lock">' + (locked ? '解锁' : '上锁') + '</button></div>';
        } else body = renderShop();
        return '<div class="voxel-workshop vw-game-panel" data-vw-tab="' + active + '">' +
            '<div class="vw-game-tabs">' +
            GAME_TABS.map(function (t) {
                return '<button type="button" class="vw-rail-item' + (t.id === active ? ' is-on' : '') +
                    '" data-action="voxel-workshop-tab" data-tab="' + t.id + '">' +
                    iconMarkup(t.icon) + '<span>' + t.label + '</span></button>';
            }).join('') +
            '<button type="button" class="vw-game-close" data-action="voxel-workshop-close" aria-label="关闭工坊">×</button>' +
            '</div><div class="vw-main vw-game-main"><div class="vw-body">' + body + '</div></div></div>';
    };

    function renderLife(ctx) {
        return '<div class="vw-life"><h2>生活 / Life</h2><p>学习、家务做完会换成 XP（阳光），再去小卖部换方块。</p>' +
            renderHome(ctx) + '</div>';
    }

    api.render = function (ctx) {
        const tab = api.tab || 'home';
        let body = '';
        if (tab === 'shop') body = renderShop();
        else if (tab === 'pack') body = renderPack();
        else if (tab === 'world') body = renderWorld();
        else if (tab === 'other') body = renderOther();
        else if (tab === 'chores' || tab === 'life') body = (tab === 'chores' ? renderHome(ctx) : renderLife(ctx));
        else body = renderHome(ctx);
        return '<div class="voxel-workshop" data-vw-tab="' + tab + '">' +
            rail(tab) + '<div class="vw-main">' + headerBar() + '<div class="vw-body">' + body + '</div>' + footBar() +
            '</div></div>';
    };

    api.buy = function (itemId) {
        if (isLocked()) return { ok: false, reason: '家长锁开着，先解锁再买。' };
        const item = SHOP.filter(function (row) { return row.id === itemId; })[0];
        if (!item) return { ok: false, reason: '没有这个商品' };
        const b = bridge();
        if (!b || !b.spendSunlight) return { ok: false, reason: '账本还没准备好' };
        const pay = b.spendSunlight(item.cost);
        if (!pay.ok) return { ok: false, reason: 'XP 不够，先去做今日任务。' };
        const p = progress();
        p.inventory = Object.assign({}, EMPTY, p.inventory || {});
        p.inventory[item.kind] = (Number(p.inventory[item.kind]) || 0) + 1;
        saveProgress(p);
        return { ok: true, reason: '买到了 ' + item.name };
    };

    api.craft = function (recipeId) {
        if (isLocked()) return { ok: false, reason: '家长锁开着，先解锁再合成。' };
        const VW = global.VoxelWorld;
        if (!VW || !VW.craft) return { ok: false, reason: '合成台还没准备好' };
        const p = progress();
        const bag = Object.assign({}, EMPTY, p.inventory || {});
        const result = VW.craft(bag, recipeId);
        if (!result.ok) return { ok: false, reason: result.reason || '合成不了' };
        p.inventory = Object.assign({}, EMPTY, result.inventory);
        saveProgress(p);
        const name = result.recipe && result.recipe.name ? result.recipe.name : '方块';
        return { ok: true, reason: '合成了 ' + name };
    };

    api.toggleLock = function () {
        const p = progress();
        p.parentLock = !p.parentLock;
        saveProgress(p);
        return { ok: true, locked: !!p.parentLock, reason: p.parentLock ? '家长锁已打开，里面动不了。' : '家长锁已关闭。' };
    };

    global.VoxelWorkshop = api;
}(typeof window !== 'undefined' ? window : globalThis));
