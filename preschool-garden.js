(function (global) {
    'use strict';

    const PLANT_CATALOG = Object.freeze([
        { id: 'plant-sun-sprout', title: '太阳芽', description: '每天收一束阳光。', icon: 'sun', unlockAt: 0, tone: 'gold' },
        { id: 'plant-moon-mint', title: '月光薄荷', description: '收集 80 阳光后出现。', icon: 'moon', unlockAt: 80, tone: 'blue' },
        { id: 'plant-star-flower', title: '星星花', description: '收集 200 阳光后出现。', icon: 'sparkles', unlockAt: 200, tone: 'pink' },
        { id: 'plant-rainbow-tree', title: '彩虹树', description: '收集 400 阳光后出现。', icon: 'trees', unlockAt: 400, tone: 'lime' }
    ]);

    const COLLECTION_CATALOG = Object.freeze([
        { id: 'sticker-sun', title: '小太阳', description: '第一次收集 40 阳光。', icon: 'sun', unlockAt: 40, tone: 'gold' },
        { id: 'sticker-book', title: '故事书', description: '完成一节小课程。', icon: 'book-open', event: 'lesson-complete', tone: 'blue' },
        { id: 'sticker-brave', title: '勇敢盾牌', description: '完成行动，赶走小怪。', icon: 'shield-check', event: 'checkin-complete', tone: 'orange' },
        { id: 'sticker-dew', title: '露珠瓶', description: '给植物浇一次水。', icon: 'droplets', event: 'plant-watered', tone: 'blue' },
        { id: 'sticker-gift', title: '礼物盒', description: '领取一个约定奖励。', icon: 'gift', event: 'reward-claimed', tone: 'pink' },
        { id: 'sticker-rainbow', title: '彩虹脚印', description: '连续三天有行动。', icon: 'rainbow', event: 'streak-3', tone: 'lime' }
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
            activePlantId: 'plant-sun-sprout',
            unlockedPlantIds: ['plant-sun-sprout'],
            growthPoints: 0,
            invader: { active: false, kind: 'cloudy-bug', defeated: 0, lastSpawnDate: '' }
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
            unlockedPlantIds: asArray(gardenSource.unlockedPlantIds).filter(item => typeof item === 'string'),
            invader: Object.assign(createDefaultGarden().invader, gardenSource.invader || {})
        });
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
        garden.unlockedPlantIds = Array.from(new Set(garden.unlockedPlantIds.concat(['plant-sun-sprout'])));
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
        let invaderDefeated = false;
        if (ACTION_EVENTS.includes(type) && growth.garden.invader.active) {
            growth.garden.invader.active = false;
            growth.garden.invader.defeated += 1;
            growth.garden.invader.lastSpawnDate = '';
            invaderDefeated = true;
            if (!growth.collection.unlockedIds.includes('sticker-brave')) {
                growth.collection.unlockedIds.push('sticker-brave');
                rewardIds.push('sticker-brave');
            }
        }
        return { growth: unlockByProgress(growth), changed: true, rewardIds: Array.from(new Set(rewardIds)), invaderDefeated: invaderDefeated, date: localDate(date) };
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
        COLLECTION_CATALOG: COLLECTION_CATALOG,
        ACTION_EVENTS: ACTION_EVENTS,
        createDefaultGarden: createDefaultGarden,
        createDefaultCollection: createDefaultCollection,
        normalize: normalize,
        applySunlight: applySunlight,
        recordEvent: recordEvent,
        selectPlant: selectPlant,
        getView: getView
    };
}(typeof window !== 'undefined' ? window : globalThis));
