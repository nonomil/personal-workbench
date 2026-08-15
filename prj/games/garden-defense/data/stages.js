/**
 * 花园保卫 · 关卡
 * 参考 h5-game-plantsVSzombies：一关是陆续出怪，清空场上不等于过关。
 */
(function (global) {
    'use strict';

    function S(id, title, blurb, zombieGoal, spawnGapMs, parSec, startEnergy, reward, unlocks, roster) {
        return {
            id: id,
            title: title,
            blurb: blurb,
            zombieGoal: zombieGoal,
            spawnGapMs: spawnGapMs,
            waves: Math.max(1, Math.ceil(zombieGoal / 2)),
            parSec: parSec,
            startEnergy: startEnergy,
            rewardSun: reward,
            unlockPlants: unlocks || [],
            roster: roster || []
        };
    }

    const STAGES = [
        S(1, '第一天的阳光', '种向日葵和豌豆，挡住陆续走来的 6 只僵尸。', 6, 9000, 160, 2, 12, ['plant-sunflower', 'plant-peashooter'], ['walker']),
        S(2, '豌豆练习', '多种几棵豌豆，挡住陆续走来的 8 只僵尸。', 8, 8500, 180, 3, 14, [], ['walker']),
        S(3, '坚果报到', '用坚果挡住近路，守住 10 只僵尸。', 10, 8000, 200, 3, 15, ['plant-wallnut'], ['walker', 'cone']),
        S(4, '寒冰入门', '冰一下再打，守住 10 只僵尸。', 10, 8000, 210, 4, 16, ['plant-snowpea'], ['walker', 'cone', 'flag']),
        S(5, '阳光小账本', '多种向日葵攒阳光，守住 12 只僵尸。', 12, 7500, 230, 4, 18, [], ['walker', 'cone', 'flag']),
        S(6, '樱桃急救', '近了再用樱桃清场，守住 12 只僵尸。', 12, 7500, 240, 5, 20, ['plant-cherrybomb'], ['walker', 'cone']),
        S(7, '铁桶来了', '末尾会出现铁桶僵尸，守住 14 只。', 14, 7000, 260, 5, 22, [], ['walker', 'cone', 'bucket']),
        S(8, '土豆埋伏', '解锁土豆地雷，守住 14 只。', 14, 7000, 270, 5, 24, ['plant-potatomine'], ['walker', 'cone', 'bucket']),
        S(9, '橄榄球突击', '橄榄球僵尸很快，守住 16 只。', 16, 6500, 290, 6, 26, [], ['walker', 'cone', 'football']),
        S(10, '双铁桶', '铁桶成对出现，守住 16 只。', 16, 6500, 300, 6, 28, [], ['walker', 'bucket']),
        S(11, '混编防线', '旗帜带着路障和铁桶，守住 18 只。', 18, 6000, 320, 7, 30, [], ['walker', 'cone', 'bucket', 'flag']),
        S(12, '花园守护者', '终章：全员出场，守住 20 只。', 20, 6000, 340, 8, 35, [], ['walker', 'cone', 'bucket', 'flag', 'football']),
        S(13, '夜路初探', '第二季开始，守住陆续走来的 20 只。', 20, 5800, 340, 8, 36, [], ['walker', 'cone', 'flag']),
        S(14, '铁桶夜巡', '铁桶成群出现，守住 22 只。', 22, 5600, 350, 8, 38, [], ['walker', 'bucket', 'flag']),
        S(15, '橄榄双突', '橄榄球从两条路冲来，守住 22 只。', 22, 5400, 360, 8, 40, [], ['walker', 'football', 'cone']),
        S(16, '旗帜夜袭', '旗帜带着路障和铁桶，守住 24 只。', 24, 5200, 370, 9, 42, [], ['walker', 'cone', 'bucket', 'flag']),
        S(17, '混编高压', '铁桶和橄榄球一起压过来，守住 24 只。', 24, 5000, 380, 9, 44, [], ['walker', 'cone', 'bucket', 'football']),
        S(18, '终夜守护', '夜战终章：全员出场，守住 26 只。', 26, 4800, 390, 10, 48, [], ['walker', 'cone', 'bucket', 'flag', 'football'])
    ];

    global.GardenDefenseStages = {
        list: STAGES,
        get: function (id) {
            return STAGES.find(function (s) { return s.id === Number(id); }) || STAGES[0];
        },
        count: STAGES.length
    };
}(typeof window !== 'undefined' ? window : globalThis));
