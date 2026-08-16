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
        'voxel-adventure': Object.freeze({
            dailyFree: 1,
            maxLearned: 2,
            maxRedeemed: 2,
            redeemCost: 25,
            sessionMinutes: 12
        })
    });
    const REWARD_GAME_IDS = ['garden-defense', 'platform-quest', 'voxel-adventure'];
    const GAME_IDS = ['garden-defense', 'voxel-adventure', 'platform-quest', 'blocklegend'];
    const PLATFORM_LEVEL_TOTAL = 16;

    function countLiteracyKnown(state) {
        const mastery = state && state.courseProgress && state.courseProgress.literacy
            && state.courseProgress.literacy.mastery;
        return mastery && typeof mastery === 'object' ? Object.keys(mastery).length : 0;
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

    /** 词卡答题回流：只写 courseProgress.minecraft.mastery，零阳光、零 worldGames 改动 */
    function recordWordAnswer(word, correct) {
        const engine = global.PersonalWorkbenchPreschoolEnglishVocab;
        const courses = global.PersonalWorkbenchChildCourses;
        if (!word || !engine || typeof engine.markKnown !== 'function'
            || !courses || typeof courses.saveMinecraft !== 'function') return null;
        const state = readState();
        const current = (state.courseProgress && state.courseProgress.minecraft) || engine.createDefaultProgress();
        const next = engine.markKnown(current, word, !!correct, today());
        state.courseProgress = courses.saveMinecraft(state.courseProgress || {}, next);
        if (!writeState(state)) return null;
        return next.mastery[String(word).toLowerCase()] || null;
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

    function getWallet() {
        const state = readState();
        const g = state.growth || {};
        return {
            sunlight: Math.max(0, Number(g.sunlight) || 0),
            totalSunlightEarned: Math.max(0, Number(g.totalSunlightEarned) || 0),
            petXp: Math.max(0, Number(g.unicorn && g.unicorn.xp) || Number(g.totalSunlightEarned) || 0),
            petLevel: Math.floor((Math.max(0, Number(g.unicorn && g.unicorn.xp) || 0)) / 100) + 1,
            defenseEnergy: Math.max(0, Number(g.garden && g.garden.defenseEnergy) || 0)
        };
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
        const state = readState();
        const growth = state.growth || (state.growth = {});
        if (!Array.isArray(growth.awardedIds)) growth.awardedIds = [];
        if (!growth.unicorn || typeof growth.unicorn !== 'object') growth.unicorn = { xp: 0, level: 1 };

        const eventId = `game:${gameId}:${eventKey}`;
        if (growth.awardedIds.includes(eventId)) {
            return { ok: false, awarded: false, amount: 0, reason: '这份奖励已经领过了', wallet: getWallet() };
        }

        const already = dailyAwardedSun(growth, date);
        const room = Math.max(0, DAILY_GAME_SUN_CAP - already);
        const amount = Math.min(want, room);
        if (amount <= 0) {
            return { ok: false, awarded: false, amount: 0, reason: '今日游戏阳光已达上限，明天再来', wallet: getWallet() };
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

        writeState(state);
        return { ok: true, awarded: true, amount: amount, reason: '', wallet: getWallet() };
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
                'voxel-adventure': { label: '方块世界', unit: '关', done: voxelQuests(wg), total: (global.VoxelQuests && global.VoxelQuests.list ? global.VoxelQuests.list.length : 12) },
                'platform-quest': { label: '横版闯关', unit: '关', done: platformClears(wg), total: PLATFORM_LEVEL_TOTAL },
                'blocklegend': { label: '方块传奇', unit: '关', done: blocklegendClears(wg), total: 6 }
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
        DAILY_GAME_SUN_CAP: DAILY_GAME_SUN_CAP,
        GAME_IDS: GAME_IDS,
        worldsPlayedToday: worldsPlayedToday,
        PLATFORM_LEVEL_TOTAL: PLATFORM_LEVEL_TOTAL,
        ADVENTURE_RANKS: ADVENTURE_RANKS,
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
        PLAY_PASS: PLAY_PASS,
        PLAY_PASS_BY_GAME: PLAY_PASS_BY_GAME,
        getPlayPass: getPlayPass,
        consumePlayPass: consumePlayPass,
        grantPlayPass: grantPlayPass
    };
}(typeof window !== 'undefined' ? window : globalThis));
