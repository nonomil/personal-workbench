(function (global) {
    'use strict';

    const PLANT_CATALOG = Object.freeze([
        { id: 'plant-sunflower', title: '向日葵', description: '收集阳光，让花园一直亮晶晶。', icon: 'sun', unlockAt: 0, tone: 'gold', skill: 'sunlight', skillTitle: '收集阳光', skillDescription: '每天收集一次 +10 阳光。', energyCost: 0, damage: 0 },
        { id: 'plant-peashooter', title: '豌豆射手', description: '发射小豌豆，守护学习花园。', icon: 'target', unlockAt: 20, tone: 'lime', skill: 'pea', skillTitle: '发射豌豆', skillDescription: '消耗 1 点能量，造成 1 点伤害。', energyCost: 1, damage: 1 },
        { id: 'plant-wallnut', title: '坚果墙', description: '挡住僵尸，给小伙伴争取时间。', icon: 'shield-check', unlockAt: 60, tone: 'orange', skill: 'block', skillTitle: '坚果挡住', skillDescription: '不攻击，只把僵尸挡住 2 回合。', energyCost: 0, damage: 0 },
        { id: 'plant-snowpea', title: '寒冰射手', description: '冰冰豌豆，让僵尸慢一点。', icon: 'snowflake', unlockAt: 120, tone: 'blue', skill: 'ice-pea', skillTitle: '发射冰豌豆', skillDescription: '消耗 1 点能量，造成伤害并冰冻 2 回合。', energyCost: 1, damage: 1 },
        { id: 'plant-cherrybomb', title: '樱桃炸弹', description: '完成大目标，解锁超级植物。', icon: 'flame', unlockAt: 220, tone: 'pink', skill: 'blast', skillTitle: '樱桃爆炸', skillDescription: '消耗 2 点能量，造成 3 点范围伤害。', energyCost: 2, damage: 3 }
    ]);

    const ZOMBIE_CATALOG = Object.freeze([
        { id: 'zombie-basic', title: '普通僵尸', description: '慢慢走来的基础僵尸。', asset: 'zombie-basic', baseHealth: 3, tone: 'green' },
        { id: 'zombie-conehead', title: '路障僵尸', description: '戴着路障，生命更厚。', asset: 'zombie-conehead', baseHealth: 4, tone: 'orange' },
        { id: 'zombie-buckethead', title: '铁桶僵尸', description: '顶着铁桶，特别耐打。', asset: 'zombie-buckethead', baseHealth: 5, tone: 'slate' },
        { id: 'zombie-flag', title: '旗帜僵尸', description: '举着旗子，提醒新一波来啦。', asset: 'zombie-flag', baseHealth: 4, tone: 'red' },
        { id: 'zombie-football', title: '橄榄球僵尸', description: '速度很快，要专心完成任务。', asset: 'zombie-football', baseHealth: 6, tone: 'red' }
    ]);

    const DEFENSE_PLANT_RULES = Object.freeze({
        'plant-sunflower': { cost: 25, maxHealth: 3, cooldown: 0, damage: 0 },
        'plant-peashooter': { cost: 40, maxHealth: 3, cooldown: 1, damage: 1 },
        'plant-wallnut': { cost: 30, maxHealth: 8, cooldown: 0, damage: 0 },
        'plant-snowpea': { cost: 50, maxHealth: 3, cooldown: 1, damage: 1, slowTicks: 2 },
        'plant-cherrybomb': { cost: 75, maxHealth: 1, cooldown: 0, damage: 3 }
    });

    const DEFENSE_ZOMBIE_RULES = Object.freeze({
        'zombie-basic': { maxHealth: 3, moveEvery: 3 },
        'zombie-conehead': { maxHealth: 5, moveEvery: 3 },
        'zombie-buckethead': { maxHealth: 7, moveEvery: 4 }
    });

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

    function clampHealth(value, maxHealth) {
        const number = Number(value);
        return Math.max(0, Math.min(maxHealth, Number.isFinite(number) ? number : maxHealth));
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createDefaultDefense() {
        return {
            version: 1,
            board: { lanes: 5, columns: 6 },
            selectedPlantId: 'plant-sunflower',
            plants: [],
            zombies: [],
            projectiles: [],
            wave: 0,
            nextEntityId: 1,
            tick: 0,
            defeated: 0,
            status: 'ready',
            startedAt: ''
        };
    }

    function normalizeDefense(input, activePlantId) {
        const source = input && typeof input === 'object' ? input : {};
        const defaults = createDefaultDefense();
        const boardSource = source.board && typeof source.board === 'object' ? source.board : {};
        const defense = Object.assign({}, defaults, source, {
            board: {
                lanes: 5,
                columns: 6,
                ...boardSource
            },
            plants: asArray(source.plants).map(function (item, index) {
                const plant = item && typeof item === 'object' ? item : {};
                const rule = DEFENSE_PLANT_RULES[plant.plantId] || DEFENSE_PLANT_RULES['plant-sunflower'];
                const maxHealth = Math.max(1, Number(plant.maxHealth) || rule.maxHealth);
                return {
                    id: String(plant.id || `plant-${index + 1}`),
                    plantId: String(plant.plantId || 'plant-sunflower'),
                    lane: Math.max(0, Math.min(4, Math.floor(Number(plant.lane) || 0))),
                    column: Math.max(0, Math.min(5, Math.floor(Number(plant.column) || 0))),
                    health: clampHealth(plant.health, maxHealth),
                    maxHealth: maxHealth,
                    age: Math.max(0, Number(plant.age) || 0)
                };
            }).filter(item => Object.prototype.hasOwnProperty.call(DEFENSE_PLANT_RULES, item.plantId) && item.health > 0),
            zombies: asArray(source.zombies).map(function (item, index) {
                const zombie = item && typeof item === 'object' ? item : {};
                const rule = DEFENSE_ZOMBIE_RULES[zombie.kind] || DEFENSE_ZOMBIE_RULES['zombie-basic'];
                const maxHealth = Math.max(1, Number(zombie.maxHealth) || rule.maxHealth);
                return {
                    id: String(zombie.id || `zombie-${index + 1}`),
                    kind: Object.prototype.hasOwnProperty.call(DEFENSE_ZOMBIE_RULES, zombie.kind) ? zombie.kind : 'zombie-basic',
                    lane: Math.max(0, Math.min(4, Math.floor(Number(zombie.lane) || 0))),
                    column: Math.max(0, Math.min(5, Math.floor(Number(zombie.column) || 5))),
                    health: clampHealth(zombie.health, maxHealth),
                    maxHealth: maxHealth,
                    slowTicks: Math.max(0, Number(zombie.slowTicks) || 0),
                    moveClock: Math.max(0, Number(zombie.moveClock) || 0)
                };
            }).filter(item => item.health > 0),
            projectiles: asArray(source.projectiles).map(function (item, index) {
                const projectile = item && typeof item === 'object' ? item : {};
                return {
                    id: String(projectile.id || `pea-${index + 1}`),
                    lane: Math.max(0, Math.min(4, Math.floor(Number(projectile.lane) || 0))),
                    column: Math.max(0, Math.min(6, Number(projectile.column) || 0)),
                    damage: Math.max(1, Number(projectile.damage) || 1),
                    slowTicks: Math.max(0, Number(projectile.slowTicks) || 0)
                };
            }).filter(item => item.column <= 6),
            selectedPlantId: String(source.selectedPlantId || activePlantId || 'plant-sunflower'),
            wave: Math.max(0, Number(source.wave) || 0),
            nextEntityId: Math.max(1, Number(source.nextEntityId) || 1),
            tick: Math.max(0, Number(source.tick) || 0),
            defeated: Math.max(0, Number(source.defeated) || 0),
            status: ['ready', 'playing', 'won'].includes(source.status) ? source.status : 'ready',
            startedAt: String(source.startedAt || '')
        });
        defense.board.lanes = 5;
        defense.board.columns = 6;
        if (!Object.prototype.hasOwnProperty.call(DEFENSE_PLANT_RULES, defense.selectedPlantId)) defense.selectedPlantId = activePlantId || 'plant-sunflower';
        return defense;
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
            lastSkillDate: '',
            feedbackPreferences: { musicEnabled: false, motionEnabled: true },
            invader: { active: false, kind: 'zombie-basic', defeated: 0, health: 3, maxHealth: 3, wave: 0, lastSpawnDate: '', blockedTurns: 0, slowedTurns: 0, lastEffect: '' },
            defense: createDefaultDefense()
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
            invader: Object.assign(createDefaultGarden().invader, gardenSource.invader || {}),
            defense: normalizeDefense(gardenSource.defense, gardenSource.activePlantId)
        });
        garden.activePlantId = LEGACY_PLANT_IDS[garden.activePlantId] || garden.activePlantId;
        garden.defense.selectedPlantId = LEGACY_PLANT_IDS[garden.defense.selectedPlantId] || garden.defense.selectedPlantId;
        garden.invader.kind = LEGACY_ZOMBIE_IDS[garden.invader.kind] || garden.invader.kind;
        garden.defenseEnergy = Math.max(0, Math.min(9, Number(garden.defenseEnergy) || 0));
        garden.defenseShots = Math.max(0, Number(garden.defenseShots) || 0);
        garden.lastDefenseDate = String(garden.lastDefenseDate || '');
        garden.lastSkillDate = String(garden.lastSkillDate || '');
        garden.feedbackPreferences = Object.assign(createDefaultGarden().feedbackPreferences, gardenSource.feedbackPreferences || {});
        garden.feedbackPreferences.musicEnabled = Boolean(garden.feedbackPreferences.musicEnabled);
        garden.feedbackPreferences.motionEnabled = garden.feedbackPreferences.motionEnabled !== false;
        garden.invader.health = Math.max(0, Math.min(9, Number(garden.invader.health) || 3));
        garden.invader.maxHealth = Math.max(1, Math.min(9, Number(garden.invader.maxHealth) || 3));
        garden.invader.wave = Math.max(0, Number(garden.invader.wave) || 0);
        garden.invader.blockedTurns = Math.max(0, Math.min(3, Number(garden.invader.blockedTurns) || 0));
        garden.invader.slowedTurns = Math.max(0, Math.min(3, Number(garden.invader.slowedTurns) || 0));
        garden.invader.lastEffect = String(garden.invader.lastEffect || '');
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
            growth.garden.invader.blockedTurns = 0;
            growth.garden.invader.slowedTurns = 0;
            growth.garden.invader.lastEffect = 'defeated';
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
            lastSpawnDate: localDate(date),
            blockedTurns: 0,
            slowedTurns: 0,
            lastEffect: ''
        });
        return { growth: growth, changed: true, spawned: true };
    }

    function activePlantFor(growth) {
        return PLANT_CATALOG.find(plant => plant.id === growth.garden.activePlantId) || PLANT_CATALOG[0];
    }

    function includeVisibleInvader(growth, date) {
        const invader = getInvaderView(growth, date);
        if (invader.active && !growth.garden.invader.active) {
            growth.garden.invader = Object.assign({}, growth.garden.invader, invader);
        }
        return growth;
    }

    function skillFailure(growth, reason) {
        return { ok: false, growth: growth, hit: false, defeated: false, damage: 0, effect: 'none', energySpent: 0, amount: 0, reason: reason };
    }

    function attackWithPlant(growth, date, plant) {
        const invader = growth.garden.invader;
        const energyCost = Math.max(0, Number(plant.energyCost) || 0);
        if (!invader.active) return skillFailure(growth, '花园里没有入侵者');
        if (growth.garden.defenseEnergy < energyCost) return skillFailure(growth, `需要 ${energyCost} 点豌豆能量`);
        growth.garden.defenseEnergy -= energyCost;
        growth.garden.defenseShots += 1;
        growth.garden.lastDefenseDate = localDate(date);
        const damage = Math.max(1, Number(plant.damage) || 1);
        invader.health = Math.max(0, invader.health - damage);
        if (plant.skill === 'ice-pea') invader.slowedTurns = 2;
        invader.blockedTurns = 0;
        invader.lastEffect = plant.skill;
        const defeated = invader.health <= 0;
        if (defeated) {
            invader.active = false;
            invader.defeated += 1;
            invader.lastSpawnDate = '';
            invader.blockedTurns = 0;
            invader.slowedTurns = 0;
            invader.lastEffect = 'defeated';
            if (!growth.collection.unlockedIds.includes('sticker-brave')) growth.collection.unlockedIds.push('sticker-brave');
        }
        return { ok: true, growth: unlockByProgress(growth), hit: true, defeated: defeated, damage: damage, effect: plant.skill, energySpent: energyCost, amount: 0, reason: '' };
    }

    function firePea(input, date) {
        const growth = includeVisibleInvader(normalize(input), date);
        const plant = activePlantFor(growth);
        if (plant.skill !== 'pea' && plant.skill !== 'ice-pea') return skillFailure(growth, `${plant.title}不能发射豌豆，请切换到豌豆射手或寒冰射手`);
        return attackWithPlant(growth, date, plant);
    }

    function usePlantSkill(input, date) {
        const growth = includeVisibleInvader(normalize(input), date);
        const plant = activePlantFor(growth);
        if (plant.skill === 'sunlight') {
            const today = localDate(date);
            if (growth.garden.lastSkillDate === today) return skillFailure(growth, '向日葵今天已经收过阳光了');
            growth.sunlight = Math.max(0, Number(growth.sunlight) || 0) + 10;
            growth.garden.growthPoints += 10;
            growth.garden.lastSkillDate = today;
            growth.garden.lastEffect = 'sunlight';
            return { ok: true, growth: unlockByProgress(growth), hit: false, defeated: false, damage: 0, effect: 'sunlight', energySpent: 0, amount: 10, reason: '' };
        }
        if (plant.skill === 'pea' || plant.skill === 'ice-pea' || plant.skill === 'blast') return attackWithPlant(growth, date, plant);
        if (!growth.garden.invader.active) return skillFailure(growth, '先召唤一只僵尸，坚果墙才能挡住它');
        if (growth.garden.invader.blockedTurns > 0) return skillFailure(growth, '坚果墙已经挡住这只僵尸了');
        growth.garden.invader.blockedTurns = 2;
        growth.garden.invader.slowedTurns = 0;
        growth.garden.invader.lastEffect = 'block';
        growth.garden.lastDefenseDate = localDate(date);
        return { ok: true, growth: unlockByProgress(growth), hit: false, defeated: false, damage: 0, effect: 'block', energySpent: 0, amount: 0, blockedTurns: 2, reason: '' };
    }

    function getDefenseView(input, date) {
        const growth = normalize(input);
        const invader = getInvaderView(growth, date);
        const defense = growth.garden.defense;
        const activePlant = activePlantFor(growth);
        const energyCost = Math.max(0, Number(activePlant.energyCost) || 0);
        const canUseSkill = activePlant.skill === 'sunlight'
            ? growth.garden.lastSkillDate !== localDate(date)
            : Boolean(invader.active && growth.garden.defenseEnergy >= energyCost);
        return {
            energy: growth.garden.defenseEnergy,
            shots: growth.garden.defenseShots,
            invader: invader,
            canFire: Boolean(invader.active && (activePlant.skill === 'pea' || activePlant.skill === 'ice-pea') && growth.garden.defenseEnergy >= energyCost),
            canUseSkill: canUseSkill,
            activePlant: activePlant,
            skill: activePlant.skill,
            skillTitle: activePlant.skillTitle,
            skillDescription: activePlant.skillDescription,
            skillEnergyCost: energyCost,
            version: defense.version,
            board: defense.board,
            selectedPlantId: defense.selectedPlantId,
            plants: defense.plants,
            zombies: defense.zombies,
            projectiles: defense.projectiles,
            wave: defense.wave,
            defeated: defense.defeated,
            status: defense.status,
            sunlight: Math.max(0, Number(growth.sunlight) || 0)
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
        growth.garden.defense.selectedPlantId = plantId;
        return { ok: true, growth: growth };
    }

    function defenseEntityId(defense, prefix) {
        const id = `${prefix}-${defense.nextEntityId}`;
        defense.nextEntityId += 1;
        return id;
    }

    function startDefenseGame(input, date) {
        const growth = normalize(input);
        const defense = createDefaultDefense();
        defense.selectedPlantId = growth.garden.activePlantId;
        defense.status = 'playing';
        defense.startedAt = localDate(date);
        growth.garden.defense = defense;
        return { ok: true, growth: growth, defense: defense };
    }

    function placeDefensePlant(input, lane, column) {
        const growth = normalize(input);
        const defense = growth.garden.defense;
        const laneNumber = Math.floor(Number(lane));
        const columnNumber = Math.floor(Number(column));
        const plantId = defense.selectedPlantId || growth.garden.activePlantId;
        const rule = DEFENSE_PLANT_RULES[plantId];
        if (!Number.isInteger(laneNumber) || laneNumber < 0 || laneNumber >= 5 || !Number.isInteger(columnNumber) || columnNumber < 0 || columnNumber >= 6) {
            return { ok: false, growth: growth, reason: '这个位置不在花园里' };
        }
        if (!rule || !growth.garden.unlockedPlantIds.includes(plantId)) return { ok: false, growth: growth, reason: '这个植物伙伴还没有出现' };
        if (defense.plants.some(item => item.lane === laneNumber && item.column === columnNumber)) return { ok: false, growth: growth, reason: '这个位置已经有植物了' };
        if (Math.max(0, Number(growth.sunlight) || 0) < rule.cost) return { ok: false, growth: growth, reason: '阳光还不够' };
        growth.sunlight = Math.max(0, Number(growth.sunlight) - rule.cost);
        const plant = {
            id: defenseEntityId(defense, 'plant'),
            plantId: plantId,
            lane: laneNumber,
            column: columnNumber,
            health: rule.maxHealth,
            maxHealth: rule.maxHealth,
            age: 0
        };
        defense.plants.push(plant);
        defense.status = 'playing';
        return { ok: true, growth: growth, plant: plant };
    }

    function spawnDefenseWave(input, date) {
        const growth = normalize(input);
        const defense = growth.garden.defense;
        if (defense.zombies.length >= 3) return { ok: false, growth: growth, spawned: [], reason: '这一波已经有三只僵尸了' };
        const wave = defense.wave + 1;
        const lanes = [0, 2, 4, 1, 3].filter(lane => !defense.zombies.some(item => item.lane === lane));
        const kinds = ['zombie-basic', 'zombie-conehead', 'zombie-buckethead'];
        const spawned = [];
        const count = Math.min(3 - defense.zombies.length, lanes.length);
        for (let index = 0; index < count; index += 1) {
            const kind = kinds[(wave - 1 + index) % kinds.length];
            const rule = DEFENSE_ZOMBIE_RULES[kind];
            const zombie = {
                id: defenseEntityId(defense, 'zombie'),
                kind: kind,
                lane: lanes[index],
                column: 5,
                health: rule.maxHealth,
                maxHealth: rule.maxHealth,
                slowTicks: 0,
                moveClock: 0
            };
            defense.zombies.push(zombie);
            spawned.push(zombie);
        }
        if (spawned.length) {
            defense.wave = wave;
            defense.status = 'playing';
        }
        return { ok: Boolean(spawned.length), growth: growth, spawned: spawned, reason: spawned.length ? '' : '没有可用路线了' };
    }

    function defensePlantAt(defense, lane, column) {
        return defense.plants.find(item => item.lane === lane && item.column === column && item.health > 0) || null;
    }

    function stepDefense(growth) {
        const defense = growth.garden.defense;
        defense.tick += 1;
        defense.plants.forEach(function (plant) {
            plant.age += 1;
            if (plant.plantId === 'plant-sunflower' && defense.tick % 5 === 0) {
                growth.sunlight = Math.max(0, Number(growth.sunlight) || 0) + 10;
                growth.garden.growthPoints += 10;
            }
        });

        const cherryBombs = defense.plants.filter(item => item.plantId === 'plant-cherrybomb' && item.age >= 1);
        cherryBombs.forEach(function (plant) {
            defense.zombies.forEach(function (zombie) {
                if (Math.abs(zombie.lane - plant.lane) <= 1 && Math.abs(zombie.column - plant.column) <= 1) zombie.health = 0;
            });
            plant.health = 0;
        });

        const nextProjectiles = [];
        defense.projectiles.forEach(function (projectile) {
            projectile.column += 1;
            const target = defense.zombies.find(item => item.health > 0 && item.lane === projectile.lane && item.column <= projectile.column);
            if (target) {
                target.health = Math.max(0, target.health - projectile.damage);
                target.slowTicks = Math.max(target.slowTicks, projectile.slowTicks);
            } else if (projectile.column <= 6) {
                nextProjectiles.push(projectile);
            }
        });
        defense.projectiles = nextProjectiles;

        defense.plants.forEach(function (plant) {
            const rule = DEFENSE_PLANT_RULES[plant.plantId];
            if (!rule || !rule.damage || defense.tick % rule.cooldown !== 0) return;
            const target = defense.zombies.find(item => item.health > 0 && item.lane === plant.lane && item.column > plant.column);
            if (!target) return;
            defense.projectiles.push({
                id: defenseEntityId(defense, 'pea'),
                lane: plant.lane,
                column: plant.column,
                damage: rule.damage,
                slowTicks: rule.slowTicks || 0
            });
        });

        defense.zombies.forEach(function (zombie) {
            if (zombie.health <= 0 || zombie.slowTicks > 0) {
                zombie.slowTicks = Math.max(0, zombie.slowTicks - 1);
                return;
            }
            const blockingPlant = defensePlantAt(defense, zombie.lane, zombie.column - 1);
            if (blockingPlant) {
                blockingPlant.health = Math.max(0, blockingPlant.health - 1);
                return;
            }
            const rule = DEFENSE_ZOMBIE_RULES[zombie.kind] || DEFENSE_ZOMBIE_RULES['zombie-basic'];
            zombie.moveClock += 1;
            if (zombie.moveClock >= rule.moveEvery && zombie.column > 0) {
                zombie.column -= 1;
                zombie.moveClock = 0;
            }
        });

        const defeated = defense.zombies.filter(item => item.health <= 0);
        if (defeated.length) {
            defense.defeated += defeated.length;
            growth.garden.invader.defeated += defeated.length;
        }
        defense.zombies = defense.zombies.filter(item => item.health > 0 && item.column >= 0);
        defense.plants = defense.plants.filter(item => item.health > 0);
        if (!defense.zombies.length && defense.wave > 0) defense.status = 'won';
        return growth;
    }

    function tickDefense(input, steps) {
        const growth = normalize(input);
        const count = Math.max(1, Math.min(60, Math.floor(Number(steps) || 1)));
        for (let index = 0; index < count; index += 1) stepDefense(growth);
        return { ok: true, growth: growth, defense: growth.garden.defense };
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
        PLANT_RULES: DEFENSE_PLANT_RULES,
        ZOMBIE_CATALOG: ZOMBIE_CATALOG,
        COLLECTION_CATALOG: COLLECTION_CATALOG,
        ACTION_EVENTS: ACTION_EVENTS,
        createDefaultGarden: createDefaultGarden,
        createDefaultCollection: createDefaultCollection,
        createDefaultDefense: createDefaultDefense,
        normalize: normalize,
        applySunlight: applySunlight,
        recordEvent: recordEvent,
        spawnInvader: spawnInvader,
        firePea: firePea,
        usePlantSkill: usePlantSkill,
        getDefenseView: getDefenseView,
        setFeedbackPreference: setFeedbackPreference,
        selectPlant: selectPlant,
        startDefenseGame: startDefenseGame,
        placeDefensePlant: placeDefensePlant,
        spawnDefenseWave: spawnDefenseWave,
        tickDefense: tickDefense,
        getView: getView
    };
}(typeof window !== 'undefined' ? window : globalThis));
