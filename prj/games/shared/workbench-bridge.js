/**
 * 独立小游戏 ↔ 幼儿工作台 积分/长期成长桥
 *
 * 设计参考（简化合入）：
 * - 习惯绑定：游戏游玩贴在学习任务同一天节奏上
 * - 每日微循环：三世界今日打卡戳 + 三戳全勤小奖
 * - 短中长目标：当日游玩 → 周目标 → 里程碑徽章/冒险等级
 * - 元进度反哺核心：冒险等级带来开局阳光加成等
 *
 * 存储：petbank_huchuliang_preschool_workbench_state_v1
 * - growth.sunlight / totalSunlightEarned / unicorn
 * - growth.worldGames.<gameId>
 * - growth.worldGames.meta  长期总控
 */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'petbank_huchuliang_preschool_workbench_state_v1';
    const MEMORY_STORAGE_KEY = 'workbench:memory:v1';
    const DAILY_GAME_SUN_CAP = 80;
    const PLAY_PASS = Object.freeze({
        dailyFree: 2,
        maxLearned: 3,
        maxRedeemed: 2,
        redeemCost: 25
    });
    const PLAY_PASS_BY_GAME = Object.freeze({
        'garden-defense': PLAY_PASS,
        'platform-quest': PLAY_PASS,
        'platform-learning': PLAY_PASS,
        'voxel-adventure': Object.freeze({
            dailyFree: 1,
            maxLearned: 2,
            maxRedeemed: 2,
            redeemCost: 25,
            sessionMinutes: 12
        }),
        'voxel-learning': Object.freeze({
            dailyFree: 1,
            maxLearned: 2,
            maxRedeemed: 2,
            redeemCost: 25,
            sessionMinutes: 12
        }),
        'learning-defense': PLAY_PASS
    });
    const REWARD_GAME_IDS = ['garden-defense', 'platform-quest', 'platform-learning', 'voxel-adventure', 'voxel-learning', 'learning-defense'];
    const GAME_IDS = ['garden-defense', 'learning-defense', 'voxel-adventure', 'voxel-learning', 'platform-quest', 'platform-learning', 'blocklegend'];
    const PLATFORM_LEVEL_TOTAL = 16;

    function countLiteracyKnown(state) {
        const mastery = state && state.courseProgress && state.courseProgress.literacy
            && state.courseProgress.literacy.mastery;
        if (!mastery || typeof mastery !== 'object') return 0;
        return Object.keys(mastery).filter(function (key) {
            const entry = mastery[key];
            return entry && (entry.state === 'ready' || entry.state === 'maintenance');
        }).length;
    }

    function playModsFromLiteracy(known) {
        const n = Math.max(0, Math.floor(Number(known) || 0));
        if (n > 200) {
            return { mode: 'hard', label: '困难', literacyKnown: n, enemySpeed: 1.3, chaseMs: 780, sunMult: 2, extraMob: true };
        }
        if (n >= 100) {
            return { mode: 'normal', label: '普通', literacyKnown: n, enemySpeed: 1.15, chaseMs: 920, sunMult: 1.5, extraMob: false };
        }
        return { mode: 'easy', label: '简单', literacyKnown: n, enemySpeed: 0.75, chaseMs: 1400, sunMult: 1, extraMob: false };
    }

    function getPlayMods() {
        return playModsFromLiteracy(countLiteracyKnown(readState()));
    }

    /** 冒险等级门槛（累计冒险点） */
    const ADVENTURE_RANKS = [
        { level: 1, need: 0, title: '萌芽旅人', gardenStartSun: 0, platformCoinBonus: 0, voxelCrystalBonus: 0 },
        { level: 2, need: 15, title: '草坪学徒', gardenStartSun: 10, platformCoinBonus: 0, voxelCrystalBonus: 0 },
        { level: 3, need: 40, title: '阳光骑士', gardenStartSun: 20, platformCoinBonus: 1, voxelCrystalBonus: 0 },
        { level: 4, need: 80, title: '方块工匠', gardenStartSun: 25, platformCoinBonus: 1, voxelCrystalBonus: 1 },
        { level: 5, need: 140, title: '星光探险家', gardenStartSun: 35, platformCoinBonus: 2, voxelCrystalBonus: 1 },
        { level: 6, need: 220, title: '花园守护者', gardenStartSun: 45, platformCoinBonus: 2, voxelCrystalBonus: 2 },
        { level: 7, need: 320, title: '传说冒险家', gardenStartSun: 60, platformCoinBonus: 3, voxelCrystalBonus: 2 }
    ];
    const THEME_ADVENTURE_TITLES = {
        'voxel-adventure': ['木镐旅人', '铁锭学徒', '石匠骑士', '晶体工匠', '矿层探险家', '深渊守护者', '方块大师'],
        'platform-quest': ['草地旅人', '旗杆学徒', '金币骑士', '星光工匠', '彩虹探险家', '城堡守护者', '终旗冒险家']
    };

    function themeAdventureTitle(themeId, level) {
        const n = Math.round(Number(level) || 0);
        if (n < 1 || n > ADVENTURE_RANKS.length) return ADVENTURE_RANKS[0].title;
        const pack = THEME_ADVENTURE_TITLES[themeId];
        return (pack && pack[n - 1]) || ADVENTURE_RANKS[n - 1].title;
    }

    /** 里程碑：长期徽章（事件去重发奖） */
    const MILESTONES = [
        { id: 'ms-garden-3', title: '三关守卫', desc: '花园通关 3 关', need: function (s) { return gardenClears(s) >= 3; }, points: 5, sun: 12 },
        { id: 'ms-garden-8', title: '八关防线', desc: '花园通关 8 关', need: function (s) { return gardenClears(s) >= 8; }, points: 10, sun: 20 },
        { id: 'ms-garden-12', title: '终章守护', desc: '花园通关 12 关', need: function (s) { return gardenClears(s) >= 12; }, points: 15, sun: 30 },
        { id: 'ms-garden-18', title: '夜战园丁', desc: '花园通关全部 18 关', need: function (s) { return gardenClears(s) >= 18; }, points: 18, sun: 36 },
        { id: 'ms-voxel-5', title: '矿工新手', desc: '方块完成 5 个任务', need: function (s) { return voxelQuests(s) >= 5; }, points: 5, sun: 12 },
        { id: 'ms-voxel-12', title: '方块大师徽章', desc: '方块完成 12 个任务', need: function (s) { return voxelQuests(s) >= 12; }, points: 12, sun: 25 },
        { id: 'ms-platform-3', title: '三旗冲线', desc: '横版通关 3 关', need: function (s) { return platformClears(s) >= 3; }, points: 5, sun: 12 },
        { id: 'ms-platform-10', title: '彩虹终点', desc: '横版通关 10 关', need: function (s) { return platformClears(s) >= 10; }, points: 15, sun: 30 },
        { id: 'ms-platform-16', title: '终旗旅伴', desc: '横版通关全部 16 关', need: function (s) { return platformClears(s) >= 16; }, points: 18, sun: 36 },
        { id: 'ms-platform-speed', title: '闪电探险家', desc: '横版 16 关全部拿到 3 星', need: function (s) { return platformThreeStars(s); }, points: 20, sun: 40 },
        { id: 'ms-play-7', title: '七日冒险', desc: '累计 7 天玩过任一世界', need: function (s) { return playDays(s) >= 7; }, points: 10, sun: 18 },
        { id: 'ms-play-30', title: '月度旅伴', desc: '累计 30 天玩过游戏', need: function (s) { return playDays(s) >= 30; }, points: 20, sun: 40 },
        { id: 'ms-stars-20', title: '二十星收藏', desc: '花园+横版星星合计 20', need: function (s) { return totalStars(s) >= 20; }, points: 12, sun: 22 },
        { id: 'ms-triple-day', title: '三界同日', desc: '同一天玩过三个世界', need: function (s) { return hasTripleDay(s); }, points: 8, sun: 16 }
    ];

    function today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function dateOffset(dateStr, days) {
        const d = new Date(String(dateStr) + 'T12:00:00');
        d.setDate(d.getDate() + days);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function weekStart(dateStr) {
        const d = new Date(String(dateStr) + 'T12:00:00');
        const day = d.getDay(); // 0 Sun
        const diff = day === 0 ? -6 : 1 - day; // Monday start
        d.setDate(d.getDate() + diff);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function readState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return createEmptyState();
            const state = JSON.parse(raw);
            if (!state.growth || typeof state.growth !== 'object') state.growth = {};
            return state;
        } catch (e) {
            console.warn('[workbench-bridge] read failed', e);
            return createEmptyState();
        }
    }

    function createEmptyState() {
        return {
            growth: {
                sunlight: 80,
                totalSunlightEarned: 80,
                awardedIds: [],
                checkinDates: [],
                unicorn: { name: '星芒', xp: 80, level: 1 },
                garden: {},
                worldGames: { meta: defaultMeta() }
            }
        };
    }

    function writeState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (e) {
            console.warn('[workbench-bridge] write failed', e);
            return false;
        }
    }

    function fallbackMemory(source) {
        const raw = source && typeof source === 'object' ? source : {};
        const words = raw.words && typeof raw.words === 'object' ? raw.words : {};
        return {
            memoryVersion: Number(raw.memoryVersion) > 0 ? Number(raw.memoryVersion) : 1,
            words: Object.keys(words).reduce(function (out, key) {
                const canonical = String(key || '').trim().toLowerCase();
                if (canonical) out[canonical] = Object.assign({}, words[key]);
                return out;
            }, {})
        };
    }

    function normalizeMemory(source) {
        const api = global.WorkbenchMemory;
        return api && typeof api.createMemory === 'function'
            ? api.createMemory(source)
            : fallbackMemory(source);
    }

    // 识字读音三选一抽题：练习中/到期字优先，已会次之，未学只"先学一学"（准备度闸门）。
    // 数据来自 shared/literacy-quiz-bank.js（识字字库派生，构建期生成）。
    // 干扰项优先取"已见字"（个性化引擎 §4.6：干扰项不得从未教过的项里抽——排除法假信号）。
    function drawLiteracyQuiz(options) {
        const opts = options || {};
        const want = Math.max(1, Math.min(10, Math.floor(Number(opts.count) || 5)));
        const bank = globalThis.LiteracyQuizBank;
        if (!bank || !bank.length) return [];
        const date = today();
        let seed = 0;
        for (let index = 0; index < date.length; index += 1) seed = (seed * 33 + date.charCodeAt(index)) >>> 0;
        const state = readState();
        const mastery = state && state.courseProgress && state.courseProgress.literacy
            && state.courseProgress.literacy.mastery
            ? state.courseProgress.literacy.mastery
            : {};
        // 合流两本账：卡墙 mastery ∪ 游戏回流 memory（知识门答题只写 memory，
        // 若只看 mastery，答过的字永远算"未学"，闭环断裂）
        const memory = getMemory();
        const words = memory && memory.words ? memory.words : {};
        const seen = {};
        Object.keys(mastery).forEach(function (key) { seen[key] = true; });
        Object.keys(words).forEach(function (key) { seen[key] = true; });
        const seenIndex = {};
        const allIndex = {};
        bank.forEach(function (row) {
            const p = row.pinyin;
            (allIndex[p] = allIndex[p] || []).push(row.char);
            if (seen[row.char]) (seenIndex[p] = seenIndex[p] || []).push(row.char);
        });
        const now = Date.now();
        const scored = bank.map(function (row, index) {
            const entry = mastery[row.char];
            const memoryRow = words[row.char];
            let tier;
            if (entry && entry.state !== 'ready' && entry.state !== 'maintenance') tier = 0;
            else if (entry && entry.nextReview && String(entry.nextReview) <= date) tier = 0;
            else if (memoryRow && (memoryRow.needsRelearn === true
                || memoryRow.lastOutcome === 'slip' || memoryRow.lastOutcome === 'unsure'
                || memoryRow.lastOutcome === 'unknown'
                || (memoryRow.dueAt != null && Number(memoryRow.dueAt) <= now))) tier = 0;
            else if (entry || (memoryRow && memoryRow.lastOutcome === 'known')) tier = 1;
            else tier = 2; // 未学：准备度闸门 → 只能先教，不能考
            const rotate = ((index * 2654435761 + seed) >>> 0) % 1000;
            return { row: row, tier: tier, score: tier * 1000 + rotate };
        });
        scored.sort(function (a, b) { return a.score - b.score; });
        return scored.slice(0, want).map(function (item) {
            const base = {
                char: item.row.char,
                pinyin: item.row.pinyin,
                speech: { kind: 'hanzi', text: item.row.char, lang: 'zh-CN', rate: 0.8 }
            };
            if (item.tier === 2) {
                // 闸门：未学字弹"先学一学"卡（展示+跟读），不三选一
                return Object.assign(base, { teachOnly: true, options: [] });
            }
            return Object.assign(base, {
                teachOnly: false,
                options: buildSeenOptions(item.row, seenIndex, allIndex)
            });
        });
    }

    function buildSeenOptions(row, seenIndex, allIndex) {
        const correct = row.pinyin;
        const hasSeen = function (p) {
            const list = seenIndex[p];
            return list && list.length ? p : '';
        };
        const add = function (p, list) {
            if (p === correct || candidates.indexOf(p) >= 0) return;
            if (list && list.length) candidates.push(p);
        };
        const candidates = [];
        // 1) 原生成器的同声母带调候选项里，先取"已见字"对应的拼音
        (row.options || []).forEach(function (p) {
            if (candidates.length >= 2) return;
            add(p, seenIndex[p]);
        });
        // 2) 不足两个：从任意已见字拼音补（跨组，保证至少 2 干扰）
        Object.keys(seenIndex).forEach(function (p) {
            if (candidates.length >= 2) return;
            add(p, seenIndex[p]);
        });
        // 3) 冷启动兜底（已见字极少时）：退回生成器原候选项，再退回全库
        if (candidates.length < 2) {
            (row.options || []).forEach(function (p) {
                if (candidates.length >= 2) return;
                add(p, allIndex[p]);
            });
        }
        if (candidates.length < 2) {
            Object.keys(allIndex).forEach(function (p) {
                if (candidates.length >= 2) return;
                add(p, allIndex[p]);
            });
        }
        return [correct].concat(candidates.slice(0, 2));
    }

    function getMemory() {
        try {
            const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
            return normalizeMemory(raw ? JSON.parse(raw) : null);
        } catch (e) {
            return normalizeMemory(null);
        }
    }

    function saveMemory(source) {
        const next = normalizeMemory(source);
        try {
            localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(next));
            return next;
        } catch (e) {
            return null;
        }
    }

    function recordMemoryAnswer(card, grade, options) {
        const opt = options && typeof options === 'object' ? options : {};
        const api = global.WorkbenchMemory;
        const current = getMemory();
        let next;
        if (api && typeof api.recordAnswer === 'function') {
            next = api.recordAnswer(current, card, grade, opt.at == null ? Date.now() : opt.at, opt);
        } else {
            const rawKey = card && typeof card === 'object' ? (card.key || card.text || card.word || card.id) : card;
            const key = String(rawKey || '').trim().toLowerCase();
            if (!key) return null;
            const previous = current.words[key] || {};
            const isAgain = String(grade || '').toLowerCase() === 'again' || grade === false;
            const row = Object.assign({}, previous, {
                key: key,
                track: String((card && card.track) || previous.track || 'unknown'),
                box: isAgain ? 1 : Math.min(5, Math.max(1, Number(previous.box) || 1) + 1),
                attempts: (Number(previous.attempts) || 0) + 1,
                wrong: (Number(previous.wrong) || 0) + (isAgain ? 1 : 0),
                correct: (Number(previous.correct) || 0) + (isAgain ? 0 : 1),
                lastGrade: isAgain ? 'again' : 'good',
                lastSeenAt: opt.at == null ? Date.now() : opt.at,
                dueAt: isAgain ? (opt.at == null ? Date.now() : opt.at) : Date.now() + 86400000 * 3
            });
            next = fallbackMemory(current);
            next.words[key] = row;
        }
        const saved = saveMemory(next);
        if (!saved) return null;
        const key = api && typeof api.keyOf === 'function'
            ? api.keyOf(card)
            : String(card && typeof card === 'object' ? (card.key || card.text || card.word || card.id) : card || '').trim().toLowerCase();
        return saved.words[key] || null;
    }

    /**
     * 统一学习结果入口。
     * unknown 是孩子主动求助，不是答错：只写共享复习账本，不写错题、不扣阳光。
     */
    function recordLearningOutcome(card, outcome, options) {
        const opt = options && typeof options === 'object' ? options : {};
        const value = String(outcome || '').trim().toLowerCase();
        const api = global.WorkbenchMemory;
        if (value === 'unknown' && api && typeof api.recordOutcome === 'function') {
            const current = getMemory();
            const next = api.recordOutcome(current, card, 'unknown', opt.at == null ? Date.now() : opt.at, opt);
            const saved = saveMemory(next);
            if (!saved) return null;
            const key = api.keyOf(card);
            return saved.words[key] || null;
        }
        if (api && typeof api.recordOutcome === 'function') {
            const current = getMemory();
            const next = api.recordOutcome(current, card, value || 'unknown', opt.at == null ? Date.now() : opt.at, opt);
            const saved = saveMemory(next);
            if (!saved) return null;
            const key = api.keyOf(card);
            return saved.words[key] || null;
        }
        return value === 'unknown' ? recordMemoryAnswer(card, 'again', opt) : recordMemoryAnswer(card, opt.grade || 'good', opt);
    }

    /** 词卡答题回流：只写 courseProgress.minecraft.mastery，零阳光、零 worldGames 改动 */
    function recordWordAnswer(word, correct, extra) {
        const engine = global.PersonalWorkbenchPreschoolEnglishVocab;
        const courses = global.PersonalWorkbenchChildCourses;
        const id = String(word || '').trim().toLowerCase();
        if (!id) return null;
        const opts = extra && typeof extra === 'object' ? extra : {};
        const state = readState();
        const current = (state.courseProgress && state.courseProgress.minecraft)
            || (engine && typeof engine.createDefaultProgress === 'function' ? engine.createDefaultProgress() : { mastery: {} });
        let next;
        if (engine && typeof engine.markKnown === 'function'
            && courses && typeof courses.saveMinecraft === 'function') {
            const rules = engine.getRuntimeRules ? engine.getRuntimeRules() : undefined;
            next = engine.markKnown(current, id, !!correct, today(), rules, {
                source: opts.source || 'workbench'
            });
            state.courseProgress = courses.saveMinecraft(state.courseProgress || {}, next);
        } else {
            const mastery = Object.assign({}, current.mastery && typeof current.mastery === 'object' ? current.mastery : {});
            mastery[id] = bumpMasteryItem(mastery[id], !!correct, today(), { source: opts.source || 'workbench' });
            next = Object.assign({}, current, { mastery: mastery });
            state.courseProgress = Object.assign({}, state.courseProgress || {}, { minecraft: next });
        }
        if (!writeState(state)) return null;
        return next.mastery[id] || null;
    }

    function shiftDay(date, days) {
        const raw = String(date || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const t = new Date(raw + 'T00:00:00');
        if (Number.isNaN(t.getTime())) return raw;
        t.setDate(t.getDate() + (Number(days) || 0));
        const y = t.getFullYear();
        const m = String(t.getMonth() + 1);
        const d = String(t.getDate());
        return y + '-' + (m.length < 2 ? '0' + m : m) + '-' + (d.length < 2 ? '0' + d : d);
    }

    function bumpMasteryItem(item, correct, date, extra) {
        const rec = item && typeof item === 'object' ? item : {};
        const dates = Array.isArray(rec.dates) ? rec.dates.slice() : [];
        if (date && dates.indexOf(date) < 0) dates.push(date);
        const attempts = Math.max(0, Number(rec.attempts) || 0) + 1;
        const hits = Math.max(0, Number(rec.correct) || 0) + (correct ? 1 : 0);
        const next = {
            state: correct ? (rec.state === 'ready' || rec.state === 'maintenance' ? rec.state : 'practicing') : (rec.state || 'introduced'),
            dates: dates,
            attempts: attempts,
            correct: hits,
            nextReview: shiftDay(date, correct ? 1 : 0)
        };
        if (extra && extra.literacy) {
            const types = Array.isArray(rec.activityTypes) ? rec.activityTypes.slice() : [];
            const activityType = extra.activityType || 'learning-defense';
            if (types.indexOf(activityType) < 0) types.push(activityType);
            next.activityTypes = types;
            next.accuracy = attempts ? hits / attempts : 0;
            next.sunlightDelta = 0;
        } else if (extra && extra.source) {
            const sources = Array.isArray(rec.sources) ? rec.sources.slice() : [];
            if (sources.indexOf(extra.source) < 0) sources.push(extra.source);
            next.sources = sources;
        }
        return next;
    }

    /** 配菜写回分科掌握度，不走 minecraft.mastery */
    function recordSubjectAnswer(track, key, correct, options) {
        const courses = global.PersonalWorkbenchChildCourses;
        const id = String(key || '').trim();
        const field = String(track || '').trim();
        const opts = options && typeof options === 'object' ? options : {};
        if (!id) return null;
        if (field === 'minecraft' || field === 'english') return recordWordAnswer(id, correct);
        const state = readState();
        const date = today();
        if (field === 'literacy') {
            const engine = global.PersonalWorkbenchPreschoolLiteracy;
            const current = (state.courseProgress && state.courseProgress.literacy) || { mastery: {} };
            const activityType = String(opts.activityType || 'learning-defense');
            let next;
            if (engine && typeof engine.recordAttempt === 'function') {
                next = engine.recordAttempt(current, id, { date: date, correct: !!correct, activityType: activityType });
            } else {
                const mastery = Object.assign({}, current.mastery && typeof current.mastery === 'object' ? current.mastery : {});
                mastery[id] = bumpMasteryItem(mastery[id], !!correct, date, { literacy: true, activityType: activityType });
                next = { mastery: mastery };
            }
            state.courseProgress = courses && typeof courses.saveLiteracy === 'function'
                ? courses.saveLiteracy(state.courseProgress || {}, next)
                : Object.assign({}, state.courseProgress || {}, { literacy: next });
            if (!writeState(state)) return null;
            return next.mastery[id] || null;
        }
        const current = (state.courseProgress && state.courseProgress[field]) || { mastery: {} };
        const mastery = Object.assign({}, current.mastery && typeof current.mastery === 'object' ? current.mastery : {});
        mastery[id] = bumpMasteryItem(mastery[id], !!correct, date);
        const next = { mastery: mastery };
        state.courseProgress = courses && typeof courses.saveSubject === 'function'
            ? courses.saveSubject(state.courseProgress || {}, field, next)
            : Object.assign({}, state.courseProgress || {}, { [field]: next });
        if (!writeState(state)) return null;
        return next.mastery[id] || null;
    }

    function ensureWorldGames(growth) {
        if (!growth.worldGames || typeof growth.worldGames !== 'object') growth.worldGames = {};
        if (!growth.worldGames.meta || typeof growth.worldGames.meta !== 'object') {
            growth.worldGames.meta = defaultMeta();
        }
        return growth.worldGames;
    }

    function defaultMeta() {
        return {
            adventurePoints: 0,
            adventureLevel: 1,
            playDates: [],
            playByDay: {}, // { '2026-08-07': { 'garden-defense': true, ... } }
            badges: [],
            weekly: { weekStart: '', playedDays: [], tripleDays: 0, goalPlayDays: 4, goalTriple: 1 },
            playPass: null,
            playPasses: {}
        };
    }

    function passRules(gameId) {
        return PLAY_PASS_BY_GAME[gameId] || PLAY_PASS;
    }

    function emptyPlayPass(date, gameId) {
        const rules = passRules(gameId);
        return {
            date: date,
            free: rules.dailyFree,
            learned: 0,
            redeemed: 0,
            used: 0
        };
    }

    function ensurePlayPasses(meta) {
        if (!meta.playPasses || typeof meta.playPasses !== 'object') meta.playPasses = {};
        if (meta.playPass && typeof meta.playPass === 'object' && !meta.playPasses['garden-defense']) {
            meta.playPasses['garden-defense'] = meta.playPass;
        }
        return meta.playPasses;
    }

    function normalizePlayPass(meta, date, gameId) {
        const day = date || today();
        const id = gameId || 'garden-defense';
        const slots = ensurePlayPasses(meta);
        if (!slots[id] || typeof slots[id] !== 'object' || slots[id].date !== day) {
            slots[id] = emptyPlayPass(day, id);
        }
        const rules = passRules(id);
        const pass = slots[id];
        pass.free = rules.dailyFree;
        pass.learned = Math.max(0, Math.min(rules.maxLearned, Number(pass.learned) || 0));
        pass.redeemed = Math.max(0, Math.min(rules.maxRedeemed, Number(pass.redeemed) || 0));
        pass.used = Math.max(0, Number(pass.used) || 0);
        if (id === 'garden-defense') meta.playPass = pass;
        return pass;
    }

    function playPassView(pass, gameId) {
        const rules = passRules(gameId);
        const remaining = Math.max(0, pass.free + pass.learned + pass.redeemed - pass.used);
        return {
            remaining: remaining,
            used: pass.used,
            learned: pass.learned,
            redeemed: pass.redeemed,
            redeemCost: rules.redeemCost,
            canRedeem: pass.redeemed < rules.maxRedeemed,
            canLearn: pass.learned < rules.maxLearned,
            exhausted: remaining <= 0,
            dailyFree: rules.dailyFree,
            sessionMinutes: rules.sessionMinutes || 0
        };
    }

    function getPlayPass(gameId, date) {
        const state = readState();
        const meta = ensureWorldGames(state.growth).meta;
        const id = gameId || 'garden-defense';
        return playPassView(normalizePlayPass(meta, date || today(), id), id);
    }

    function consumePlayPass(gameId, options) {
        const opts = options || {};
        const date = opts.date || today();
        const id = gameId || 'garden-defense';
        const state = readState();
        const meta = ensureWorldGames(state.growth).meta;
        const pass = normalizePlayPass(meta, date, id);
        const view = playPassView(pass, id);
        if (view.remaining <= 0) {
            return { ok: false, reason: 'today-rest', pass: view };
        }
        pass.used += 1;
        writeState(state);
        const play = recordPlaySession(id, { date: date });
        return { ok: true, pass: playPassView(pass, id), play: play };
    }

    // "学完才能继续"：今日是否有学习证据（memory 回流 ∪ 卡墙 mastery），供 redeem 闸门使用。
    function learntToday() {
        const date = today();
        const start = new Date(date + 'T00:00:00').getTime();
        const memory = getMemory();
        const rows = memory && memory.words ? memory.words : {};
        if (Object.keys(rows).some(function (key) { return Number(rows[key].lastSeenAt) >= start; })) return true;
        const progress = ((readState() || {}).courseProgress) || {};
        return Object.keys(progress).some(function (subject) {
            const mastery = progress[subject] && progress[subject].mastery;
            if (!mastery || typeof mastery !== 'object') return false;
            return Object.keys(mastery).some(function (key) {
                const row = mastery[key];
                if (!row || typeof row !== 'object') return false;
                return String(row.nextReview || '') === date || (Array.isArray(row.dates) && row.dates.indexOf(date) >= 0);
            });
        });
    }

    function grantPlayPass(gameId, options) {
        const opts = options || {};
        const source = opts.source || 'learn';
        const date = opts.date || today();
        const id = gameId || 'garden-defense';
        const state = readState();
        const growth = state.growth || (state.growth = {});
        const meta = ensureWorldGames(growth).meta;
        const pass = normalizePlayPass(meta, date, id);
        const rules = passRules(id);
        if (source === 'learn') {
            if (pass.learned >= rules.maxLearned) {
                return { ok: false, granted: false, reason: 'learn-cap', pass: playPassView(pass, id) };
            }
            pass.learned += 1;
            writeState(state);
            return { ok: true, granted: true, pass: playPassView(pass, id) };
        }
        if (source === 'redeem') {
            if (pass.redeemed >= rules.maxRedeemed) {
                return { ok: false, granted: false, reason: 'redeem-cap', pass: playPassView(pass, id) };
            }
            // L2：阳光兑换也要求今日先学过（把"学完才能继续游戏"钉死，防零学习纯兑换）
            if (!learntToday()) {
                return { ok: false, granted: false, reason: 'learn-first', pass: playPassView(pass, id) };
            }
            const have = Math.max(0, Number(growth.sunlight) || 0);
            if (have < rules.redeemCost) {
                return { ok: false, granted: false, reason: '阳光不够', pass: playPassView(pass, id) };
            }
            growth.sunlight = have - rules.redeemCost;
            pass.redeemed += 1;
            writeState(state);
            return { ok: true, granted: true, pass: playPassView(pass, id) };
        }
        return { ok: false, granted: false, reason: 'unknown-source', pass: playPassView(pass, id) };
    }

    function defaultProgress(gameId) {
        if (gameId === 'garden-defense') {
            return { unlockedStage: 1, clearedStages: [], stars: {}, bestWave: 0, totalWins: 0, totalDefeated: 0 };
        }
        if (gameId === 'voxel-adventure') {
            return {
                rank: 1,
                crystalsTotal: 0,
                blocksBuilt: 0,
                questsDone: [],
                unlockedLevel: 1,
                clearedLevels: [],
                unlockedTools: ['grass', 'stone', 'crystal', 'erase'],
                biome: 'meadow'
            };
        }
        if (gameId === 'platform-quest') {
            return { unlockedLevel: 1, clearedLevels: [], stars: {}, coinsTotal: 0, bestTime: {} };
        }
        if (gameId === 'voxel-learning') {
            return { cardsCompleted: 0, cardsRequired: 10, settled: false, clearedStages: [] };
        }
        if (gameId === 'platform-learning') {
            return { cardsCompleted: 0, cardsRequired: 10, settled: false, clearedLevels: [] };
        }
        if (gameId === 'blocklegend') {
            return {
                unlockedLevel: 1,
                coined: 0,
                learnedIds: [],
                rightCount: 0,
                wrongCount: 0,
                clearedLevels: [],
                bag: {},
                gear: {}
            };
        }
        return {};
    }

    function getProgress(gameId) {
        const state = readState();
        const wg = ensureWorldGames(state.growth);
        if (!wg[gameId] || typeof wg[gameId] !== 'object') wg[gameId] = defaultProgress(gameId);
        return { state: state, progress: wg[gameId] };
    }

    function saveProgress(gameId, progress) {
        const state = readState();
        ensureWorldGames(state.growth)[gameId] = progress;
        writeState(state);
        return progress;
    }

    function gardenClears(wg) {
        const p = wg['garden-defense'] || {};
        return Array.isArray(p.clearedStages) ? p.clearedStages.length : 0;
    }
    function voxelQuests(wg) {
        const p = wg['voxel-adventure'] || {};
        if (Array.isArray(p.clearedLevels) && p.clearedLevels.length) return p.clearedLevels.length;
        return Array.isArray(p.questsDone) ? p.questsDone.length : 0;
    }
    function platformClears(wg) {
        const p = wg['platform-quest'] || {};
        return Array.isArray(p.clearedLevels) ? p.clearedLevels.length : 0;
    }
    function blocklegendClears(wg) {
        const p = wg.blocklegend || {};
        return Array.isArray(p.clearedLevels) ? p.clearedLevels.length : 0;
    }
    function platformThreeStars(wg) {
        const p = wg['platform-quest'] || {};
        const stars = p.stars || {};
        let n = 0;
        for (let i = 1; i <= PLATFORM_LEVEL_TOTAL; i += 1) {
            if (Number(stars[i]) >= 3) n += 1;
        }
        return n >= PLATFORM_LEVEL_TOTAL;
    }
    function playDays(wg) {
        const m = wg.meta || defaultMeta();
        return Array.isArray(m.playDates) ? m.playDates.length : 0;
    }
    function totalStars(wg) {
        let n = 0;
        ['garden-defense', 'platform-quest'].forEach(function (id) {
            const stars = (wg[id] && wg[id].stars) || {};
            Object.keys(stars).forEach(function (k) { n += Number(stars[k]) || 0; });
        });
        return n;
    }
    function worldsPlayedToday(dayMap) {
        const day = dayMap || {};
        return GAME_IDS.filter(function (id) { return day[id]; }).length;
    }

    function hasTripleDay(wg) {
        const by = (wg.meta && wg.meta.playByDay) || {};
        return Object.keys(by).some(function (d) {
            return worldsPlayedToday(by[d] || {}) >= 3;
        });
    }

    function adventureRankFromPoints(points) {
        let rank = ADVENTURE_RANKS[0];
        ADVENTURE_RANKS.forEach(function (r) {
            if (points >= r.need) rank = r;
        });
        return rank;
    }

    function walletFromState(state) {
        const g = state.growth || {};
        return {
            sunlight: Math.max(0, Number(g.sunlight) || 0),
            totalSunlightEarned: Math.max(0, Number(g.totalSunlightEarned) || 0),
            petXp: Math.max(0, Number(g.unicorn && g.unicorn.xp) || Number(g.totalSunlightEarned) || 0),
            petLevel: Math.floor((Math.max(0, Number(g.unicorn && g.unicorn.xp) || 0)) / 100) + 1,
            defenseEnergy: Math.max(0, Number(g.garden && g.garden.defenseEnergy) || 0)
        };
    }

    function getWallet() {
        return walletFromState(readState());
    }

    function dailyAwardedSun(growth, date) {
        const prefix = `game-sun:${date}:`;
        return (growth.awardedIds || []).filter(function (id) {
            return String(id).indexOf(prefix) === 0;
        }).reduce(function (sum, id) {
            const parts = String(id).split(':');
            return sum + (Number(parts[parts.length - 1]) || 0);
        }, 0);
    }

    function awardSunlight(options) {
        const opts = options || {};
        const gameId = String(opts.gameId || 'world');
        const reason = String(opts.reason || 'game-reward');
        const eventKey = String(opts.eventKey || reason);
        const want = Math.max(0, Math.min(40, Math.floor(Number(opts.amount) || 0)));
        const date = opts.date || today();
        const sharedState = opts.state && typeof opts.state === 'object' ? opts.state : null;
        const state = sharedState || readState();
        const growth = state.growth || (state.growth = {});
        if (!Array.isArray(growth.awardedIds)) growth.awardedIds = [];
        if (!growth.unicorn || typeof growth.unicorn !== 'object') growth.unicorn = { xp: 0, level: 1 };

        const eventId = `game:${gameId}:${eventKey}`;
        if (growth.awardedIds.includes(eventId)) {
            return { ok: false, awarded: false, amount: 0, reason: '这份奖励已经领过了', wallet: walletFromState(state) };
        }

        const already = dailyAwardedSun(growth, date);
        const room = Math.max(0, DAILY_GAME_SUN_CAP - already);
        const amount = Math.min(want, room);
        if (amount <= 0) {
            return { ok: false, awarded: false, amount: 0, reason: '今日游戏阳光已达上限，明天再来', wallet: walletFromState(state) };
        }

        growth.awardedIds.push(eventId);
        growth.awardedIds.push(`game-sun:${date}:${gameId}:${amount}`);
        growth.sunlight = Math.max(0, Number(growth.sunlight) || 0) + amount;
        growth.totalSunlightEarned = Math.max(0, Number(growth.totalSunlightEarned) || 0) + amount;
        growth.unicorn.xp = Math.max(0, Number(growth.unicorn.xp) || 0) + amount;
        growth.unicorn.level = Math.floor(growth.unicorn.xp / 100) + 1;

        if (opts.energy && growth.garden) {
            growth.garden.defenseEnergy = Math.min(9, Math.max(0, Number(growth.garden.defenseEnergy) || 0) + Math.min(2, Number(opts.energy) || 0));
        }

        if (!sharedState) writeState(state);
        return { ok: true, awarded: true, amount: amount, reason: '', wallet: walletFromState(state) };
    }

    function spendSunlight(amount) {
        const cost = Math.max(0, Math.floor(Number(amount) || 0));
        const state = readState();
        const growth = state.growth || {};
        const have = Math.max(0, Number(growth.sunlight) || 0);
        if (have < cost) return { ok: false, reason: '阳光不够', wallet: getWallet() };
        growth.sunlight = have - cost;
        writeState(state);
        return { ok: true, reason: '', wallet: getWallet() };
    }

    function ensureWeekly(meta, dateStr) {
        const ws = weekStart(dateStr);
        if (!meta.weekly || meta.weekly.weekStart !== ws) {
            meta.weekly = {
                weekStart: ws,
                playedDays: [],
                tripleDays: 0,
                goalPlayDays: 4,
                goalTriple: 1,
                claimedPlayDays: false,
                claimedTriple: false
            };
        }
        return meta.weekly;
    }

    function addAdventurePoints(meta, points) {
        meta.adventurePoints = Math.max(0, Number(meta.adventurePoints) || 0) + Math.max(0, points || 0);
        const rank = adventureRankFromPoints(meta.adventurePoints);
        meta.adventureLevel = rank.level;
        meta.adventureTitle = rank.title;
        return rank;
    }

    /**
     * 记录一次游玩（打开或通关都可调）
     * 每日每世界只计 1 次打卡戳；三戳全勤小奖；计入周进度与里程碑
     */
    function recordPlaySession(gameId, options) {
        const opts = options || {};
        if (GAME_IDS.indexOf(gameId) === -1) return { ok: false, reason: '未知世界' };
        const date = opts.date || today();
        const state = readState();
        const growth = state.growth || (state.growth = {});
        const wg = ensureWorldGames(growth);
        const meta = wg.meta;
        if (!meta.playByDay || typeof meta.playByDay !== 'object') meta.playByDay = {};
        if (!Array.isArray(meta.playDates)) meta.playDates = [];
        if (!Array.isArray(meta.badges)) meta.badges = [];

        if (!meta.playByDay[date]) meta.playByDay[date] = {};
        const dayMap = meta.playByDay[date];
        const firstTodayWorld = !dayMap[gameId];
        dayMap[gameId] = true;

        if (meta.playDates.indexOf(date) === -1) meta.playDates.push(date);
        meta.playDates.sort();

        const weekly = ensureWeekly(meta, date);
        if (weekly.playedDays.indexOf(date) === -1) weekly.playedDays.push(date);

        const worldsToday = worldsPlayedToday(dayMap);
        const isTriple = worldsToday >= 3;
        if (isTriple && weekly.tripleDays < 1) weekly.tripleDays = 1;

        const awards = [];
        if (firstTodayWorld) {
            addAdventurePoints(meta, 1);
            const playAward = awardSunlight({
                state: state,
                gameId: 'meta',
                eventKey: 'daily-play:' + date + ':' + gameId,
                amount: 3,
                reason: '今日游玩'
            });
            if (playAward.awarded) awards.push({ kind: 'play', amount: playAward.amount, title: '今日游玩 +3' });
        }

        // 三界同日全勤
        if (isTriple) {
            addAdventurePoints(meta, 3);
            const tripleAward = awardSunlight({
                state: state,
                gameId: 'meta',
                eventKey: 'daily-triple:' + date,
                amount: 8,
                reason: '三界同日'
            });
            if (tripleAward.awarded) awards.push({ kind: 'triple', amount: tripleAward.amount, title: '三界同日 +8' });
        }

        // 周目标：游玩天数
        if (!weekly.claimedPlayDays && weekly.playedDays.length >= weekly.goalPlayDays) {
            weekly.claimedPlayDays = true;
            addAdventurePoints(meta, 5);
            const w1 = awardSunlight({
                state: state,
                gameId: 'meta',
                eventKey: 'weekly-play:' + weekly.weekStart,
                amount: 15,
                reason: '本周游玩达标'
            });
            if (w1.awarded) awards.push({ kind: 'weekly', amount: w1.amount, title: '本周游玩达标 +15' });
        }
        if (!weekly.claimedTriple && weekly.tripleDays >= weekly.goalTriple) {
            weekly.claimedTriple = true;
            addAdventurePoints(meta, 5);
            const w2 = awardSunlight({
                state: state,
                gameId: 'meta',
                eventKey: 'weekly-triple:' + weekly.weekStart,
                amount: 12,
                reason: '本周三界日'
            });
            if (w2.awarded) awards.push({ kind: 'weekly', amount: w2.amount, title: '本周三界日 +12' });
        }

        // 里程碑
        const msAwards = checkMilestones(state, wg, meta);
        awards.push.apply(awards, msAwards);

        writeState(state);
        return {
            ok: true,
            firstTodayWorld: firstTodayWorld,
            worldsToday: worldsToday,
            isTriple: isTriple,
            awards: awards,
            meta: getMetaSummary(state)
        };
    }

    function checkMilestones(state, wg, meta) {
        const awards = [];
        const growth = state.growth;
        if (!Array.isArray(growth.awardedIds)) growth.awardedIds = [];
        MILESTONES.forEach(function (ms) {
            if (meta.badges.indexOf(ms.id) !== -1) return;
            if (!ms.need(wg)) return;
            meta.badges.push(ms.id);
            addAdventurePoints(meta, ms.points || 0);
            const a = awardSunlight({
                state: state,
                gameId: 'meta',
                eventKey: 'milestone:' + ms.id,
                amount: ms.sun || 10,
                reason: ms.title
            });
            awards.push({
                kind: 'milestone',
                id: ms.id,
                title: ms.title,
                amount: a.awarded ? a.amount : 0,
                claimed: a.awarded,
                reason: a.reason
            });
        });
        return awards;
    }

    /** 通关/完成任务时额外加冒险点（非每日戳） */
    function grantProgressPoints(gameId, points, eventKey) {
        const state = readState();
        const wg = ensureWorldGames(state.growth);
        const meta = wg.meta;
        addAdventurePoints(meta, points || 0);
        writeState(state);
        // 里程碑可能因进度变化解锁
        const again = readState();
        const awards = checkMilestones(again, ensureWorldGames(again.growth), ensureWorldGames(again.growth).meta);
        writeState(again);
        return { ok: true, meta: getMetaSummary(again), awards: awards };
    }

    function getMetaSummary(optionalState) {
        const state = optionalState || readState();
        const wg = ensureWorldGames(state.growth || {});
        const meta = wg.meta || defaultMeta();
        const date = today();
        const dayMap = (meta.playByDay && meta.playByDay[date]) || {};
        const weekly = ensureWeekly(meta, date);
        const rank = adventureRankFromPoints(meta.adventurePoints || 0);
        const nextRank = ADVENTURE_RANKS.find(function (r) { return r.need > (meta.adventurePoints || 0); }) || null;
        const badges = MILESTONES.map(function (ms) {
            return {
                id: ms.id,
                title: ms.title,
                desc: ms.desc,
                unlocked: (meta.badges || []).indexOf(ms.id) !== -1
            };
        });
        return {
            adventurePoints: meta.adventurePoints || 0,
            adventureLevel: rank.level,
            adventureTitle: rank.title,
            nextRank: nextRank ? { level: nextRank.level, title: nextRank.title, need: nextRank.need } : null,
            playDaysTotal: Array.isArray(meta.playDates) ? meta.playDates.length : 0,
            todayWorlds: GAME_IDS.map(function (id) {
                return { id: id, played: Boolean(dayMap[id]) };
            }),
            worldsTodayCount: GAME_IDS.filter(function (id) { return dayMap[id]; }).length,
            weekly: {
                weekStart: weekly.weekStart,
                playedDays: weekly.playedDays.length,
                goalPlayDays: weekly.goalPlayDays,
                tripleDone: weekly.tripleDays >= weekly.goalTriple,
                claimedPlayDays: Boolean(weekly.claimedPlayDays),
                claimedTriple: Boolean(weekly.claimedTriple)
            },
            badges: badges,
            badgeUnlocked: badges.filter(function (b) { return b.unlocked; }).length,
            badgeTotal: badges.length,
            playPass: playPassView(normalizePlayPass(meta, date, 'garden-defense'), 'garden-defense'),
            playPasses: REWARD_GAME_IDS.reduce(function (acc, id) {
                acc[id] = playPassView(normalizePlayPass(meta, date, id), id);
                return acc;
            }, {}),
            bonuses: {
                gardenStartSun: rank.gardenStartSun,
                platformCoinBonus: rank.platformCoinBonus,
                voxelCrystalBonus: rank.voxelCrystalBonus
            },
            gardenClears: gardenClears(wg),
            voxelQuests: voxelQuests(wg),
            platformClears: platformClears(wg),
            totalStars: totalStars(wg)
        };
    }

    function getMetaBonuses() {
        return getMetaSummary().bonuses;
    }

    /**
     * 本周冒险家长报告（工作台成长页 / 家长页共用）
     */
    function getWeeklyReport(optionalDate) {
        const date = optionalDate || today();
        const state = readState();
        const growth = state.growth || {};
        const wg = ensureWorldGames(growth);
        const meta = wg.meta || defaultMeta();
        const summary = getMetaSummary(state);
        const weekly = ensureWeekly(meta, date);
        const ws = weekly.weekStart;
        const days = [];
        for (let i = 0; i < 7; i += 1) {
            const d = dateOffset(ws, i);
            const dayMap = (meta.playByDay && meta.playByDay[d]) || {};
            const worlds = GAME_IDS.filter(function (id) { return dayMap[id]; });
            days.push({
                date: d,
                weekday: ['一', '二', '三', '四', '五', '六', '日'][i],
                played: worlds.length > 0,
                worlds: worlds,
                worldCount: worlds.length,
                isTriple: worlds.length >= 3,
                isToday: d === date,
                isFuture: d > date
            });
        }
        // 本周游戏阳光（从 awardedIds 统计 game-sun:日期:）
        const awarded = Array.isArray(growth.awardedIds) ? growth.awardedIds : [];
        let weekSun = 0;
        days.forEach(function (day) {
            const prefix = `game-sun:${day.date}:`;
            awarded.forEach(function (id) {
                if (String(id).indexOf(prefix) === 0) {
                    const parts = String(id).split(':');
                    weekSun += Number(parts[parts.length - 1]) || 0;
                }
            });
        });
        const worldBreakdown = GAME_IDS.map(function (id) {
            let playDaysCount = 0;
            days.forEach(function (day) {
                if (day.worlds.indexOf(id) !== -1) playDaysCount += 1;
            });
            const labels = {
                'garden-defense': { label: '花园保卫', unit: '关', done: gardenClears(wg), total: 18 },
                'learning-defense': { label: '知识花园', unit: '关', done: Array.isArray(wg['learning-defense'] && wg['learning-defense'].clearedStages) ? wg['learning-defense'].clearedStages.length : 0, total: 1 },
                'voxel-adventure': { label: '方块世界', unit: '关', done: voxelQuests(wg), total: (global.VoxelQuests && global.VoxelQuests.list ? global.VoxelQuests.list.length : 12) },
                'voxel-learning': { label: '方块学习', unit: '关', done: Array.isArray(wg['voxel-learning'] && wg['voxel-learning'].clearedStages) ? wg['voxel-learning'].clearedStages.length : 0, total: 1 },
                'platform-quest': { label: '横版闯关', unit: '关', done: platformClears(wg), total: PLATFORM_LEVEL_TOTAL },
                'platform-learning': { label: '闯关学习', unit: '关', done: Array.isArray(wg['platform-learning'] && wg['platform-learning'].clearedLevels) ? wg['platform-learning'].clearedLevels.length : 0, total: 1 },
                'blocklegend': { label: '我的方块学园', unit: '关', done: blocklegendClears(wg), total: 12 }
            };
            const L = labels[id];
            let fact = '';
            if (id === 'voxel-adventure') {
                const snap = (wg['voxel-adventure'] || {}).homeSnapshot || {};
                if (snap.date || snap.blocks) {
                    fact = '家园 ' + (Number(snap.blocks) || 0) + ' 块' + (snap.date ? '，更新于 ' + snap.date : '');
                }
            }
            return {
                id: id,
                label: L.label,
                playDays: playDaysCount,
                done: L.done,
                total: L.total,
                unit: L.unit,
                percent: Math.round((L.done / L.total) * 100),
                fact: fact
            };
        });
        const badgesUnlocked = (summary.badges || []).filter(function (b) { return b.unlocked; });
        const tips = [];
        if (weekly.playedDays.length < weekly.goalPlayDays) {
            tips.push(`本周再玩 ${weekly.goalPlayDays - weekly.playedDays.length} 天，可领周游玩达标奖励。`);
        } else {
            tips.push('本周游玩天数已达标，很棒！');
        }
        if (!weekly.tripleDays) {
            tips.push('试着同一天点进三个世界各玩一会儿，可完成「三界同日」。');
        } else {
            tips.push('本周已完成三界同日。');
        }
        if (summary.gardenClears < 3) tips.push('花园先通关 3 关，可点亮「三关守卫」徽章。');
        else if (summary.platformClears < 3) tips.push('横版再通 3 关，可点亮「三旗冲线」。');
        else if (summary.platformClears < 10) tips.push('横版再通到 10 关，可点亮「彩虹终点」。');
        else if (summary.platformClears < PLATFORM_LEVEL_TOTAL) tips.push('横版还有后半程，通完全部 ' + PLATFORM_LEVEL_TOTAL + ' 关可点亮「终旗旅伴」。');
        else if (!platformThreeStars(wg)) tips.push('横版每关再冲 3 星，可点亮「闪电探险家」。');
        else if (summary.voxelQuests < 5) tips.push('方块完成 5 个任务，可点亮「矿工新手」。');

        return {
            weekStart: ws,
            weekEnd: dateOffset(ws, 6),
            today: date,
            playedDays: weekly.playedDays.length,
            goalPlayDays: weekly.goalPlayDays,
            tripleDone: weekly.tripleDays >= weekly.goalTriple,
            weekSun: weekSun,
            dailyCap: DAILY_GAME_SUN_CAP,
            days: days,
            worlds: worldBreakdown,
            adventureLevel: summary.adventureLevel,
            adventureTitle: summary.adventureTitle,
            adventurePoints: summary.adventurePoints,
            playDaysTotal: summary.playDaysTotal,
            badges: badgesUnlocked,
            badgeUnlocked: summary.badgeUnlocked,
            badgeTotal: summary.badgeTotal,
            totalStars: summary.totalStars,
            bonuses: summary.bonuses,
            tips: tips.slice(0, 3),
            headline: weekly.playedDays.length === 0
                ? '本周还没开始冒险，打开任一世界玩一下吧。'
                : `本周已玩 ${weekly.playedDays.length} 天，冒险称号：${summary.adventureTitle}。`
        };
    }

    function backHref(theme) {
        const params = new URLSearchParams(location.search || '');
        const from = params.get('from');
        if (from) return from;
        return `../../preschool-workbench/index.html?theme=${encodeURIComponent(theme || 'garden-defense')}#overview`;
    }

    global.WorkbenchGameBridge = {
        STORAGE_KEY: STORAGE_KEY,
        MEMORY_STORAGE_KEY: MEMORY_STORAGE_KEY,
        DAILY_GAME_SUN_CAP: DAILY_GAME_SUN_CAP,
        GAME_IDS: GAME_IDS,
        worldsPlayedToday: worldsPlayedToday,
        PLATFORM_LEVEL_TOTAL: PLATFORM_LEVEL_TOTAL,
        ADVENTURE_RANKS: ADVENTURE_RANKS,
        themeAdventureTitle: themeAdventureTitle,
        MILESTONES: MILESTONES,
        today: today,
        readState: readState,
        writeState: writeState,
        getWallet: getWallet,
        getProgress: getProgress,
        saveProgress: saveProgress,
        defaultProgress: defaultProgress,
        awardSunlight: awardSunlight,
        spendSunlight: spendSunlight,
        backHref: backHref,
        recordPlaySession: recordPlaySession,
        grantProgressPoints: grantProgressPoints,
        getMetaSummary: getMetaSummary,
        getMetaBonuses: getMetaBonuses,
        getWeeklyReport: getWeeklyReport,
        adventureRankFromPoints: adventureRankFromPoints,
        countLiteracyKnown: countLiteracyKnown,
        playModsFromLiteracy: playModsFromLiteracy,
        getPlayMods: getPlayMods,
        recordWordAnswer: recordWordAnswer,
        recordSubjectAnswer: recordSubjectAnswer,
        getMemory: getMemory,
        drawLiteracyQuiz: drawLiteracyQuiz,
        saveMemory: saveMemory,
        recordMemoryAnswer: recordMemoryAnswer,
        recordLearningOutcome: recordLearningOutcome,
        PLAY_PASS: PLAY_PASS,
        PLAY_PASS_BY_GAME: PLAY_PASS_BY_GAME,
        getPlayPass: getPlayPass,
        consumePlayPass: consumePlayPass,
        grantPlayPass: grantPlayPass
    };
}(typeof window !== 'undefined' ? window : globalThis));
