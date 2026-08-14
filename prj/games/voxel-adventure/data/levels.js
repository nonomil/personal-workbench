/**
 * 方块世界 · 8 个区域关卡（对照 docs/工作台小游戏设计/DS-Scratch-我的世界.md）
 * 每关 = 世界的一个新区域，程序化地形 + 收集目标 + 走到出口。
 */
(function (global) {
    'use strict';

    const REGIONS = {
        grassland: {
            title: '草原',
            blocks: ['grass', 'dirt'],
            mobs: ['slime', 'bee'],
            sky: 'day',
            surfaceBias: 0,
            treeDensity: 1
        },
        forest: {
            title: '森林',
            blocks: ['grass', 'dirt', 'wood', 'leaf'],
            mobs: ['shroom', 'spark', 'bee'],
            sky: 'day',
            surfaceBias: -1,
            treeDensity: 2.2
        },
        desert: {
            title: '沙漠',
            blocks: ['sand', 'sand', 'stone'],
            mobs: ['cactus', 'spark'],
            sky: 'dusk',
            veil: 'warm',
            surfaceBias: 1,
            treeDensity: 0.2
        },
        cave: {
            title: '矿洞',
            blocks: ['stone', 'coal', 'crystal'],
            mobs: ['spark', 'bat'],
            sky: 'dusk',
            veil: 'cave',
            surfaceBias: 2,
            treeDensity: 0.3
        },
        canyon: {
            title: '峡谷',
            blocks: ['stone', 'dirt', 'coal'],
            mobs: ['spark', 'spider', 'golem'],
            sky: 'dusk',
            surfaceBias: -2,
            treeDensity: 0.5
        },
        snow: {
            title: '雪山',
            blocks: ['stone', 'crystal', 'dirt'],
            mobs: ['snowman', 'spark'],
            sky: 'day',
            veil: 'cold',
            surfaceBias: -3,
            treeDensity: 0.4
        },
        volcano: {
            title: '火山',
            blocks: ['stone', 'coal', 'crystal'],
            mobs: ['fire', 'spark'],
            sky: 'dusk',
            veil: 'ember',
            surfaceBias: 3,
            treeDensity: 0.1
        },
        end: {
            title: '终界前哨',
            blocks: ['stone', 'crystal', 'bedrock'],
            mobs: ['ghost', 'spark', 'bat'],
            sky: 'dusk',
            veil: 'void',
            surfaceBias: 0,
            treeDensity: 0
        }
    };

    const LEVELS = [
        { id: 1, title: '草原第一步', region: 'grassland', goal: { type: 'grass', count: 8, label: '收集草方块' }, rewardSun: 12 },
        { id: 2, title: '森林小径', region: 'forest', goal: { type: 'wood', count: 10, label: '收集橡木' }, rewardSun: 15 },
        { id: 3, title: '沙漠边缘', region: 'desert', goal: { type: 'sand', count: 8, label: '收集沙子' }, rewardSun: 18 },
        { id: 4, title: '矿洞入口', region: 'cave', goal: { type: 'coal', count: 5, label: '收集煤炭' }, rewardSun: 20 },
        { id: 5, title: '峡谷晶体', region: 'canyon', goal: { type: 'stone', count: 12, label: '收集石头' }, rewardSun: 24 },
        { id: 6, title: '雪山矿脉', region: 'snow', goal: { type: 'crystal', count: 5, label: '收集晶体' }, rewardSun: 28 },
        { id: 7, title: '火山通道', region: 'volcano', goal: { type: 'coal', count: 8, label: '收集煤炭' }, rewardSun: 30 },
        { id: 8, title: '终界之门', region: 'end', goal: { type: 'crystal', count: 10, label: '收集晶体' }, rewardSun: 36 }
    ];

    global.VoxelLevels = {
        REGIONS: REGIONS,
        list: LEVELS,
        get: function (id) {
            const found = LEVELS.find(function (l) { return l.id === Number(id); });
            return found ? JSON.parse(JSON.stringify(found)) : JSON.parse(JSON.stringify(LEVELS[0]));
        },
        getRegion: function (regionId) {
            return REGIONS[regionId] ? JSON.parse(JSON.stringify(REGIONS[regionId])) : REGIONS.grassland;
        },
        count: LEVELS.length
    };
}(typeof window !== 'undefined' ? window : globalThis));
