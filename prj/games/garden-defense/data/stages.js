/**
 * 花园保卫 · 自动塔防成长关卡
 * 玩法：种植物、点来一波，植物自己打；守住指定波次
 */
(function (global) {
    'use strict';

    function S(id, title, blurb, waves, parSec, startEnergy, reward, unlocks) {
        return {
            id: id,
            title: title,
            blurb: blurb,
            waves: waves,
            parSec: parSec,
            startEnergy: startEnergy,
            rewardSun: reward,
            unlockPlants: unlocks || []
        };
    }

    const STAGES = [
        S(1, '第一天的阳光', '种向日葵和豌豆，守住 1 波。', 1, 45, 2, 12, ['plant-sunflower', 'plant-peashooter']),
        S(2, '豌豆练习', '多种几棵豌豆，再守 1 波。', 1, 50, 3, 14, []),
        S(3, '坚果报到', '用坚果挡住近路，守住 1 波。', 1, 55, 3, 15, ['plant-wallnut']),
        S(4, '寒冰入门', '冰一下再打，守住 2 波。', 2, 55, 4, 16, ['plant-snowpea']),
        S(5, '阳光小账本', '多种向日葵攒阳光，守住 2 波。', 2, 60, 4, 18, []),
        S(6, '樱桃急救', '近了再用樱桃清场，守住 2 波。', 2, 60, 5, 20, ['plant-cherrybomb']),
        S(7, '稳定输出', '守住 3 波，注意补种。', 3, 70, 5, 22, []),
        S(8, '草坪守卫', '守住 3 波不同僵尸。', 3, 75, 5, 24, []),
        S(9, '连战连胜', '守住 3 波。', 3, 80, 6, 26, []),
        S(10, '阳光充足', '守住 3 波，多用向日葵。', 3, 80, 6, 28, []),
        S(11, '强敌来访', '终章前：守住 3 波。', 3, 85, 7, 30, []),
        S(12, '花园守护者', '终章：守住 3 波。', 3, 90, 8, 35, [])
    ];

    global.GardenDefenseStages = {
        list: STAGES,
        get: function (id) {
            return STAGES.find(function (s) { return s.id === Number(id); }) || STAGES[0];
        },
        count: STAGES.length
    };
}(typeof window !== 'undefined' ? window : globalThis));
