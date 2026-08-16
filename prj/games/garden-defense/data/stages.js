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
        S(1, '第一天的阳光', '种向日葵和豌豆，挡住陆续走来的 6 只僵尸。', 6, 7000, 140, 2, 12, ['plant-sunflower', 'plant-peashooter'], ['walker']),
        S(2, '豌豆练习', '多种几棵豌豆，挡住走得更快的 8 只僵尸。', 8, 6500, 160, 3, 14, [], ['walker']),
        S(3, '坚果报到', '用坚果挡住近路，路障僵尸会扔路障。', 10, 6200, 180, 3, 15, ['plant-wallnut'], ['walker', 'cone']),
        S(4, '寒冰入门', '冰一下再打，旗帜会给同伴加油。', 10, 6000, 190, 4, 16, ['plant-snowpea'], ['walker', 'cone', 'flag']),
        S(5, '阳光小账本', '多种向日葵攒阳光，守住 12 只僵尸。', 12, 5800, 210, 4, 18, [], ['walker', 'cone', 'flag']),
        S(6, '樱桃急救', '近了再用樱桃清场，守住 12 只僵尸。', 12, 5600, 220, 5, 20, ['plant-cherrybomb'], ['walker', 'cone']),
        S(7, '铁桶来了', '铁桶僵尸会扔铁桶，打中射手会变成铁桶射手。', 14, 5400, 240, 5, 22, [], ['walker', 'cone', 'bucket']),
        S(8, '跳高登场', '跳高僵尸能跳过第一道坚果，记得多层拦。', 14, 5200, 250, 5, 24, ['plant-potatomine'], ['walker', 'cone', 'polevault']),
        S(9, '橄榄球突击', '橄榄球僵尸冲得很快，咬人也更狠。', 16, 5000, 270, 6, 26, [], ['walker', 'cone', 'football']),
        S(10, '标枪来袭', '标枪僵尸隔着草坪就能掷标枪。', 16, 4800, 280, 6, 28, [], ['walker', 'bucket', 'javelin']),
        S(11, '混编防线', '旗帜带着铁桶和跳高，守住 18 只。', 18, 4600, 300, 7, 30, [], ['walker', 'bucket', 'flag', 'polevault']),
        S(12, '花园守护者', '终章：铁桶、标枪、跳高一起上场。', 20, 4400, 320, 8, 35, [], ['walker', 'cone', 'bucket', 'flag', 'football', 'javelin', 'polevault']),
        S(13, '夜路初探', '第二季开始，跳高和路障一起压过来。', 20, 4300, 320, 8, 36, [], ['walker', 'cone', 'flag', 'polevault']),
        S(14, '铁桶夜巡', '铁桶成群扔桶，小心射手被砸成铁桶射手。', 22, 4200, 330, 8, 38, [], ['walker', 'bucket', 'flag', 'javelin']),
        S(15, '橄榄双突', '橄榄球从两条路冲来，守住 22 只。', 22, 4000, 340, 8, 40, [], ['walker', 'football', 'cone', 'polevault']),
        S(16, '旗帜夜袭', '旗帜带着标枪和铁桶，守住 24 只。', 24, 3900, 350, 9, 42, [], ['walker', 'bucket', 'flag', 'javelin']),
        S(17, '混编高压', '铁桶、标枪、跳高一起压过来。', 24, 3800, 360, 9, 44, [], ['walker', 'bucket', 'javelin', 'polevault', 'football']),
        S(18, '终夜守护', '夜战终章：全员出场，守住 26 只。', 26, 3600, 370, 10, 48, [], ['walker', 'cone', 'bucket', 'flag', 'football', 'javelin', 'polevault'])
    ];

    global.GardenDefenseStages = {
        list: STAGES,
        get: function (id) {
            return STAGES.find(function (s) { return s.id === Number(id); }) || STAGES[0];
        },
        count: STAGES.length
    };
}(typeof window !== 'undefined' ? window : globalThis));
