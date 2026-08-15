/**
 * blocklegend · 薄商店（纯函数）
 * 4 件儿童可达商品：三件装备占槽，药水只回血。
 */
(function (global) {
    'use strict';

    const ITEMS = [
        { id: 'leather-cap', en: 'Leather Cap', zh: '皮帽', slot: 'helm', def: 2, atk: 0, heal: 0, cost: 20 },
        { id: 'cloth-robe', en: 'Cloth Robe', zh: '布袍', slot: 'armor', def: 3, atk: 0, heal: 0, cost: 35 },
        { id: 'iron-blade', en: 'Iron Blade', zh: '铁刃', slot: 'weapon', def: 0, atk: 4, heal: 0, cost: 40 },
        { id: 'hp-potion', en: 'HP Potion', zh: '生命药水', slot: 'consumable', def: 0, atk: 0, heal: 8, cost: 12 }
    ];

    function itemOf(id) {
        return ITEMS.find(function (it) { return it.id === id; }) || null;
    }

    function statsOf(gear) {
        const g = gear || {};
        let atk = 0, def = 0;
        ['helm', 'armor', 'weapon'].forEach(function (slot) {
            const it = itemOf(g[slot]);
            if (!it) return;
            atk += Number(it.atk) || 0;
            def += Number(it.def) || 0;
        });
        return { atk: atk, def: def };
    }

    function mitigate(contact, def) {
        return Math.max(1, (Number(contact) || 1) - (Number(def) || 0));
    }

    function buy(state, itemId) {
        const item = itemOf(itemId);
        const coined = Number(state && state.coined) || 0;
        const gear = Object.assign({}, (state && state.gear) || {});
        if (!item) return { ok: false, reason: 'unknown', coined: coined, gear: gear, heal: 0 };
        if (coined < item.cost) return { ok: false, reason: 'poor', coined: coined, gear: gear, heal: 0 };
        if (item.slot === 'consumable') {
            return { ok: true, coined: coined - item.cost, gear: gear, heal: item.heal, item: item };
        }
        const next = Object.assign({}, gear);
        next[item.slot] = item.id;
        return { ok: true, coined: coined - item.cost, gear: next, heal: 0, item: item };
    }

    global.BlockLegendShop = {
        ITEMS: ITEMS,
        itemOf: itemOf,
        statsOf: statsOf,
        mitigate: mitigate,
        buy: buy
    };
}(typeof window !== 'undefined' ? window : globalThis));
