(function (global) {
    'use strict';

    const STREAK_REWARDS = [
        { id: 'streak-1', days: 1, title: '第一颗星', description: '完成第一天点亮，给自己一束小阳光。', kind: 'sunlight', amount: 10, icon: 'star' },
        { id: 'streak-3', days: 3, title: '三日小火苗', description: '连续三天行动，解锁闪闪造型。', kind: 'style', styleId: 'style-sparkle', icon: 'sparkles' },
        { id: 'streak-7', days: 7, title: '七日小花园', description: '连续一周行动，获得一份额外阳光。', kind: 'sunlight', amount: 30, icon: 'flower-2' },
        { id: 'streak-14', days: 14, title: '两周守护者', description: '连续两周完成，解锁彩虹造型。', kind: 'style', styleId: 'style-rainbow', icon: 'rainbow' },
        { id: 'streak-30', days: 30, title: '月度闪耀', description: '连续一个月行动，解锁金色光环。', kind: 'style', styleId: 'style-halo', icon: 'crown' }
    ];

    const STYLE_CATALOG = [
        { id: 'style-classic', title: '星芒初见', description: '独角兽的初始造型。', unlockAtLevel: 1, icon: 'sparkle', tone: 'blue' },
        { id: 'style-sparkle', title: '闪闪星尘', description: '成长到 2 级，或连续三天解锁。', unlockAtLevel: 2, icon: 'sparkles', tone: 'orange' },
        { id: 'style-rainbow', title: '彩虹旅伴', description: '成长到 3 级，或连续两周解锁。', unlockAtLevel: 3, icon: 'rainbow', tone: 'lime' },
        { id: 'style-halo', title: '金色光环', description: '成长到 4 级，或连续三十天解锁。', unlockAtLevel: 4, icon: 'crown', tone: 'gold' }
    ];

    const PLANT_STAGES = [
        { stage: 0, title: '一粒种子', threshold: 0, icon: 'circle' },
        { stage: 1, title: '嫩芽', threshold: 80, icon: 'sprout' },
        { stage: 2, title: '小花园', threshold: 200, icon: 'flower-2' },
        { stage: 3, title: '星光树', threshold: 400, icon: 'trees' },
        { stage: 4, title: '闪耀森林', threshold: 700, icon: 'tree-pine' }
    ];

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function localDate(value) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const date = value instanceof Date ? value : new Date(value || Date.now());
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function dateOffset(date, days) {
        const value = new Date(`${localDate(date)}T12:00:00`);
        value.setDate(value.getDate() + days);
        return localDate(value);
    }

    function getPetLevel(xp) {
        return Math.floor(Math.max(0, Number(xp) || 0) / 100) + 1;
    }

    function getPlantStage(totalSunlight) {
        const value = Math.max(0, Number(totalSunlight) || 0);
        return PLANT_STAGES.reduce((stage, item) => value >= item.threshold ? item.stage : stage, 0);
    }

    function createDefaultGrowth() {
        return {
            sunlight: 0,
            totalSunlightEarned: 0,
            awardedIds: [],
            claimedRewardIds: [],
            pendingRewardIds: [],
            checkinDates: [],
            claimedStreakRewardIds: [],
            voiceEnabled: false,
            plant: { stage: 0, waterCount: 0, lastWateredDate: '' },
            unicorn: { name: '星芒', xp: 0, level: 1, activeStyleId: 'style-classic', unlockedStyleIds: ['style-classic'] },
            zombie: { active: false, defeated: 0, lastSpawnDate: '' },
            achievements: { unlocked: [], history: [], lastShown: '', seen: [] },
            pet: normalizePet(null),
            streakRepair: { cardsUsedByMonth: {}, repairedDates: [] }
        };
    }

    const STREAK_REPAIR_MONTHLY_CARDS = 2;

    function normalizeStreakRepair(input) {
        const source = input && typeof input === 'object' ? input : {};
        const cards = source.cardsUsedByMonth && typeof source.cardsUsedByMonth === 'object' ? source.cardsUsedByMonth : {};
        const used = {};
        Object.keys(cards).forEach(function (key) {
            if (/^\d{4}-\d{2}$/.test(key)) used[key] = Math.max(0, Number(cards[key]) || 0);
        });
        return {
            cardsUsedByMonth: used,
            repairedDates: asArray(source.repairedDates).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(String(item))).sort()
        };
    }

    function normalizePet(input) {
        if (global.PersonalWorkbenchPet && typeof global.PersonalWorkbenchPet.normalize === 'function') {
            return global.PersonalWorkbenchPet.normalize(input);
        }
        const source = input && typeof input === 'object' ? input : {};
        return {
            type: String(source.type || 'sunflower'),
            name: String(source.name || '小向日葵'),
            speciesId: String(source.speciesId || (source.type === 'crystal' ? 'mc-slime' : source.type === 'star' ? 'platform-star' : 'pvz-sunflower')),
            stage: Math.max(0, Math.min(3, Number(source.stage) || 0)),
            exp: Math.max(0, Number(source.exp) || 0),
            maxExp: Math.max(1, Number(source.maxExp) || 50),
            hunger: Math.max(0, Math.min(100, source.hunger == null ? 80 : Number(source.hunger) || 0)),
            lastUpdate: Number(source.lastUpdate) || Date.now(),
            feedCount: Math.max(0, Number(source.feedCount) || 0)
        };
    }

    function normalizeAchievements(input) {
        if (global.PersonalWorkbenchAchievements && typeof global.PersonalWorkbenchAchievements.normalizeAchievements === 'function') {
            return global.PersonalWorkbenchAchievements.normalizeAchievements(input);
        }
        const source = input && typeof input === 'object' ? input : {};
        return {
            unlocked: asArray(source.unlocked).filter(item => typeof item === 'string'),
            history: asArray(source.history).filter(item => item && typeof item === 'object' && typeof item.id === 'string'),
            lastShown: typeof source.lastShown === 'string' ? source.lastShown : '',
            seen: asArray(source.seen).filter(item => typeof item === 'string')
        };
    }

    function normalize(input) {
        const source = input && typeof input === 'object' ? input : {};
        const seed = createDefaultGrowth();
        const growth = Object.assign({}, seed, source, {
            sunlight: Math.max(0, Number(source.sunlight) || 0),
            totalSunlightEarned: Math.max(Number(source.totalSunlightEarned) || 0, Number(source.sunlight) || 0),
            awardedIds: asArray(source.awardedIds).filter(item => typeof item === 'string'),
            claimedRewardIds: asArray(source.claimedRewardIds).filter(item => typeof item === 'string'),
            pendingRewardIds: asArray(source.pendingRewardIds).filter(item => typeof item === 'string' && item),
            checkinDates: asArray(source.checkinDates).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(String(item))).sort(),
            claimedStreakRewardIds: asArray(source.claimedStreakRewardIds).filter(item => typeof item === 'string'),
            voiceEnabled: Boolean(source.voiceEnabled),
            plant: Object.assign(seed.plant, source.plant || {}),
            unicorn: Object.assign(seed.unicorn, source.unicorn || {}),
            zombie: Object.assign(seed.zombie, source.zombie || {}),
            achievements: normalizeAchievements(source.achievements),
            pet: normalizePet(source.pet),
            streakRepair: normalizeStreakRepair(source.streakRepair)
        });
        growth.plant.waterCount = Math.max(0, Number(growth.plant.waterCount) || 0);
        growth.unicorn.xp = Math.max(0, Number(growth.unicorn.xp) || growth.totalSunlightEarned);
        growth.unicorn.level = getPetLevel(growth.unicorn.xp);
        growth.unicorn.unlockedStyleIds = asArray(growth.unicorn.unlockedStyleIds).filter(item => typeof item === 'string');
        if (!growth.unicorn.unlockedStyleIds.includes('style-classic')) growth.unicorn.unlockedStyleIds.unshift('style-classic');
        growth.zombie.active = Boolean(growth.zombie.active);
        growth.zombie.defeated = Math.max(0, Number(growth.zombie.defeated) || 0);
        return derive(growth);
    }

    function calculateStreak(checkinDates, anchorDate) {
        const dates = new Set(asArray(checkinDates));
        let streak = 0;
        let cursor = localDate(anchorDate);
        while (dates.has(cursor)) {
            streak += 1;
            cursor = dateOffset(cursor, -1);
        }
        return streak;
    }

    function lastCheckin(checkinDates) {
        return asArray(checkinDates).slice().sort().pop() || '';
    }

    function derive(input) {
        const growth = normalizeShallow(input);
        growth.unicorn.level = getPetLevel(growth.unicorn.xp);
        const levelStyles = STYLE_CATALOG.filter(item => item.unlockAtLevel <= growth.unicorn.level).map(item => item.id);
        growth.unicorn.unlockedStyleIds = Array.from(new Set(growth.unicorn.unlockedStyleIds.concat(levelStyles)));
        if (!growth.unicorn.unlockedStyleIds.includes(growth.unicorn.activeStyleId)) growth.unicorn.activeStyleId = 'style-classic';
        growth.plant.stage = getPlantStage(growth.totalSunlightEarned);
        return growth;
    }

    function normalizeShallow(input) {
        const source = input && typeof input === 'object' ? input : {};
        const seed = createDefaultGrowth();
        const growth = Object.assign({}, seed, source);
        growth.awardedIds = asArray(source.awardedIds);
        growth.claimedRewardIds = asArray(source.claimedRewardIds);
        growth.checkinDates = asArray(source.checkinDates);
        growth.claimedStreakRewardIds = asArray(source.claimedStreakRewardIds);
        growth.plant = Object.assign({}, seed.plant, source.plant || {});
        growth.unicorn = Object.assign({}, seed.unicorn, source.unicorn || {});
        growth.zombie = Object.assign({}, seed.zombie, source.zombie || {});
        growth.achievements = normalizeAchievements(source.achievements);
        growth.pet = normalizePet(source.pet);
        growth.streakRepair = normalizeStreakRepair(source.streakRepair);
        return growth;
    }

    function recordAction(input, action) {
        const growth = normalize(input);
        const eventId = String(action && action.eventId || '');
        const date = localDate(action && action.date);
        const amount = Math.max(0, Number(action && action.amount) || 0);
        if (!eventId || growth.awardedIds.includes(eventId)) return { growth: growth, awarded: false, dailyBonus: 0, zombieDefeated: false };
        const zombieWasActive = getView(growth, date).zombieActive;
        growth.awardedIds.push(eventId);
        growth.sunlight += amount;
        growth.totalSunlightEarned += amount;
        growth.unicorn.xp += amount;
        let dailyBonus = 0;
        if (!growth.checkinDates.includes(date)) {
            growth.checkinDates.push(date);
            growth.checkinDates.sort();
            const dailyEventId = `daily-checkin:${date}`;
            if (!growth.awardedIds.includes(dailyEventId)) {
                growth.awardedIds.push(dailyEventId);
                growth.sunlight += 10;
                growth.totalSunlightEarned += 10;
                growth.unicorn.xp += 10;
                dailyBonus = 10;
            }
        }
        let zombieDefeated = false;
        if (zombieWasActive || growth.zombie.active) {
            growth.zombie.active = false;
            growth.zombie.defeated += 1;
            growth.zombie.lastSpawnDate = '';
            zombieDefeated = true;
        }
        return { growth: derive(growth), awarded: true, dailyBonus: dailyBonus, zombieDefeated: zombieDefeated };
    }

    function repairStreak(input, date) {
        const growth = normalize(input);
        const today = localDate(date);
        const yesterday = dateOffset(today, -1);
        if (growth.checkinDates.includes(yesterday)) {
            return { ok: false, growth: growth, reason: '昨天没有断档，不需要补签' };
        }
        const month = today.slice(0, 7);
        const used = Number(growth.streakRepair.cardsUsedByMonth[month]) || 0;
        if (used >= STREAK_REPAIR_MONTHLY_CARDS) {
            return { ok: false, growth: growth, reason: `这个月的 ${STREAK_REPAIR_MONTHLY_CARDS} 张补签卡都用完了，下个月再来` };
        }
        growth.streakRepair.cardsUsedByMonth[month] = used + 1;
        growth.streakRepair.repairedDates.push(yesterday);
        growth.streakRepair.repairedDates.sort();
        growth.checkinDates.push(yesterday);
        growth.checkinDates.sort();
        // 补签只恢复连续性:不发当日阳光、不进 awardedIds 结算路径
        return { ok: true, growth: derive(growth), repairedDate: yesterday, cardsLeft: STREAK_REPAIR_MONTHLY_CARDS - used - 1 };
    }

    function getStreakRepairView(growth, today) {
        const month = today.slice(0, 7);
        const used = Number(growth.streakRepair.cardsUsedByMonth[month]) || 0;
        const yesterday = dateOffset(today, -1);
        const yesterdayMissing = !growth.checkinDates.includes(yesterday);
        const hasHistory = growth.checkinDates.some(function (item) { return item < yesterday; });
        return {
            available: Math.max(0, STREAK_REPAIR_MONTHLY_CARDS - used),
            usedThisMonth: used,
            monthlyCards: STREAK_REPAIR_MONTHLY_CARDS,
            yesterday: yesterday,
            canRepair: yesterdayMissing && used < STREAK_REPAIR_MONTHLY_CARDS && hasHistory,
            welcomeBack: yesterdayMissing && hasHistory
        };
    }

    function getView(input, date) {
        const growth = derive(normalize(input));
        const today = localDate(date);
        const streak = calculateStreak(growth.checkinDates, today);
        const latest = lastCheckin(growth.checkinDates);
        const zombieActive = Boolean(latest && latest < today && !growth.checkinDates.includes(today));
        const unlockedStreakRewardIds = STREAK_REWARDS.filter(item => item.days <= streak).map(item => item.id);
        return {
            sunlight: growth.sunlight,
            totalSunlightEarned: growth.totalSunlightEarned,
            streak: streak,
            bestStreak: Math.max(streak, growth.checkinDates.reduce((best, item, index, dates) => Math.max(best, calculateStreak(dates.slice(0, index + 1), item)), 0)),
            unicorn: { name: growth.unicorn.name, level: growth.unicorn.level, xp: growth.unicorn.xp, activeStyleId: growth.unicorn.activeStyleId },
            petLevel: growth.unicorn.level,
            petXp: growth.unicorn.xp,
            activeStyleId: growth.unicorn.activeStyleId,
            unlockedStyleIds: growth.unicorn.unlockedStyleIds,
            claimedRewardIds: growth.claimedRewardIds,
            pendingRewardIds: growth.pendingRewardIds,
            plantStage: growth.plant.stage,
            plant: PLANT_STAGES[growth.plant.stage] || PLANT_STAGES[0],
            plantWaterCount: growth.plant.waterCount,
            lastWateredDate: growth.plant.lastWateredDate,
            zombieActive: zombieActive,
            zombieDefeated: growth.zombie.defeated,
            voiceEnabled: growth.voiceEnabled,
            unlockedStreakRewardIds: unlockedStreakRewardIds,
            claimedStreakRewardIds: growth.claimedStreakRewardIds,
            streakRewards: STREAK_REWARDS,
            streakRepair: getStreakRepairView(growth, today),
            styles: STYLE_CATALOG,
            achievements: growth.achievements
        };
    }

    function claimStreakReward(input, rewardId, date) {
        const growth = normalize(input);
        const reward = STREAK_REWARDS.find(item => item.id === rewardId);
        const streak = calculateStreak(growth.checkinDates, localDate(date));
        if (!reward) return { ok: false, growth: growth, reason: '奖励不存在' };
        if (streak < reward.days) return { ok: false, growth: growth, reason: `还需要连续 ${reward.days} 天` };
        if (growth.claimedStreakRewardIds.includes(reward.id)) return { ok: false, growth: growth, reason: '奖励已经领取过了' };
        growth.claimedStreakRewardIds.push(reward.id);
        if (reward.kind === 'sunlight') {
            growth.sunlight += reward.amount;
            growth.totalSunlightEarned += reward.amount;
            growth.unicorn.xp += reward.amount;
        }
        if (reward.kind === 'style' && reward.styleId && !growth.unicorn.unlockedStyleIds.includes(reward.styleId)) growth.unicorn.unlockedStyleIds.push(reward.styleId);
        return { ok: true, growth: derive(growth), reward: reward };
    }

    function selectStyle(input, styleId) {
        const growth = normalize(input);
        if (!growth.unicorn.unlockedStyleIds.includes(styleId)) return { ok: false, growth: growth, reason: '造型还没有解锁' };
        growth.unicorn.activeStyleId = styleId;
        return { ok: true, growth: growth };
    }

    function waterPlant(input, date) {
        const growth = normalize(input);
        const today = localDate(date);
        if (growth.plant.lastWateredDate === today) return { ok: false, growth: growth, reason: '今天已经浇过水了' };
        if (growth.sunlight < 5) return { ok: false, growth: growth, reason: '还需要 5 阳光才能浇水' };
        growth.sunlight -= 5;
        growth.plant.waterCount += 1;
        growth.plant.lastWateredDate = today;
        return { ok: true, growth: growth };
    }

    function requestPendingReward(input, reward) {
        const growth = normalize(input);
        const id = String(reward && reward.id || '');
        const cost = Math.max(0, Number(reward && reward.cost) || 0);
        if (!id) return { ok: false, growth: growth, reason: '奖励不存在' };
        if (growth.claimedRewardIds.includes(id)) return { ok: false, growth: growth, reason: '这个奖励已经领取过了' };
        if (growth.pendingRewardIds.includes(id)) return { ok: true, growth: growth };
        if (growth.sunlight < cost) return { ok: false, growth: growth, reason: `还需要 ${cost - growth.sunlight} 阳光` };
        growth.pendingRewardIds.push(id);
        return { ok: true, growth: growth };
    }

    function confirmPendingReward(input, reward) {
        const growth = normalize(input);
        const id = String(reward && reward.id || '');
        const cost = Math.max(0, Number(reward && reward.cost) || 0);
        if (!id) return { ok: false, growth: growth, reason: '奖励不存在' };
        if (growth.claimedRewardIds.includes(id)) return { ok: false, growth: growth, reason: '这个奖励已经领取过了' };
        if (!growth.pendingRewardIds.includes(id)) return { ok: false, growth: growth, reason: '还没有待确认的兑换' };
        if (growth.sunlight < cost) return { ok: false, growth: growth, reason: `还需要 ${cost - growth.sunlight} 阳光` };
        growth.sunlight -= cost;
        growth.claimedRewardIds.push(id);
        growth.pendingRewardIds = growth.pendingRewardIds.filter(function (item) { return item !== id; });
        return { ok: true, growth: growth };
    }

    function cancelPendingReward(input, rewardId) {
        const growth = normalize(input);
        const id = String(rewardId || '');
        growth.pendingRewardIds = growth.pendingRewardIds.filter(function (item) { return item !== id; });
        return { ok: true, growth: growth };
    }

    function setVoiceEnabled(input, enabled) {
        const growth = normalize(input);
        growth.voiceEnabled = Boolean(enabled);
        return growth;
    }

    global.PersonalWorkbenchChildGrowth = {
        STREAK_REWARDS: STREAK_REWARDS,
        STYLE_CATALOG: STYLE_CATALOG,
        PLANT_STAGES: PLANT_STAGES,
        createDefaultGrowth: createDefaultGrowth,
        normalize: normalize,
        recordAction: recordAction,
        getView: getView,
        claimStreakReward: claimStreakReward,
        repairStreak: repairStreak,
        STREAK_REPAIR_MONTHLY_CARDS: STREAK_REPAIR_MONTHLY_CARDS,
        selectStyle: selectStyle,
        waterPlant: waterPlant,
        requestPendingReward: requestPendingReward,
        confirmPendingReward: confirmPendingReward,
        cancelPendingReward: cancelPendingReward,
        setVoiceEnabled: setVoiceEnabled,
        calculateStreak: calculateStreak
    };
})(typeof window !== 'undefined' ? window : globalThis);
