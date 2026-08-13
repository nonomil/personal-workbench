/**
 * 方块世界 · 成长任务 + 每日挑战
 */
(function (global) {
    'use strict';

    const QUESTS = [
        { id: 'q1', title: '铺一条小路', desc: '放置 8 个草方块', type: 'build', block: 'grass', need: 8, reward: 10, rank: 1 },
        { id: 'q2', title: '第一颗晶体', desc: '收集 3 颗晶体', type: 'collect', need: 3, reward: 12, rank: 1 },
        { id: 'q3', title: '石头地基', desc: '放置 6 个石头', type: 'build', block: 'stone', need: 6, reward: 12, rank: 2 },
        { id: 'q4', title: '水晶矿工', desc: '累计收集 10 晶体', type: 'collect_total', need: 10, reward: 15, rank: 2 },
        { id: 'q5', title: '小小基地', desc: '世界中同时有 25 个方块', type: 'blocks_alive', need: 25, reward: 15, rank: 3 },
        { id: 'q6', title: '矿脉猎人', desc: '本局再收集 8 晶体', type: 'collect', need: 8, reward: 18, rank: 3 },
        { id: 'q7', title: '石墙工匠', desc: '放置 15 个石头', type: 'build', block: 'stone', need: 15, reward: 18, rank: 4 },
        { id: 'q8', title: '方块大师', desc: '累计建造 40 次', type: 'build_total', need: 40, reward: 25, rank: 5 },
        { id: 'q9', title: '草海工程', desc: '累计放置 30 草方块', type: 'build_total_block', block: 'grass', need: 30, reward: 20, rank: 4 },
        { id: 'q10', title: '晶体富翁', desc: '累计收集 25 晶体', type: 'collect_total', need: 25, reward: 22, rank: 5 },
        { id: 'q11', title: '要塞轮廓', desc: '世界中同时有 40 个方块', type: 'blocks_alive', need: 40, reward: 24, rank: 5 },
        { id: 'q12', title: '建造传说', desc: '累计建造 80 次', type: 'build_total', need: 80, reward: 30, rank: 5 }
    ];

    const RANKS = [
        { rank: 1, title: '新手矿工', needQuests: 0 },
        { rank: 2, title: '草地旅人', needQuests: 2 },
        { rank: 3, title: '石匠学徒', needQuests: 4 },
        { rank: 4, title: '晶体猎手', needQuests: 7 },
        { rank: 5, title: '方块大师', needQuests: 10 }
    ];

    /** 按星期轮换的每日挑战模板（本地日期） */
    const DAILY_POOL = [
        { key: 'daily-grass', title: '今日：铺草', desc: '今天再放 12 个草方块', type: 'build', block: 'grass', need: 12, reward: 16 },
        { key: 'daily-stone', title: '今日：砌石', desc: '今天再放 10 个石头', type: 'build', block: 'stone', need: 10, reward: 16 },
        { key: 'daily-crystal', title: '今日：采矿', desc: '今天收集 6 晶体', type: 'collect', need: 6, reward: 18 },
        { key: 'daily-mix', title: '今日：扩建', desc: '今天建造合计 15 次', type: 'build_any', need: 15, reward: 18 },
        { key: 'daily-alive', title: '今日：热闹基地', desc: '世界里同时有 30 个方块', type: 'blocks_alive', need: 30, reward: 20 },
        { key: 'daily-crystal2', title: '今日：深挖', desc: '今天收集 10 晶体', type: 'collect', need: 10, reward: 22 },
        { key: 'daily-master', title: '今日：大师课', desc: '今天建造 20 次', type: 'build_any', need: 20, reward: 24 }
    ];

    function localDate(d) {
        const date = d instanceof Date ? d : new Date(d || Date.now());
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function dailyForDate(dateStr) {
        const day = String(dateStr || localDate()).replace(/-/g, '');
        const n = Number(day) || 0;
        const tpl = DAILY_POOL[n % DAILY_POOL.length];
        return {
            id: 'daily:' + dateStr + ':' + tpl.key,
            date: dateStr,
            title: tpl.title,
            desc: tpl.desc,
            type: tpl.type,
            block: tpl.block,
            need: tpl.need,
            reward: tpl.reward,
            daily: true
        };
    }

    global.VoxelQuests = {
        list: QUESTS,
        ranks: RANKS,
        dailyPool: DAILY_POOL,
        dailyForDate: dailyForDate,
        localDate: localDate,
        get: function (id) { return QUESTS.find(function (q) { return q.id === id; }); }
    };
}(typeof window !== 'undefined' ? window : globalThis));
