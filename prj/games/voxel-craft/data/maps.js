/**
 * 方块世界 · 地图目录
 *
 * 参考 mario-minecraft-game_APK_V1.19.8/config/biomes.json 的群系顺序、
 * 解锁节奏和敌人分层；这里把它压缩成当前 64×32 体素引擎可消费的配置。
 */
(function (global) {
    'use strict';

    const MAPS = [
        { id: 'meadow', title: '草原基地', subtitle: '从第一块草方块开始', unlockRank: 1, surface: 'grass', sub: 'dirt', deep: 'stone', sky: 'day', color: '#5db54a', bias: 0, tree: 0.12, water: true, enemyPool: ['slime', 'spark', 'bee'] },
        { id: 'forest', title: '森林', subtitle: '树影和木屋小径', unlockRank: 1, surface: 'grass', sub: 'dirt', deep: 'stone', sky: 'forest', color: '#4caf50', bias: -1, tree: 0.32, water: true, enemyPool: ['zombie', 'spider', 'bee'] },
        { id: 'cherry_grove', title: '樱花林', subtitle: '粉色花瓣飘过树梢', unlockRank: 1, surface: 'grass', sub: 'dirt', deep: 'stone', sky: 'cherry', color: '#ffb7c5', bias: -1, tree: 0.2, water: true, enemyPool: ['bee', 'spore_bug', 'fox'] },
        { id: 'snow', title: '雪地', subtitle: '白色山坡上的脚印', unlockRank: 2, surface: 'stone', sub: 'stone', deep: 'stone', sky: 'snow', color: '#e0f7fa', bias: -2, tree: 0.08, water: false, enemyPool: ['skeleton', 'spider', 'phantom'] },
        { id: 'desert', title: '沙漠', subtitle: '沙丘之间寻找绿洲', unlockRank: 2, surface: 'sand', sub: 'sand', deep: 'stone', sky: 'desert', color: '#ffecb3', bias: 1, tree: 0.02, water: true, enemyPool: ['creeper', 'spider', 'skeleton'] },
        { id: 'mushroom_island', title: '蘑菇岛', subtitle: '会发光的菌类小岛', unlockRank: 2, surface: 'grass', sub: 'dirt', deep: 'stone', sky: 'mushroom', color: '#ba55d3', bias: 0, tree: 0.05, water: true, enemyPool: ['mooshroom', 'spore_bug', 'witch'] },
        { id: 'mountain', title: '山地', subtitle: '煤矿和晶体藏在高处', unlockRank: 3, surface: 'stone', sub: 'stone', deep: 'stone', sky: 'mountain', color: '#757575', bias: -3, tree: 0.03, water: false, enemyPool: ['spider', 'golem', 'enderman'] },
        { id: 'cave', title: '矿洞', subtitle: '火把会把黑暗照亮', unlockRank: 4, surface: 'stone', sub: 'stone', deep: 'stone', sky: 'cave', color: '#3b3b4f', bias: -7, tree: 0, water: false, enemyPool: ['spider', 'spore_bug', 'bat'] },
        { id: 'ocean', title: '海湾', subtitle: '泡泡、水草和守卫', unlockRank: 3, surface: 'sand', sub: 'sand', deep: 'stone', sky: 'ocean', color: '#2196f3', bias: 2, tree: 0, water: true, enemyPool: ['drowned', 'pufferfish', 'guardian'] },
        { id: 'volcano', title: '火山', subtitle: '岩浆色天空下的小路', unlockRank: 4, surface: 'stone', sub: 'stone', deep: 'coal', sky: 'volcano', color: '#ff4500', bias: 2, tree: 0, water: false, enemyPool: ['magma_cube', 'blaze', 'wither_skeleton'] },
        { id: 'nether', title: '赤焰荒原', subtitle: '热浪里躲开火焰', unlockRank: 4, surface: 'stone', sub: 'stone', deep: 'coal', sky: 'nether', color: '#8b0000', bias: 1, tree: 0, water: false, enemyPool: ['zombie_pigman', 'blaze', 'ghast'] },
        { id: 'deep_dark', title: '深暗之域', subtitle: '安静走路，不要惊醒巨兽', unlockRank: 5, surface: 'stone', sub: 'stone', deep: 'coal', sky: 'deep_dark', color: '#008080', bias: -4, tree: 0, water: false, enemyPool: ['warden_scout', 'sculk_worm', 'warden'] },
        { id: 'end', title: '终界', subtitle: '紫色晶体守着最后的门', unlockRank: 5, surface: 'stone', sub: 'stone', deep: 'crystal', sky: 'end', color: '#9c27b0', bias: 0, tree: 0, water: false, enemyPool: ['endermite', 'shulker', 'enderman'] },
        { id: 'sky', title: '天空岛', subtitle: '在云朵之间跳跃', unlockRank: 5, surface: 'stone', sub: 'stone', deep: 'stone', sky: 'sky', color: '#87ceeb', bias: -6, tree: 0, water: false, floating: true, enemyPool: ['phantom', 'vex'] },
        { id: 'sky_dimension', title: '天空之城', subtitle: '金色云台上的挑战', unlockRank: 5, surface: 'grass', sub: 'stone', deep: 'stone', sky: 'sky_dimension', color: '#ffd700', bias: -8, tree: 0.02, water: false, floating: true, enemyPool: ['phantom', 'vex'] }
    ];

    const ALIASES = { grassland: 'meadow', plains: 'meadow', forest_hills: 'forest' };

    function normalize(id) {
        const key = String(id || 'meadow').trim().toLowerCase();
        return ALIASES[key] || (MAPS.some(function (map) { return map.id === key; }) ? key : 'meadow');
    }

    function clone(map) {
        return map ? Object.assign({}, map, { enemyPool: (map.enemyPool || []).slice() }) : null;
    }

    function get(id) {
        const key = normalize(id);
        return clone(MAPS.filter(function (map) { return map.id === key; })[0] || MAPS[0]);
    }

    function isUnlocked(id, rank) {
        return (Number(rank) || 1) >= get(id).unlockRank;
    }

    global.VoxelCraftMaps = {
        list: MAPS.map(clone),
        count: MAPS.length,
        firstId: 'meadow',
        normalize: normalize,
        get: get,
        isUnlocked: isUnlocked
    };
}(typeof window !== 'undefined' ? window : globalThis));
