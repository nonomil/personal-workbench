/**
 * blocklegend · 挖掘碎屑色与三材质短音（ART-06）
 * 浏览器挂 window.BlockLegendFx，node 可 import。
 */
(function (global) {
    'use strict';

    const WOOD = { log: 1, leaf: 1, plank: 1, table: 1 };
    const STONE = { stone: 1, coal: 1, iron: 1, gold: 1, diamond: 1 };
    const DEBRIS = {
        grass: 0x5ca838,
        dirt: 0x9a6a3c,
        sand: 0xd4b45c,
        snow: 0xe8f0f4,
        stone: 0x7a7c82,
        coal: 0x3a3a3c,
        iron: 0xb0a090,
        gold: 0xe0c040,
        diamond: 0x48d2d6,
        log: 0x8a5a2c,
        leaf: 0x4a8a30,
        plank: 0xc49a58,
        table: 0xc49a58,
        word: 0xf0c84a
    };

    function mineSfxKind(kind) {
        if (WOOD[kind]) return 'wood';
        if (STONE[kind]) return 'stone';
        return 'dirt';
    }

    function debrisColor(kind) {
        return DEBRIS[kind] || 0xc8b48a;
    }

    global.BlockLegendFx = {
        mineSfxKind: mineSfxKind,
        debrisColor: debrisColor
    };
}(typeof window !== 'undefined' ? window : globalThis));
