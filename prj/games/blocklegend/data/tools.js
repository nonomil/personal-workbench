/**
 * blocklegend · 工具与体素射线（纯函数，无 DOM）
 * 剑打怪、斧砍树、镐挖石、铲挖土，手感贴近原版分工。
 */
(function (global) {
    'use strict';

    const SLOT_IDS = ['sword', 'axe', 'pickaxe', 'shovel'];
    const BASE_BREAK_MS = {
        log: 900,
        leaf: 320,
        dirt: 520,
        grass: 420,
        sand: 480,
        snow: 380,
        stone: 1400
    };
    const TOOLS = {
        sword: { id: 'sword', melee: 1, mine: { log: 0.35, leaf: 0.45, dirt: 0.28, grass: 0.28, sand: 0.28, snow: 0.3, stone: 0.16 } },
        axe: { id: 'axe', melee: 0.55, mine: { log: 1, leaf: 1, dirt: 0.34, grass: 0.34, sand: 0.34, snow: 0.34, stone: 0.2 } },
        pickaxe: { id: 'pickaxe', melee: 0.42, mine: { log: 0.4, leaf: 0.4, dirt: 0.72, grass: 0.72, sand: 0.72, snow: 0.72, stone: 1 } },
        shovel: { id: 'shovel', melee: 0.35, mine: { log: 0.25, leaf: 0.3, dirt: 1, grass: 1, sand: 1, snow: 1, stone: 0.14 } }
    };
    const DROPS = {
        log: 'oak-log',
        leaf: 'stick',
        dirt: 'dirt',
        grass: 'dirt',
        sand: 'dirt',
        snow: 'dirt',
        stone: 'cobble'
    };

    function toolOf(id) {
        return TOOLS[id] || TOOLS.sword;
    }

    function breakMs(toolId, kind) {
        const base = BASE_BREAK_MS[kind] || 800;
        const tool = toolOf(toolId);
        const speed = (tool.mine && tool.mine[kind]) || 0.25;
        return Math.max(120, Math.round(base / speed));
    }

    function meleeScale(toolId) {
        return toolOf(toolId).melee;
    }

    function dropOf(kind) {
        return DROPS[kind] || kind;
    }

    function lookDir(yaw, pitch) {
        const cp = Math.cos(pitch || 0);
        return {
            x: -Math.sin(yaw) * cp,
            y: Math.sin(pitch || 0),
            z: -Math.cos(yaw) * cp
        };
    }

    function voxelRay(origin, dir, maxDist, sample) {
        const step = 0.08;
        const max = Number(maxDist) || 6;
        let t = 0;
        let last = { x: null, y: null, z: null };
        let prev = null;
        while (t <= max) {
            const x = Math.floor(origin.x + dir.x * t);
            const y = Math.floor(origin.y + dir.y * t);
            const z = Math.floor(origin.z + dir.z * t);
            if (x !== last.x || y !== last.y || z !== last.z) {
                const kind = sample(x, y, z);
                if (kind) return { hit: true, x: x, y: y, z: z, kind: kind, dist: t, prev: prev };
                prev = { x: x, y: y, z: z };
                last = { x: x, y: y, z: z };
            }
            t += step;
        }
        return { hit: false, prev: last };
    }

    function placeKindOf(loot) {
        if (loot === 'dirt') return 'dirt';
        if (loot === 'cobble') return 'stone';
        if (loot === 'oak-log') return 'log';
        return null;
    }

    function lootOfPlace(kind) {
        if (kind === 'dirt' || kind === 'grass') return 'dirt';
        if (kind === 'stone') return 'cobble';
        if (kind === 'log') return 'oak-log';
        return null;
    }

    global.BlockLegendTools = {
        SLOT_IDS: SLOT_IDS,
        TOOLS: TOOLS,
        BASE_BREAK_MS: BASE_BREAK_MS,
        toolOf: toolOf,
        breakMs: breakMs,
        meleeScale: meleeScale,
        dropOf: dropOf,
        lookDir: lookDir,
        voxelRay: voxelRay,
        placeKindOf: placeKindOf,
        lootOfPlace: lootOfPlace
    };
}(typeof window !== 'undefined' ? window : globalThis));
