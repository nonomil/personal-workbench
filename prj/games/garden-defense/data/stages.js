/**
 * 花园保卫 · 种植 + 技能发射成长关卡
 * 玩法：种植物、召唤僵尸、点技能发射/挡/收阳光
 */
(function (global) {
    'use strict';

    function S(id, title, blurb, needKills, startEnergy, reward, unlocks) {
        return {
            id: id,
            title: title,
            blurb: blurb,
            needKills: needKills,
            startEnergy: startEnergy,
            rewardSun: reward,
            unlockPlants: unlocks || []
        };
    }

    const STAGES = [
        S(1, '第一天的阳光', '种下向日葵收阳光，再召唤一只小僵尸练手。', 1, 2, 12, ['plant-sunflower', 'plant-peashooter']),
        S(2, '豌豆练习', '切换豌豆射手，发射技能击退 2 只。', 2, 3, 14, []),
        S(3, '坚果报到', '用坚果挡住，再慢慢打。', 2, 3, 15, ['plant-wallnut']),
        S(4, '寒冰入门', '冰一下再打，击退 3 只。', 3, 4, 16, ['plant-snowpea']),
        S(5, '阳光小账本', '先收阳光，再连续击退 3 只。', 3, 4, 18, []),
        S(6, '樱桃急救', '关键时刻用爆炸技能。', 3, 5, 20, ['plant-cherrybomb']),
        S(7, '稳定输出', '击退 4 只，注意能量。', 4, 5, 22, []),
        S(8, '草坪守卫', '击退 4 只不同僵尸。', 4, 5, 24, []),
        S(9, '连战连胜', '击退 5 只。', 5, 6, 26, []),
        S(10, '阳光充足', '击退 5 只，多用向日葵。', 5, 6, 28, []),
        S(11, '强敌来访', '击退 6 只。', 6, 7, 30, []),
        S(12, '花园守护者', '终章：击退 6 只。', 6, 8, 35, [])
    ];

    global.GardenDefenseStages = {
        list: STAGES,
        get: function (id) {
            return STAGES.find(function (s) { return s.id === Number(id); }) || STAGES[0];
        },
        count: STAGES.length
    };
}(typeof window !== 'undefined' ? window : globalThis));
