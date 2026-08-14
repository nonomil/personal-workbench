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
    const PET_ART_FILES = {
        'garden-defense': ['pet-garden-egg.png', 'pet-garden-sprout.png', 'pet-garden-sunflower.png', 'pet-garden-evolved.png'],
        'voxel-adventure': ['pet-voxel-egg.png', 'pet-voxel-cub.png', 'pet-voxel-growth.png', 'pet-voxel-evolved.png'],
        'platform-quest': ['pet-platform-egg.png', 'pet-platform-cub.png', 'pet-platform-growth.png', 'pet-platform-evolved.png']
    };
    const PET_HUNGRY_FILES = {
        'garden-defense': 'pet-garden-hungry.png',
        'voxel-adventure': 'pet-voxel-hungry.png',
        'platform-quest': 'pet-platform-hungry.png'
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

    function normalize(input) {
        const source = input && typeof input === 'object' ? input : {};
        const stage = clamp(source.stage, 0, 3);
        return {
            type: String(source.type || 'sunflower'),
            name: String(source.name || '小向日葵'),
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

    function feed(growth, now) {
        const next = growth && typeof growth === 'object' ? JSON.parse(JSON.stringify(growth)) : { sunlight: 0 };
        const sunlight = Math.max(0, Number(next.sunlight) || 0);
        if (sunlight < FEED_COST) return { ok: false, reason: '还需要 5 阳光才能喂食', growth: next, evolved: false };
        const before = sync(readPet(next), now);
        const stageBefore = before.stage;
        next.sunlight = sunlight - FEED_COST;
        before.hunger = clamp(before.hunger + HUNGER_PER_FEED, 0, 100);
        before.feedCount += 1;
        before.exp += 10;
        writePet(next, before);
        return { ok: true, growth: next, evolved: next.pet.stage > stageBefore };
    }

    function artSrc(themeId, stage, hungry) {
        const files = PET_ART_FILES[themeId] || PET_ART_FILES['garden-defense'];
        const index = clamp(stage, 0, 3);
        const hungryFile = hungry && index >= 1 ? PET_HUNGRY_FILES[themeId] || PET_HUNGRY_FILES['garden-defense'] : '';
        return PET_ART_BASE + (hungryFile || files[index] || files[0]);
    }

    function view(growth, themeId, now) {
        const pet = sync(readPet(growth), now);
        const theme = themeProfile(themeId);
        const stage = STAGES[pet.stage] || STAGES[0];
        const hungry = pet.hunger < 20;
        return {
            pet: pet,
            displayName: theme.name,
            stageName: theme.stages[pet.stage] || stage.name,
            hungry: hungry,
            hungerLabel: hungry ? '好饿…' : (pet.hunger < 50 ? '有点饿' : '饱饱的'),
            feedCost: FEED_COST,
            art: artSrc(themeId, pet.stage, hungry)
        };
    }

    function renderCard(growth, themeId, now) {
        const card = view(growth, themeId, now);
        const hungryClass = card.hungry ? ' is-hungry' : '';
        return `<section class="preschool-pet-card${hungryClass}" aria-label="伙伴养成"><div class="preschool-pet-art" data-pet-stage="${card.pet.stage}"><img src="${escapeHtml(card.art)}" alt="" width="72" height="72"></div><div class="preschool-pet-copy"><span class="eyebrow">PET / FEED</span><h2>${escapeHtml(card.displayName)} · ${escapeHtml(card.stageName)}</h2><p>${escapeHtml(card.hungerLabel)} · 经验 ${card.pet.exp}/${card.pet.maxExp}</p><div class="preschool-pet-hunger" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(card.pet.hunger)}"><i style="width:${Math.round(card.pet.hunger)}%"></i></div></div><div class="preschool-pet-actions"><button class="workbench-action-button" type="button" data-action="feed-pet">喂食 · ${card.feedCost} 阳光</button><button class="workbench-text-button" type="button" data-action="pat-pet">摸摸</button></div></section>`;
    }

    function renderCapsule(growth, themeId, now) {
        const card = view(growth, themeId, now);
        return `<button class="preschool-home-pet-capsule${card.hungry ? ' is-hungry' : ''}" type="button" data-action="navigate" data-page="growth" aria-label="${escapeHtml(card.displayName)} ${escapeHtml(card.hungerLabel)}"><img src="${escapeHtml(card.art)}" alt="" width="44" height="44"><span><b>${escapeHtml(card.displayName)}</b><small>${escapeHtml(card.hungerLabel)}</small></span></button>`;
    }

    function pat(growth, now) {
        const next = growth && typeof growth === 'object' ? JSON.parse(JSON.stringify(growth)) : {};
        const pet = sync(readPet(next), now);
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

    function showEvolution(themeId, stage, doc) {
        const root = doc || (typeof document !== 'undefined' ? document : null);
        if (!root || !root.body) return;
        const card = view({ pet: { stage: stage, hunger: 80, lastUpdate: Date.now() } }, themeId, Date.now());
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
        renderCapsule: renderCapsule,
        showEvolution: showEvolution
    };

    global.petSystem = {
        addHappiness: function (amount) {
            pendingHappiness += Math.max(0, Number(amount) || 0);
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
