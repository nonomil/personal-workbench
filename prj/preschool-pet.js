(function (global) {
    'use strict';

    const FEED_COST = 5;
    const HUNGER_PER_FEED = 20;
    const DECAY_PER_HOUR = 2;
    const STAGES = [
        { stage: 0, name: '蛋', maxExp: 50 },
        { stage: 1, name: '幼崽', maxExp: 150 },
        { stage: 2, name: '成长体', maxExp: 400 },
        { stage: 3, name: '进化体', maxExp: 1000 }
    ];
    const THEME_PETS = {
        'garden-defense': { type: 'sunflower', name: '小向日葵', stages: ['阳光蛋', '小芽', '向日葵', '太阳花'] },
        'voxel-adventure': { type: 'crystal', name: '小晶体', stages: ['方块蛋', '小晶体', '发光矿', '水晶守护'] },
        'platform-quest': { type: 'star', name: '探险星芒', stages: ['星尘蛋', '小旅伴', '探险员', '星光勇者'] }
    };
    const PET_ART_BASE = '../assets/generated/preschool-badges-pets/pets/published/';
    const PVZ_ART_BASE = '../assets/generated/preschool-pvz-2d/published/';
    const MC_ENEMY_BASE = '../games/voxel-adventure/assets/enemies/';
    const MC_ITEM_BASE = '../games/voxel-adventure/assets/mc/items/';
    const MC_BLOCK_BASE = '../games/voxel-adventure/assets/mc/blocks/';
    const SPECIES = {
        'pvz-sunflower': {
            id: 'pvz-sunflower', series: 'pvz', type: 'sunflower', name: '小向日葵',
            stages: ['阳光蛋', '小芽', '向日葵', '太阳花'],
            unlock: { always: true },
            art: [PET_ART_BASE + 'pet-garden-egg.png', PET_ART_BASE + 'pet-garden-sprout.png', PVZ_ART_BASE + 'pvz-sunflower.png', PET_ART_BASE + 'pet-garden-evolved.png'],
            hungry: PET_ART_BASE + 'pet-garden-hungry.png'
        },
        'pvz-peashooter': {
            id: 'pvz-peashooter', series: 'pvz', type: 'sunflower', name: '豌豆射手',
            stages: ['豌豆蛋', '小芽', '豌豆射手', '机枪豌豆'],
            unlock: { gardenStage: 2 },
            art: [PET_ART_BASE + 'pet-garden-egg.png', PET_ART_BASE + 'pet-garden-sprout.png', PVZ_ART_BASE + 'pvz-peashooter.png', PVZ_ART_BASE + 'pvz-peashooter.png'],
            hungry: PET_ART_BASE + 'pet-garden-hungry.png'
        },
        'pvz-wallnut': {
            id: 'pvz-wallnut', series: 'pvz', type: 'sunflower', name: '坚果墙',
            stages: ['坚果蛋', '小芽', '坚果墙', '高坚果'],
            unlock: { gardenStage: 3 },
            art: [PET_ART_BASE + 'pet-garden-egg.png', PET_ART_BASE + 'pet-garden-sprout.png', PVZ_ART_BASE + 'pvz-wallnut.png', PVZ_ART_BASE + 'pvz-wallnut.png'],
            hungry: PET_ART_BASE + 'pet-garden-hungry.png'
        },
        'pvz-cherrybomb': {
            id: 'pvz-cherrybomb', series: 'pvz', type: 'sunflower', name: '樱桃炸弹',
            stages: ['樱桃蛋', '小芽', '樱桃炸弹', '爆裂樱桃'],
            unlock: { gardenWins: 1 },
            art: [PET_ART_BASE + 'pet-garden-egg.png', PET_ART_BASE + 'pet-garden-sprout.png', PVZ_ART_BASE + 'pvz-cherrybomb.png', PVZ_ART_BASE + 'pvz-cherrybomb.png'],
            hungry: PET_ART_BASE + 'pet-garden-hungry.png'
        },
        'mc-slime': {
            id: 'mc-slime', series: 'mc', type: 'crystal', name: '史莱姆',
            stages: ['方块蛋', '小凝胶', '史莱姆', '大史莱姆'],
            unlock: { always: true },
            art: [PET_ART_BASE + 'pet-voxel-egg.png', PET_ART_BASE + 'pet-voxel-cub.png', MC_ENEMY_BASE + 'slime-idle.png', PET_ART_BASE + 'pet-voxel-evolved.png'],
            hungry: PET_ART_BASE + 'pet-voxel-hungry.png'
        },
        'mc-bee': {
            id: 'mc-bee', series: 'mc', type: 'crystal', name: '蜜蜂',
            stages: ['苹果蛋', '小蜜蜂', '蜜蜂', '蜂王'],
            unlock: { voxelLevel: 2 },
            art: [MC_ITEM_BASE + 'apple.png', PET_ART_BASE + 'pet-voxel-cub.png', MC_ENEMY_BASE + 'bee-idle.png', MC_ENEMY_BASE + 'bee-idle.png'],
            hungry: PET_ART_BASE + 'pet-voxel-hungry.png'
        },
        'mc-snowman': {
            id: 'mc-snowman', series: 'mc', type: 'crystal', name: '雪人',
            stages: ['钻石蛋', '小雪团', '雪人', '雪傀儡'],
            unlock: { voxelCrystals: 1 },
            art: [MC_ITEM_BASE + 'diamond.png', PET_ART_BASE + 'pet-voxel-cub.png', MC_ENEMY_BASE + 'snowman-idle.png', MC_ENEMY_BASE + 'snowman-idle.png'],
            hungry: PET_ART_BASE + 'pet-voxel-hungry.png'
        },
        'mc-golem': {
            id: 'mc-golem', series: 'mc', type: 'crystal', name: '铁傀儡',
            stages: ['矿石蛋', '小石人', '铁傀儡', '铁守护'],
            unlock: { voxelQuests: 1 },
            art: [MC_BLOCK_BASE + 'iron-ore.png', PET_ART_BASE + 'pet-voxel-cub.png', MC_ENEMY_BASE + 'golem.png', MC_ENEMY_BASE + 'golem.png'],
            hungry: PET_ART_BASE + 'pet-voxel-hungry.png'
        },
        'mc-spider': {
            id: 'mc-spider', series: 'mc', type: 'crystal', name: '蜘蛛',
            stages: ['煤炭蛋', '小蛛', '蜘蛛', '洞穴蜘蛛'],
            unlock: { voxelLevel: 2 },
            art: [MC_ITEM_BASE + 'coal.png', PET_ART_BASE + 'pet-voxel-cub.png', MC_ENEMY_BASE + 'spider.png', MC_ENEMY_BASE + 'spider.png'],
            hungry: PET_ART_BASE + 'pet-voxel-hungry.png'
        },
        'mc-bat': {
            id: 'mc-bat', series: 'mc', type: 'crystal', name: '蝙蝠',
            stages: ['石块蛋', '小翼', '蝙蝠', '夜翼'],
            unlock: { voxelLevel: 3 },
            art: [MC_BLOCK_BASE + 'cobblestone.png', PET_ART_BASE + 'pet-voxel-cub.png', MC_ENEMY_BASE + 'bat-idle.png', MC_ENEMY_BASE + 'bat-idle.png'],
            hungry: PET_ART_BASE + 'pet-voxel-hungry.png'
        },
        'mc-blaze': {
            id: 'mc-blaze', series: 'mc', type: 'crystal', name: '烈焰人',
            stages: ['火把蛋', '小火团', '烈焰人', '烈焰使者'],
            unlock: { voxelLevel: 4 },
            art: [MC_BLOCK_BASE + 'torch.png', PET_ART_BASE + 'pet-voxel-cub.png', MC_ENEMY_BASE + 'fire-spirit-idle.png', MC_ENEMY_BASE + 'fire-spirit-idle.png'],
            hungry: PET_ART_BASE + 'pet-voxel-hungry.png'
        },
        'platform-star': {
            id: 'platform-star', series: 'platform', type: 'star', name: '探险星芒',
            stages: ['星尘蛋', '小旅伴', '探险员', '星光勇者'],
            unlock: { always: true },
            art: [PET_ART_BASE + 'pet-platform-egg.png', PET_ART_BASE + 'pet-platform-cub.png', PET_ART_BASE + 'pet-platform-growth.png', PET_ART_BASE + 'pet-platform-evolved.png'],
            hungry: PET_ART_BASE + 'pet-platform-hungry.png'
        }
    };

    let pendingHappiness = 0;

    function clamp(value, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.max(min, Math.min(max, number));
    }

    function themeProfile(themeId) {
        return THEME_PETS[themeId] || THEME_PETS['garden-defense'];
    }

    function defaultSpeciesId(themeId) {
        if (themeId === 'voxel-adventure') return 'mc-slime';
        if (themeId === 'platform-quest') return 'platform-star';
        return 'pvz-sunflower';
    }

    function speciesById(speciesId, themeId) {
        return SPECIES[speciesId] || SPECIES[defaultSpeciesId(themeId)];
    }

    function speciesIdFromLegacy(source) {
        const raw = source && typeof source === 'object' ? source : {};
        if (raw.speciesId && SPECIES[raw.speciesId]) return raw.speciesId;
        if (raw.type === 'crystal') return 'mc-slime';
        if (raw.type === 'star') return 'platform-star';
        return 'pvz-sunflower';
    }

    function worldSlice(worldGames, gameId) {
        return worldGames && typeof worldGames === 'object' && worldGames[gameId] && typeof worldGames[gameId] === 'object'
            ? worldGames[gameId]
            : {};
    }

    function isUnlocked(spec, worldGames) {
        const unlock = spec && spec.unlock ? spec.unlock : {};
        if (unlock.always) return true;
        const garden = worldSlice(worldGames, 'garden-defense');
        const voxel = worldSlice(worldGames, 'voxel-adventure');
        if (unlock.gardenStage && Number(garden.unlockedStage || 1) >= unlock.gardenStage) return true;
        if (unlock.gardenWins && Number(garden.totalWins || 0) >= unlock.gardenWins) return true;
        if (unlock.voxelLevel && Number(voxel.unlockedLevel || 1) >= unlock.voxelLevel) return true;
        if (unlock.voxelCrystals && Number(voxel.crystalsTotal || 0) >= unlock.voxelCrystals) return true;
        if (unlock.voxelQuests && (Array.isArray(voxel.questsDone) ? voxel.questsDone.length : 0) >= unlock.voxelQuests) return true;
        return false;
    }

    function seriesForTheme(themeId) {
        if (themeId === 'voxel-adventure') return 'mc';
        if (themeId === 'garden-defense') return 'pvz';
        if (themeId === 'platform-quest') return 'platform';
        return '';
    }

    function seriesMatchesTheme(spec, themeId) {
        const wanted = seriesForTheme(themeId);
        return !wanted || spec.series === wanted;
    }

    function themeAlignedPet(pet, themeId) {
        const next = normalize(pet);
        const spec = speciesById(next.speciesId, themeId);
        if (themeId && next.stage === 0 && !seriesMatchesTheme(spec, themeId)) {
            const starter = speciesById(defaultSpeciesId(themeId), themeId);
            next.speciesId = starter.id;
            next.type = starter.type;
            next.name = starter.name;
        }
        return next;
    }

    function unlockHint(spec) {
        const unlock = spec && spec.unlock ? spec.unlock : {};
        if (unlock.always) return '';
        if (unlock.voxelLevel) return '方块 ' + unlock.voxelLevel + ' 关';
        if (unlock.voxelCrystals) return '收集晶体';
        if (unlock.voxelQuests) return '完成任务';
        if (unlock.gardenStage) return '花园 ' + unlock.gardenStage + ' 关';
        if (unlock.gardenWins) return '赢一场';
        return '还没准备好';
    }

    function listSpecies(worldGames, themeId) {
        const wanted = seriesForTheme(themeId);
        return Object.keys(SPECIES).filter(function (id) {
            return !wanted || SPECIES[id].series === wanted;
        }).map(function (id) {
            const spec = SPECIES[id];
            return {
                id: spec.id,
                series: spec.series,
                name: spec.name,
                stages: spec.stages.slice(),
                unlocked: isUnlocked(spec, worldGames),
                eggArt: spec.art[0],
                unlockHint: unlockHint(spec)
            };
        });
    }

    function normalize(input) {
        const source = input && typeof input === 'object' ? input : {};
        const stage = clamp(source.stage, 0, 3);
        const speciesId = speciesIdFromLegacy(source);
        const spec = speciesById(speciesId);
        return {
            type: spec.type,
            name: spec.name,
            speciesId: spec.id,
            stage: stage,
            exp: Math.max(0, Number(source.exp) || 0),
            maxExp: STAGES[stage].maxExp,
            hunger: clamp(source.hunger == null ? 80 : source.hunger, 0, 100),
            lastUpdate: Number(source.lastUpdate) || Date.now(),
            feedCount: Math.max(0, Number(source.feedCount) || 0)
        };
    }

    function evolve(pet) {
        let next = normalize(pet);
        while (next.stage < 3 && next.exp >= STAGES[next.stage].maxExp) {
            next.stage += 1;
            next.maxExp = STAGES[next.stage].maxExp;
        }
        return next;
    }

    function sync(input, now) {
        const stamp = Number(now) || Date.now();
        const pet = normalize(input);
        const hours = Math.max(0, (stamp - pet.lastUpdate) / 3600000);
        pet.hunger = clamp(Math.round(pet.hunger - hours * DECAY_PER_HOUR), 0, 100);
        pet.lastUpdate = stamp;
        return evolve(pet);
    }

    function readPet(growth) {
        return normalize(growth && growth.pet);
    }

    function writePet(growth, pet) {
        const next = growth && typeof growth === 'object' ? growth : {};
        next.pet = evolve(pet);
        return next;
    }

    function awardExp(growth, amount, now) {
        const next = growth && typeof growth === 'object' ? growth : {};
        const pet = sync(readPet(next), now);
        pet.exp += Math.max(0, Number(amount) || 0);
        return writePet(next, pet);
    }

    function addHappiness(growth, amount, now) {
        const next = growth && typeof growth === 'object' ? growth : {};
        const pet = sync(readPet(next), now);
        pet.hunger = clamp(pet.hunger + Math.max(0, Number(amount) || 0), 0, 100);
        return writePet(next, pet);
    }

    function takePendingHappiness() {
        const value = pendingHappiness;
        pendingHappiness = 0;
        return value;
    }

    function feed(growth, now, themeId) {
        const next = growth && typeof growth === 'object' ? JSON.parse(JSON.stringify(growth)) : { sunlight: 0 };
        const sunlight = Math.max(0, Number(next.sunlight) || 0);
        if (sunlight < FEED_COST) return { ok: false, reason: '还需要 5 阳光才能喂食', growth: next, evolved: false };
        const before = themeAlignedPet(sync(readPet(next), now), themeId);
        const stageBefore = before.stage;
        next.sunlight = sunlight - FEED_COST;
        before.hunger = clamp(before.hunger + HUNGER_PER_FEED, 0, 100);
        before.feedCount += 1;
        before.exp += 10;
        writePet(next, before);
        return { ok: true, growth: next, evolved: next.pet.stage > stageBefore };
    }

    function artSrc(themeId, stage, hungry, speciesId) {
        const spec = speciesById(speciesId, themeId);
        const index = clamp(stage, 0, 3);
        if (hungry && index >= 1 && spec.hungry) return spec.hungry;
        return spec.art[index] || spec.art[0];
    }

    function view(growth, themeId, now) {
        const pet = themeAlignedPet(sync(readPet(growth), now), themeId);
        const spec = speciesById(pet.speciesId, themeId);
        const stage = STAGES[pet.stage] || STAGES[0];
        const hungry = pet.hunger < 20;
        return {
            pet: pet,
            displayName: spec.name,
            stageName: spec.stages[pet.stage] || stage.name,
            hungry: hungry,
            hungerLabel: hungry ? '好饿…' : (pet.hunger < 50 ? '有点饿' : '饱饱的'),
            feedCost: FEED_COST,
            art: artSrc(themeId, pet.stage, hungry, pet.speciesId)
        };
    }

    function hatch(growth, speciesId, now) {
        const spec = SPECIES[speciesId];
        const next = growth && typeof growth === 'object' ? JSON.parse(JSON.stringify(growth)) : { sunlight: 0 };
        if (!spec) return { ok: false, reason: '没有这颗蛋', growth: next };
        if (!isUnlocked(spec, next.worldGames)) return { ok: false, reason: '这颗蛋还没准备好', growth: next };
        const pet = sync(readPet(next), now);
        if (pet.stage > 0 && pet.speciesId !== spec.id) {
            return { ok: false, reason: '先把现在的伙伴养大', growth: next };
        }
        pet.speciesId = spec.id;
        pet.type = spec.type;
        pet.name = spec.name;
        writePet(next, pet);
        return { ok: true, growth: next };
    }

    function renderEggNest(growth, themeId, card) {
        const canSwitch = card.pet.stage === 0;
        const worldGames = growth && growth.worldGames;
        let species = listSpecies(worldGames, themeId);
        if (!themeId && card.pet.speciesId && !species.some(function (item) { return item.id === card.pet.speciesId; })) {
            const current = listSpecies(worldGames).find(function (item) { return item.id === card.pet.speciesId; });
            if (current) species = [current].concat(species);
        }
        const buttons = species.map(function (item) {
            const selected = item.id === card.pet.speciesId;
            const locked = !item.unlocked;
            const disabled = locked || (!canSwitch && !selected);
            return `<button class="preschool-pet-egg${selected ? ' is-current' : ''}${locked ? ' is-locked' : ''}" type="button" data-action="hatch-egg" data-id="${escapeHtml(item.id)}" ${disabled ? 'disabled' : ''} aria-label="${escapeHtml(item.name)}"><img src="${escapeHtml(item.eggArt)}" alt="" width="44" height="44"><small>${escapeHtml(locked ? (item.unlockHint || '还没准备好') : item.stages[0])}</small></button>`;
        }).join('');
        return `<div class="preschool-pet-eggs" aria-label="宠物蛋">${buttons}</div>`;
    }

    function renderCard(growth, themeId, now) {
        const card = view(growth, themeId, now);
        const hungryClass = card.hungry ? ' is-hungry' : '';
        return `<section class="preschool-pet-card${hungryClass}" aria-label="伙伴养成"><div class="preschool-pet-art" data-pet-stage="${card.pet.stage}"><img src="${escapeHtml(card.art)}" alt="" width="72" height="72"></div><div class="preschool-pet-copy"><span class="eyebrow">PET / EGG</span><h2>${escapeHtml(card.displayName)} · ${escapeHtml(card.stageName)}</h2><p>${escapeHtml(card.hungerLabel)} · 经验 ${card.pet.exp}/${card.pet.maxExp}</p><div class="preschool-pet-hunger" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(card.pet.hunger)}"><i style="width:${Math.round(card.pet.hunger)}%"></i></div></div><div class="preschool-pet-actions"><button class="workbench-action-button" type="button" data-action="feed-pet">喂食 · ${card.feedCost} 阳光</button><button class="workbench-text-button" type="button" data-action="pat-pet">摸摸</button></div>${renderEggNest(growth, themeId, card)}</section>`;
    }

    function renderFeedShortcut(label) {
        return `<button class="workbench-action-button" type="button" data-action="feed-pet">${escapeHtml(label || '去喂星芒')}</button>`;
    }

    function renderCapsule(growth, themeId, now) {
        const card = view(growth, themeId, now);
        return `<button class="preschool-home-identity preschool-home-pet-capsule${card.hungry ? ' is-hungry' : ''}" type="button" data-action="navigate" data-page="growth" aria-label="${escapeHtml(card.displayName)} ${escapeHtml(card.hungerLabel)}"><img src="${escapeHtml(card.art)}" alt="" width="44" height="44"><span><b>${escapeHtml(card.displayName)}</b><small>${escapeHtml(card.hungerLabel)}</small></span></button>`;
    }

    function pat(growth, now, themeId) {
        const next = growth && typeof growth === 'object' ? JSON.parse(JSON.stringify(growth)) : {};
        const pet = themeAlignedPet(sync(readPet(next), now), themeId);
        pet.hunger = clamp(pet.hunger + 5, 0, 100);
        writePet(next, pet);
        return next;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showEvolution(themeId, stage, doc, speciesId) {
        const root = doc || (typeof document !== 'undefined' ? document : null);
        if (!root || !root.body) return;
        const card = view({ pet: { stage: stage, hunger: 80, lastUpdate: Date.now(), speciesId: speciesId } }, themeId, Date.now());
        const old = root.querySelector('.preschool-pet-evolve-overlay');
        if (old) old.remove();
        const overlay = root.createElement('div');
        overlay.className = 'preschool-pet-evolve-overlay';
        overlay.innerHTML = `<div class="preschool-pet-evolve-dialog" role="dialog" aria-label="伙伴进化"><img src="${escapeHtml(card.art)}" alt=""><strong>进化啦</strong><small>${escapeHtml(card.displayName)} · ${escapeHtml(card.stageName)}</small><button type="button" data-pet-evolve-close="true">太棒了</button></div>`;
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay || event.target.closest('[data-pet-evolve-close]')) overlay.remove();
        });
        root.body.appendChild(overlay);
        if (typeof window !== 'undefined') {
            window.setTimeout(function () {
                if (overlay.parentNode) overlay.remove();
            }, 2800);
        }
    }

    global.PersonalWorkbenchPet = {
        FEED_COST: FEED_COST,
        STAGES: STAGES,
        themeProfile: themeProfile,
        listSpecies: listSpecies,
        hatch: hatch,
        normalize: normalize,
        sync: sync,
        awardExp: awardExp,
        addHappiness: addHappiness,
        takePendingHappiness: takePendingHappiness,
        feed: feed,
        pat: pat,
        view: view,
        artSrc: artSrc,
        renderCard: renderCard,
        renderFeedShortcut: renderFeedShortcut,
        renderCapsule: renderCapsule,
        showEvolution: showEvolution
    };

    global.petSystem = {
        addHappiness: function (amount) {
            pendingHappiness += Math.max(0, Number(amount) || 0);
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
