(function (global) {
    'use strict';

    const PLANT_CATALOG = Object.freeze([
        { id: 'plant-sunflower', title: '向日葵', description: '收集阳光，让花园一直亮晶晶。', icon: 'sun', unlockAt: 0, tone: 'gold' },
        { id: 'plant-peashooter', title: '豌豆射手', description: '发射小豌豆，守护学习花园。', icon: 'target', unlockAt: 20, tone: 'lime' },
        { id: 'plant-wallnut', title: '坚果墙', description: '挡住僵尸，给小伙伴争取时间。', icon: 'shield-check', unlockAt: 60, tone: 'orange' },
        { id: 'plant-snowpea', title: '寒冰射手', description: '冰冰豌豆，让僵尸慢一点。', icon: 'snowflake', unlockAt: 120, tone: 'blue' },
        { id: 'plant-cherrybomb', title: '樱桃炸弹', description: '完成大目标，解锁超级植物。', icon: 'flame', unlockAt: 220, tone: 'pink' }
    ]);

    const ZOMBIE_CATALOG = Object.freeze([
        { id: 'zombie-basic', title: '普通僵尸', description: '慢慢走来的基础僵尸。', asset: 'zombie-basic', baseHealth: 3, tone: 'green' },
        { id: 'zombie-conehead', title: '路障僵尸', description: '戴着路障，生命更厚。', asset: 'zombie-conehead', baseHealth: 4, tone: 'orange' },
        { id: 'zombie-buckethead', title: '铁桶僵尸', description: '顶着铁桶，特别耐打。', asset: 'zombie-buckethead', baseHealth: 5, tone: 'slate' },
        { id: 'zombie-flag', title: '旗帜僵尸', description: '举着旗子，提醒新一波来啦。', asset: 'zombie-flag', baseHealth: 4, tone: 'red' },
        { id: 'zombie-football', title: '橄榄球僵尸', description: '速度很快，要专心完成任务。', asset: 'zombie-football', baseHealth: 6, tone: 'red' }
    ]);

    const LEGACY_PLANT_IDS = Object.freeze({
        'plant-sun-sprout': 'plant-sunflower',
        'plant-moon-mint': 'plant-snowpea',
        'plant-star-flower': 'plant-cherrybomb',
        'plant-rainbow-tree': 'plant-wallnut'
    });

    const LEGACY_ZOMBIE_IDS = Object.freeze({ 'cloudy-bug': 'zombie-basic' });

    const COLLECTION_CATALOG = Object.freeze([
        { id: 'sticker-sun', title: '向日葵伙伴', description: '第一次收集 40 阳光。', icon: 'sun', unlockAt: 40, tone: 'gold' },
        { id: 'sticker-book', title: '豌豆射手', description: '完成一节小课程。', icon: 'target', event: 'lesson-complete', tone: 'blue' },
        { id: 'sticker-brave', title: '坚果墙', description: '完成行动，赶走僵尸。', icon: 'shield-check', event: 'checkin-complete', tone: 'orange' },
        { id: 'sticker-dew', title: '寒冰射手', description: '给植物浇一次水。', icon: 'snowflake', event: 'plant-watered', tone: 'blue' },
        { id: 'sticker-gift', title: '樱桃炸弹', description: '领取一个约定奖励。', icon: 'flame', event: 'reward-claimed', tone: 'pink' },
        { id: 'sticker-rainbow', title: '僵尸图鉴', description: '连续三天有行动。', icon: 'bug', event: 'streak-3', tone: 'lime' }
    ]);

    const ACTION_EVENTS = Object.freeze(['checkin-complete', 'lesson-complete', 'task-complete', 'reading-complete', 'reward-claimed']);

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

    function createDefaultGarden() {
        return {
            activePlantId: 'plant-sunflower',
            unlockedPlantIds: ['plant-sunflower'],
            growthPoints: 0,
            defenseEnergy: 0,
            defenseShots: 0,
            lastDefenseDate: '',
            feedbackPreferences: { musicEnabled: false, motionEnabled: true },
            invader: { active: false, kind: 'zombie-basic', defeated: 0, health: 3, maxHealth: 3, wave: 0, lastSpawnDate: '' }
        };
    }

    function createDefaultCollection() {
        return { unlockedIds: [], claimedIds: [], seenEventIds: [], total: COLLECTION_CATALOG.length };
    }

    function normalize(input) {
        const source = input && typeof input === 'object' ? input : {};
        const gardenSource = source.garden && typeof source.garden === 'object' ? source.garden : {};
        const collectionSource = source.collection && typeof source.collection === 'object' ? source.collection : {};
        const garden = Object.assign(createDefaultGarden(), gardenSource, {
            unlockedPlantIds: asArray(gardenSource.unlockedPlantIds).filter(item => typeof item === 'string').map(item => LEGACY_PLANT_IDS[item] || item),
            invader: Object.assign(createDefaultGarden().invader, gardenSource.invader || {})
        });
        garden.activePlantId = LEGACY_PLANT_IDS[garden.activePlantId] || garden.activePlantId;
        garden.invader.kind = LEGACY_ZOMBIE_IDS[garden.invader.kind] || garden.invader.kind;
        garden.defenseEnergy = Math.max(0, Math.min(9, Number(garden.defenseEnergy) || 0));
        garden.defenseShots = Math.max(0, Number(garden.defenseShots) || 0);
        garden.lastDefenseDate = String(garden.lastDefenseDate || '');
        garden.feedbackPreferences = Object.assign(createDefaultGarden().feedbackPreferences, gardenSource.feedbackPreferences || {});
        garden.feedbackPreferences.musicEnabled = Boolean(garden.feedbackPreferences.musicEnabled);
        garden.feedbackPreferences.motionEnabled = garden.feedbackPreferences.motionEnabled !== false;
        garden.invader.health = Math.max(0, Math.min(9, Number(garden.invader.health) || 3));
        garden.invader.maxHealth = Math.max(1, Math.min(9, Number(garden.invader.maxHealth) || 3));
        garden.invader.wave = Math.max(0, Number(garden.invader.wave) || 0);
        if (!garden.invader.active && garden.invader.health === 0) garden.invader.health = garden.invader.maxHealth;
        if (garden.invader.health > garden.invader.maxHealth) garden.invader.health = garden.invader.maxHealth;
        const collection = Object.assign(createDefaultCollection(), collectionSource, {
            unlockedIds: asArray(collectionSource.unlockedIds).filter(item => typeof item === 'string'),
            claimedIds: asArray(collectionSource.claimedIds).filter(item => typeof item === 'string'),
            seenEventIds: asArray(collectionSource.seenEventIds).filter(item => typeof item === 'string')
        });
        if (source.zombie && typeof source.zombie === 'object') {
            garden.invader.active = Boolean(gardenSource.invader ? garden.invader.active : source.zombie.active);
            garden.invader.defeated = Math.max(Number(garden.invader.defeated) || 0, Number(source.zombie.defeated) || 0);
            garden.invader.lastSpawnDate = garden.invader.lastSpawnDate || String(source.zombie.lastSpawnDate || '');
        }
        garden.growthPoints = Math.max(0, Number(garden.growthPoints) || 0, Number(source.totalSunlightEarned) || 0);
        garden.invader.active = Boolean(garden.invader.active);
        garden.invader.defeated = Math.max(0, Number(garden.invader.defeated) || 0);
        garden.unlockedPlantIds = Array.from(new Set(garden.unlockedPlantIds.concat(['plant-sunflower'])))
            .filter(item => PLANT_CATALOG.some(plant => plant.id === item));
        if (!PLANT_CATALOG.some(plant => plant.id === garden.activePlantId)) garden.activePlantId = 'plant-sunflower';
        if (!ZOMBIE_CATALOG.some(zombie => zombie.id === garden.invader.kind)) garden.invader.kind = 'zombie-basic';
        collection.total = COLLECTION_CATALOG.length;
        const growth = Object.assign({}, source, { garden: garden, collection: collection });
        unlockByProgress(growth);
        return growth;
    }

    function unlockByProgress(growth) {
        const points = Math.max(0, Number(growth.garden.growthPoints) || 0);
        PLANT_CATALOG.forEach(function (plant) {
            if (points >= plant.unlockAt && !growth.garden.unlockedPlantIds.includes(plant.id)) growth.garden.unlockedPlantIds.push(plant.id);
        });
        COLLECTION_CATALOG.forEach(function (item) {
            if (item.unlockAt && points >= item.unlockAt && !growth.collection.unlockedIds.includes(item.id)) growth.collection.unlockedIds.push(item.id);
        });
        growth.collection.unlockedIds = Array.from(new Set(growth.collection.unlockedIds));
        growth.garden.unlockedPlantIds = Array.from(new Set(growth.garden.unlockedPlantIds));
        return growth;
    }

    function applySunlight(input, amount) {
        const growth = normalize(input);
        growth.garden.growthPoints += Math.max(0, Number(amount) || 0);
        return unlockByProgress(growth);
    }

    function unlockEventItems(growth, eventType, rewardIds) {
        COLLECTION_CATALOG.forEach(function (item) {
            if (item.event !== eventType || growth.collection.unlockedIds.includes(item.id)) return;
            growth.collection.unlockedIds.push(item.id);
            rewardIds.push(item.id);
        });
    }

    function recordEvent(input, eventType, date, eventId) {
        const growth = normalize(input);
        const type = String(eventType || '');
        const key = String(eventId || type);
        if (!key || growth.collection.seenEventIds.includes(key)) return { growth: growth, changed: false, rewardIds: [], invaderDefeated: false };
        growth.collection.seenEventIds.push(key);
        const rewardIds = [];
        unlockEventItems(growth, type, rewardIds);
        if (type === 'streak-3' && !growth.collection.unlockedIds.includes('sticker-rainbow')) {
            growth.collection.unlockedIds.push('sticker-rainbow');
            rewardIds.push('sticker-rainbow');
        }
        let defenseEnergyGranted = false;
        if (ACTION_EVENTS.includes(type) && eventId) {
            const before = growth.garden.defenseEnergy;
            growth.garden.defenseEnergy = Math.min(9, before + 1);
            growth.garden.lastDefenseDate = localDate(date);
            defenseEnergyGranted = growth.garden.defenseEnergy > before;
        }
        let invaderDefeated = false;
        // Keep the original one-tap behavior for legacy callers that did not send an event id.
        if (ACTION_EVENTS.includes(type) && !eventId && growth.garden.invader.active) {
            growth.garden.invader.active = false;
            growth.garden.invader.health = 0;
            growth.garden.invader.defeated += 1;
            growth.garden.invader.lastSpawnDate = '';
            invaderDefeated = true;
            if (!growth.collection.unlockedIds.includes('sticker-brave')) {
                growth.collection.unlockedIds.push('sticker-brave');
                rewardIds.push('sticker-brave');
            }
        }
        return { growth: unlockByProgress(growth), changed: true, rewardIds: Array.from(new Set(rewardIds)), invaderDefeated: invaderDefeated, defenseEnergyGranted: defenseEnergyGranted, date: localDate(date) };
    }

    function spawnInvader(input, date) {
        const growth = normalize(input);
        if (growth.garden.invader.active) return { growth: growth, changed: false, spawned: false };
        const wave = Math.max(1, (Number(growth.garden.invader.wave) || 0) + 1);
        const zombie = ZOMBIE_CATALOG[(wave - 1) % ZOMBIE_CATALOG.length];
        const maxHealth = Math.min(9, zombie.baseHealth + Math.floor((wave - 1) / 5));
        growth.garden.invader = Object.assign({}, growth.garden.invader, {
            active: true,
            kind: zombie.id,
            health: maxHealth,
            maxHealth: maxHealth,
            wave: wave,
            lastSpawnDate: localDate(date)
        });
        return { growth: growth, changed: true, spawned: true };
    }

    function firePea(input, date) {
        const growth = normalize(input);
        if (growth.garden.defenseEnergy < 1) return { ok: false, growth: growth, hit: false, defeated: false, reason: '没有可发射的豌豆能量' };
        if (!growth.garden.invader.active) return { ok: false, growth: growth, hit: false, defeated: false, reason: '花园里没有入侵者' };
        growth.garden.defenseEnergy -= 1;
        growth.garden.defenseShots += 1;
        growth.garden.lastDefenseDate = localDate(date);
        growth.garden.invader.health = Math.max(0, growth.garden.invader.health - 1);
        const defeated = growth.garden.invader.health <= 0;
        if (defeated) {
            growth.garden.invader.active = false;
            growth.garden.invader.defeated += 1;
            growth.garden.invader.lastSpawnDate = '';
            if (!growth.collection.unlockedIds.includes('sticker-brave')) growth.collection.unlockedIds.push('sticker-brave');
        }
        return { ok: true, growth: unlockByProgress(growth), hit: true, defeated: defeated, reason: '' };
    }

    function getDefenseView(input, date) {
        const growth = normalize(input);
        const invader = getInvaderView(growth, date);
        return {
            energy: growth.garden.defenseEnergy,
            shots: growth.garden.defenseShots,
            invader: invader,
            canFire: Boolean(invader.active && growth.garden.defenseEnergy > 0)
        };
    }

    function setFeedbackPreference(input, key, enabled) {
        const growth = normalize(input);
        const allowed = { musicEnabled: true, motionEnabled: true };
        if (!Object.prototype.hasOwnProperty.call(allowed, key)) return { ok: false, growth: growth, reason: '偏好设置不存在' };
        growth.garden.feedbackPreferences[key] = Boolean(enabled);
        return { ok: true, growth: growth };
    }

    function selectPlant(input, plantId) {
        const growth = normalize(input);
        if (!growth.garden.unlockedPlantIds.includes(plantId)) return { ok: false, growth: growth, reason: '这个植物伙伴还没有出现' };
        growth.garden.activePlantId = plantId;
        return { ok: true, growth: growth };
    }

    function getInvaderView(growth, date) {
        const today = localDate(date);
        const dates = new Set(asArray(growth.checkinDates));
        const latest = asArray(growth.checkinDates).slice().sort().pop() || '';
        const missed = Boolean(latest && latest < today && !dates.has(today));
        return Object.assign({}, growth.garden.invader, { active: Boolean(growth.garden.invader.active || missed), lastSpawnDate: missed ? today : growth.garden.invader.lastSpawnDate });
    }

    function getView(input, date) {
        const growth = normalize(input);
        const invader = getInvaderView(growth, date);
        const activePlant = PLANT_CATALOG.find(item => item.id === growth.garden.activePlantId) || PLANT_CATALOG[0];
        return {
            garden: Object.assign({}, growth.garden, { invader: invader }),
            activePlant: activePlant,
            plants: PLANT_CATALOG,
            collection: Object.assign({}, growth.collection, {
                unlockedItems: COLLECTION_CATALOG.filter(item => growth.collection.unlockedIds.includes(item.id)),
                catalog: COLLECTION_CATALOG
            }),
            invaderActive: invader.active
        };
    }

    global.PersonalWorkbenchPreschoolGarden = {
        PLANT_CATALOG: PLANT_CATALOG,
        ZOMBIE_CATALOG: ZOMBIE_CATALOG,
        COLLECTION_CATALOG: COLLECTION_CATALOG,
        ACTION_EVENTS: ACTION_EVENTS,
        createDefaultGarden: createDefaultGarden,
        createDefaultCollection: createDefaultCollection,
        normalize: normalize,
        applySunlight: applySunlight,
        recordEvent: recordEvent,
        spawnInvader: spawnInvader,
        firePea: firePea,
        getDefenseView: getDefenseView,
        setFeedbackPreference: setFeedbackPreference,
        selectPlant: selectPlant,
        getView: getView
    };
}(typeof window !== 'undefined' ? window : globalThis));
