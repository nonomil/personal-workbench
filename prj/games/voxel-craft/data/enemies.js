/**
 * 方块世界 · 敌人目录
 * 参考 mario-minecraft-game_APK_V1.19.8 的 ENEMY_STATS 与 enemyTiers，
 * 统一为当前小世界的低伤害、可恢复战斗数值。
 */
(function (global) {
    'use strict';

    const ART = '../voxel-adventure/assets/enemies/';
    const ROSTER = {
        slime: { id: 'slime', title: '绿色黏团', hp: 2, speed: 0.55, damage: 1, behavior: 'walker', color: '#7cdb68', sprite: ART + 'slime-idle.png', size: { w: 24, h: 22 } },
        spark: { id: 'spark', title: '紫晶火花', hp: 3, speed: 0.75, damage: 1, behavior: 'walker', color: '#8b6cff', sprite: ART + 'spark-idle.png', size: { w: 24, h: 24 } },
        bat: { id: 'bat', title: '洞穴蝙蝠', hp: 2, speed: 1.2, damage: 1, behavior: 'flyer', color: '#8b6c9f', sprite: ART + 'bat-idle.png', size: { w: 30, h: 20 } },
        zombie: { id: 'zombie', title: '僵尸', hp: 4, speed: 0.62, damage: 1, behavior: 'walker', color: '#4f8b65', sprite: ART + 'slime-idle.png', size: { w: 24, h: 34 } },
        skeleton: { id: 'skeleton', title: '骷髅', hp: 3, speed: 0.58, damage: 1, behavior: 'walker', color: '#d9d5cb', sprite: ART + 'ghost.png', size: { w: 24, h: 36 } },
        creeper: { id: 'creeper', title: '爆爆怪', hp: 4, speed: 0.45, damage: 2, behavior: 'walker', color: '#43a047', sprite: ART + 'green-boom.png', size: { w: 24, h: 36 } },
        spider: { id: 'spider', title: '洞穴蜘蛛', hp: 3, speed: 1.1, damage: 1, behavior: 'walker', color: '#4a0e0e', sprite: ART + 'spider.png', size: { w: 34, h: 20 } },
        enderman: { id: 'enderman', title: '影子旅人', hp: 6, speed: 0.8, damage: 2, behavior: 'walker', color: '#1a0033', sprite: ART + 'ghost.png', size: { w: 24, h: 42 } },
        golem: { id: 'golem', title: '铁傀儡', hp: 8, speed: 0.4, damage: 2, behavior: 'walker', color: '#9aa0a6', sprite: ART + 'golem.png', size: { w: 34, h: 44 } },
        bee: { id: 'bee', title: '蜜蜂', hp: 2, speed: 1.25, damage: 1, behavior: 'flyer', color: '#ffd700', sprite: ART + 'bee-idle.png', size: { w: 24, h: 22 } },
        fox: { id: 'fox', title: '小狐狸', hp: 3, speed: 0.7, damage: 1, behavior: 'walker', color: '#ff8c00', sprite: ART + 'cactus-monster.png', size: { w: 28, h: 26 } },
        witch: { id: 'witch', title: '药水巫师', hp: 5, speed: 0.55, damage: 2, behavior: 'walker', color: '#800080', sprite: ART + 'ghost.png', size: { w: 24, h: 34 } },
        spore_bug: { id: 'spore_bug', title: '孢子虫', hp: 2, speed: 0.8, damage: 1, behavior: 'walker', color: '#9370db', sprite: ART + 'shroom-idle.png', size: { w: 24, h: 22 } },
        mooshroom: { id: 'mooshroom', title: '蘑菇牛', hp: 4, speed: 0.45, damage: 1, behavior: 'walker', color: '#ba55d3', sprite: ART + 'shroom-idle.png', size: { w: 30, h: 30 } },
        magma_cube: { id: 'magma_cube', title: '岩浆方块', hp: 5, speed: 0.9, damage: 2, behavior: 'jumper', color: '#ff4500', sprite: ART + 'crystal-slime.png', size: { w: 28, h: 28 } },
        fire_spirit: { id: 'fire_spirit', title: '火焰精灵', hp: 4, speed: 1.1, damage: 2, behavior: 'flyer', color: '#ff6347', sprite: ART + 'fire-spirit-idle.png', size: { w: 24, h: 28 } },
        sculk_worm: { id: 'sculk_worm', title: '幽匿虫', hp: 2, speed: 0.9, damage: 1, behavior: 'walker', color: '#008080', sprite: ART + 'shroom-idle.png', size: { w: 28, h: 16 } },
        shadow_stalker: { id: 'shadow_stalker', title: '暗影猎手', hp: 6, speed: 1.0, damage: 2, behavior: 'walker', color: '#1b3a4b', sprite: ART + 'ghost.png', size: { w: 26, h: 38 } },
        warden: { id: 'warden', title: '深暗守卫', hp: 10, speed: 0.5, damage: 2, behavior: 'walker', color: '#0e2230', sprite: ART + 'golem.png', size: { w: 34, h: 46 } },
        phantom: { id: 'phantom', title: '夜翼', hp: 5, speed: 1.35, damage: 2, behavior: 'flyer', color: '#9370db', sprite: ART + 'bat-idle.png', size: { w: 36, h: 20 } },
        vex: { id: 'vex', title: '小飞灵', hp: 3, speed: 1.5, damage: 1, behavior: 'flyer', color: '#87ceeb', sprite: ART + 'spark-idle.png', size: { w: 20, h: 28 } },
        drowned: { id: 'drowned', title: '水鬼', hp: 4, speed: 0.55, damage: 1, behavior: 'walker', color: '#3f8f9f', sprite: ART + 'ghost.png', size: { w: 24, h: 34 } },
        pufferfish: { id: 'pufferfish', title: '河豚', hp: 2, speed: 0.8, damage: 1, behavior: 'flyer', color: '#f0b34b', sprite: ART + 'slime-idle.png', size: { w: 26, h: 22 } },
        guardian: { id: 'guardian', title: '海底守卫', hp: 6, speed: 0.65, damage: 2, behavior: 'flyer', color: '#4fb3bf', sprite: ART + 'crystal-slime.png', size: { w: 30, h: 30 } },
        zombie_pigman: { id: 'zombie_pigman', title: '赤焰猪灵', hp: 5, speed: 0.7, damage: 1, behavior: 'walker', color: '#c66f75', sprite: ART + 'slime-idle.png', size: { w: 26, h: 34 } },
        blaze: { id: 'blaze', title: '烈焰使者', hp: 6, speed: 1.0, damage: 2, behavior: 'flyer', color: '#ffb300', sprite: ART + 'fire-spirit-idle.png', size: { w: 28, h: 32 } },
        ghast: { id: 'ghast', title: '浮空幽灵', hp: 8, speed: 0.55, damage: 2, behavior: 'flyer', color: '#f4eef2', sprite: ART + 'ghost.png', size: { w: 38, h: 34 } },
        wither_skeleton: { id: 'wither_skeleton', title: '凋零骨卫', hp: 7, speed: 0.7, damage: 2, behavior: 'walker', color: '#454052', sprite: ART + 'ghost.png', size: { w: 26, h: 38 } },
        warden_scout: { id: 'warden_scout', title: '幽匿侦察', hp: 3, speed: 0.8, damage: 1, behavior: 'walker', color: '#238b8b', sprite: ART + 'golem.png', size: { w: 24, h: 30 } },
        sculk_crawler: { id: 'sculk_crawler', title: '幽匿爬虫', hp: 4, speed: 0.85, damage: 1, behavior: 'walker', color: '#176b75', sprite: ART + 'spider.png', size: { w: 30, h: 18 } },
        endermite: { id: 'endermite', title: '终界虫', hp: 3, speed: 1.0, damage: 1, behavior: 'walker', color: '#9c27b0', sprite: ART + 'shroom-idle.png', size: { w: 24, h: 18 } },
        shulker: { id: 'shulker', title: '潜影盒', hp: 6, speed: 0.35, damage: 2, behavior: 'walker', color: '#8056a6', sprite: ART + 'crystal-slime.png', size: { w: 28, h: 28 } }
    };

    const TIERS = {
        meadow: [['slime', 'spark'], ['slime', 'spark', 'bee'], ['slime', 'spark', 'bee']],
        forest: [['zombie', 'spider'], ['zombie', 'spider', 'bee'], ['zombie', 'spider', 'bee']],
        cherry_grove: [['bee'], ['bee', 'spore_bug'], ['bee', 'spore_bug', 'fox']],
        snow: [['skeleton'], ['skeleton', 'spider'], ['skeleton', 'spider', 'phantom']],
        desert: [['creeper'], ['creeper', 'spider'], ['creeper', 'spider', 'skeleton']],
        mushroom_island: [['mooshroom'], ['mooshroom', 'spore_bug'], ['mooshroom', 'spore_bug', 'witch']],
        mountain: [['spider'], ['spider', 'golem'], ['spider', 'golem', 'enderman']],
        cave: [['spider'], ['spider', 'spore_bug'], ['spider', 'spore_bug', 'bat']],
        ocean: [['drowned'], ['drowned', 'pufferfish'], ['drowned', 'pufferfish', 'guardian']],
        volcano: [['magma_cube'], ['magma_cube', 'blaze'], ['magma_cube', 'blaze', 'wither_skeleton']],
        nether: [['zombie_pigman'], ['zombie_pigman', 'blaze'], ['zombie_pigman', 'blaze', 'ghast']],
        deep_dark: [['warden_scout'], ['warden_scout', 'sculk_crawler'], ['warden_scout', 'sculk_crawler', 'warden']],
        end: [['endermite'], ['endermite', 'shulker'], ['endermite', 'shulker', 'enderman']],
        sky: [['phantom'], ['phantom', 'vex'], ['phantom', 'vex']],
        sky_dimension: [['phantom'], ['phantom', 'vex'], ['phantom', 'vex']]
    };

    function copy(row) {
        return row ? Object.assign({}, row, { size: Object.assign({}, row.size) }) : null;
    }

    function get(id) {
        return copy(ROSTER[id]) || copy(ROSTER.slime);
    }

    function getPool(mapId, tier) {
        const list = TIERS[mapId] || TIERS.meadow;
        const index = Math.max(0, Math.min(list.length - 1, (Number(tier) || 1) - 1));
        return list[index].slice();
    }

    function create(id, x, y) {
        const row = get(id);
        return {
            id: row.id,
            title: row.title,
            x: Number(x) || 0,
            y: Number(y) || 0,
            w: row.size.w,
            h: row.size.h,
            hp: row.hp,
            maxHp: row.hp,
            speed: row.speed,
            damage: row.damage,
            behavior: row.behavior,
            color: row.color,
            sprite: row.sprite,
            facing: -1,
            patrolDir: -1,
            vy: 0,
            phase: 0,
            hitReadyAt: 0,
            hitFlashUntil: 0,
            remove: false
        };
    }

    global.VoxelCraftEnemies = {
        list: Object.keys(ROSTER).map(function (id) { return copy(ROSTER[id]); }),
        count: Object.keys(ROSTER).length,
        get: get,
        getPool: getPool,
        create: create,
        tiers: TIERS
    };
}(typeof window !== 'undefined' ? window : globalThis));
