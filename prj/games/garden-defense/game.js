(function () {
    'use strict';

    /**
     * 花园保卫 · 种植物后豌豆自己发射（接近原版循环）
     * 规则：selectPlant / placeDefensePlant / spawnDefenseWave / tickDefense
     * 循环参考 G:/StudyCode/pvz-refs/PlantsVsZombiesJS（MIT）：同路才打、子弹平移、点阳光。
     * 角色用 preschool-pixel/pvz，草坪用 pvz-garden-lawn-bg.webp。
     */
    const bridge = window.WorkbenchGameBridge;
    const garden = window.PersonalWorkbenchPreschoolGarden;
    const stagesApi = window.GardenDefenseStages;
    const GAME_ID = 'garden-defense';
    const TICK_MS = 880;
    const WALK_LURCH = 0.2;
    const FIRST_WAVE_MS = 4200;
    const NEXT_WAVE_MS = 2800;
    let plantsLost = 0;
    let lastPlantCount = 0;
    let plantedAt = 0;
    let wavePauseUntil = 0;

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    const VIEW_W = 1080;
    const VIEW_H = 540;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    const PVZ = '../../assets/generated/preschool-pvz-2d/published/';
    const LOCAL = './assets/';
    const LAWN = LOCAL + 'bg/pvz-garden-lawn-bg.webp?v=20260815-ref-v1';
    const ASSETS = {
        bg: LAWN,
        'bg-day': LAWN,
        'bg-sunset': LAWN,
        'bg-night': LAWN,
        sun: PVZ + 'pvz-sun-token.png',
        'plant-sunflower': LOCAL + 'plants/plant-sunflower.png?v=20260815-ref-v1',
        'plant-peashooter': LOCAL + 'plants/plant-peashooter.png?v=20260815-ref-v1',
        'plant-wallnut': LOCAL + 'plants/plant-wallnut.png?v=20260815-ref-v1',
        'plant-snowpea': LOCAL + 'plants/plant-snowpea.png?v=20260815-ref-v1',
        'plant-cherrybomb': LOCAL + 'plants/plant-cherrybomb.webp?v=20260815-ref-v1',
        'zombie-basic': LOCAL + 'zombies/zombie-basic.webp?v=20260815-ref-v1',
        'zombie-conehead': LOCAL + 'zombies/zombie-conehead.webp?v=20260815-ref-v1',
        'zombie-buckethead': LOCAL + 'zombies/zombie-buckethead.webp?v=20260815-ref-v1',
        'zombie-flag': LOCAL + 'zombies/zombie-flag.webp?v=20260815-ref-v1',
        'zombie-football': LOCAL + 'zombies/zombie-football.webp?v=20260815-ref-v1'
    };

    const images = {};
    let progress = null;
    let currentStage = null;
    let selectedPlantId = 'plant-sunflower';
    let hoverPoint = null;
    let animPhase = 0;
    let settled = false;
    let lastDefenseTick = 0;
    let enterAt = 0;
    let lastSkySunAt = 0;
    let skySuns = [];
    let autoWaveTried = false;

    // ===== S1：学习难度联动（G1）/ 结算三行（G2）/ 星芒陪伴（G3）=====
    const USE_PLAY_MODS = true;
    let playMods = null;
    let speedAcc = {};
    let extraSeq = 0;
    let celebrateQueue = [];
    const COMPANION_ART = '../../assets/generated/preschool-pixel/published/star-companion.png?v=20260815-s1';

    const els = {
        wallet: document.getElementById('wallet-hud'),
        map: document.getElementById('stage-map'),
        panelMap: document.getElementById('panel-map'),
        panelPlay: document.getElementById('panel-play'),
        stageTitle: document.getElementById('stage-title'),
        stageBlurb: document.getElementById('stage-blurb'),
        killCount: document.getElementById('kill-count'),
        killNeed: document.getElementById('kill-need'),
        energy: document.getElementById('energy-count'),
        status: document.getElementById('run-status'),
        tip: document.getElementById('message-tip'),
        seeds: document.getElementById('seed-tray'),
        progressTip: document.getElementById('progress-tip'),
        toast: document.getElementById('toast'),
        stageCount: document.getElementById('stage-count'),
        back: document.getElementById('back-link'),
        modBadge: document.getElementById('mod-badge'),
        companionSay: document.getElementById('companion-say'),
        settleLayer: document.getElementById('settle-layer'),
        settleTitle: document.getElementById('settle-title'),
        settleGain: document.getElementById('settle-gain'),
        settleCompanion: document.getElementById('settle-companion'),
        settleProgressLabel: document.getElementById('settle-progress-label'),
        settleBarFill: document.getElementById('settle-bar-fill'),
        settleGoal: document.getElementById('settle-goal'),
        settleRetry: document.getElementById('settle-retry-btn'),
        settleMap: document.getElementById('settle-map-btn'),
        celebrateLayer: document.getElementById('celebrate-layer'),
        celebrateTitle: document.getElementById('celebrate-title'),
        celebrateSub: document.getElementById('celebrate-sub'),
        celebrateClose: document.getElementById('celebrate-close-btn')
    };

    function toast(msg) {
        els.toast.textContent = msg;
        els.toast.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { els.toast.classList.remove('is-on'); }, 2400);
    }

    // ===== G1：难度应用纯函数（合同测试经 vm 抽取断言）=====
    // mods 为 null 时行为与现状完全一致（bridge 无 getPlayMods 的兜底）
    function applyPlayMods(wave, mods) {
        const base = wave || {};
        const zombies = (base.zombies || []).map(function (z) {
            return Object.assign({}, z, { speedMult: mods ? (Number(mods.enemySpeed) || 1) : 1 });
        });
        return {
            zombies: zombies,
            extraMob: mods && mods.extraMob ? 1 : 0,
            rewardSun: mods ? Math.round((Number(base.rewardSun) || 0) * (Number(mods.sunMult) || 1)) : (Number(base.rewardSun) || 0)
        };
    }

    // 速度乘数只落在应用层：不动规则层的 moveEvery，而是按倍率快慢补偿 moveClock。
    // acc 是 game.js 侧的每僵尸小数累加器（不写入 growth 状态，normalize 会丢弃未知字段）。
    function advanceMoveClocks(defense, acc, mods) {
        const map = acc || {};
        if (!defense || !mods) return map;
        const mult = Number(mods.enemySpeed) || 1;
        if (mult === 1) return map;
        (defense.zombies || []).forEach(function (zombie) {
            if (!zombie || Number(zombie.health) <= 0 || Number(zombie.slowTicks) > 0) return;
            const blocked = (defense.plants || []).some(function (plant) {
                return plant && plant.health > 0 && plant.lane === zombie.lane && plant.column === zombie.column - 1;
            });
            if (blocked) return;
            const key = String(zombie.id);
            map[key] = (Number(map[key]) || 0) + (mult - 1);
            if (map[key] >= 1) {
                const whole = Math.floor(map[key]);
                zombie.moveClock = (Number(zombie.moveClock) || 0) + whole;
                map[key] -= whole;
            } else if (map[key] <= -1) {
                const whole = Math.ceil(map[key]);
                zombie.moveClock = Math.max(0, (Number(zombie.moveClock) || 0) + whole);
                map[key] -= whole;
            }
        });
        return map;
    }

    // ===== G2：结算三行数据组装（meta 即 bridge.getMetaSummary() 的返回值）=====
    function milestoneGapText(badge, meta) {
        const m = /^(ms-(garden|voxel|platform)-)(\d+)$/.exec(badge.id || '');
        if (m) {
            const key = m[2] === 'garden' ? 'gardenClears' : (m[2] === 'voxel' ? 'voxelQuests' : 'platformClears');
            const unit = m[2] === 'voxel' ? '个任务' : '关';
            return '还差 ' + Math.max(1, (Number(m[3]) || 0) - (Number(meta && meta[key]) || 0)) + ' ' + unit;
        }
        if (badge.id === 'ms-stars-20') return '还差 ' + Math.max(1, 20 - (Number(meta && meta.totalStars) || 0)) + ' 颗星';
        const play = /^ms-play-(\d+)$/.exec(badge.id || '');
        if (play) return '还差 ' + Math.max(1, Number(play[1]) - (Number(meta && meta.playDaysTotal) || 0)) + ' 天';
        return badge.desc || '';
    }

    function buildSettlementLines(input) {
        const data = input || {};
        const meta = data.meta || {};
        const badges = Array.isArray(meta.badges) ? meta.badges : [];
        const next = badges.filter(function (b) { return b && !b.unlocked; })[0] || null;
        const points = Number(meta.adventurePoints) || 0;
        const need = meta.nextRank ? (Number(meta.nextRank.need) || points) : points;
        const mult = Number(data.sunMult) || 1;
        let gain = '';
        if (data.won) {
            gain = data.sunCapped
                ? '本局所得：今日阳光已达上限，星芒帮你记着 ★×' + (Number(data.stars) || 0)
                : '本局所得：阳光 +' + (Number(data.sunAwarded) || 0) + (mult > 1 ? '（×' + mult + '）' : '') + ' · ★×' + (Number(data.stars) || 0);
        }
        return {
            gain: gain,
            progressLabel: '冒险等级 Lv.' + (meta.adventureLevel || 1) + ' ' + (meta.adventureTitle || '') + ' · ' + points + '/' + need,
            progressPercent: need > 0 ? Math.min(100, Math.round(points / need * 100)) : 100,
            nextGoal: next
                ? '下一个目标：' + next.title + ' · ' + milestoneGapText(next, meta)
                : '所有里程碑都点亮啦，{who}是最棒的花园守护者！'
        };
    }

    // ===== G3：星芒文案池（开局按档位 3 条 / 通关 4 条 / 失败打气 5 条含策略提示）=====
    const COMPANION_LINES = {
        welcome: {
            '简单': [
                '今天的僵尸慢悠悠，{who}随便种都能守住。',
                '简单模式开启！星芒陪你先认识向日葵。',
                '僵尸走得很慢，多攒一点阳光再种豌豆吧。'
            ],
            '普通': [
                '僵尸速度刚刚好，{who}想好再种哦。',
                '先种向日葵再种豌豆，规划好每一步。',
                '今天的僵尸有点精神，记得留阳光补坚果。'
            ],
            '困难': [
                '今天的僵尸有点快，{who}先多种向日葵哦。',
                '困难模式！前排坚果、后排豌豆是关键。',
                '僵尸又快又多，星芒在旁边帮你加油。'
            ]
        },
        win: [
            '{who}守得太棒了！星芒给你鼓掌。',
            '守住啦！这波僵尸一个都没进家。',
            '厉害！阳光和星星都拿到手啦。',
            '{who}的花园固若金汤，星芒看呆了。'
        ],
        fail: [
            '差一点点！下次把坚果种在僵尸来的前排试试。',
            '别急，先种两棵向日葵攒阳光，再来守一次。',
            '僵尸太快啦，试试寒冰豌豆让它慢下来。',
            '这一波没守住，樱桃炸弹留给僵尸扎堆的时候用。',
            '阳光要省着花，先把这一路种满再管别的路。'
        ]
    };

    function companionLine(kind, mods, petLevel, pick) {
        let pool;
        if (kind === 'welcome') {
            const label = (mods && mods.label) || '普通';
            pool = (COMPANION_LINES.welcome || {})[label] || COMPANION_LINES.welcome['普通'];
        } else {
            pool = COMPANION_LINES[kind] || [];
        }
        if (!pool || !pool.length) return '';
        const index = typeof pick === 'number' ? (Math.abs(Math.floor(pick)) % pool.length) : Math.floor(Math.random() * pool.length);
        const who = Number(petLevel) >= 3 ? '小园长' : '小朋友';
        return String(pool[index]).replace(/\{who\}/g, who);
    }

    // bridge 的 awards（recordPlaySession / grantProgressPoints 返回）里筛里程碑庆祝卡
    function milestoneCardsFrom(awards) {
        return (Array.isArray(awards) ? awards : []).filter(function (a) {
            return a && a.kind === 'milestone';
        }).map(function (a) {
            return { id: a.id, title: a.title || '里程碑', sun: Number(a.amount) || 0, claimed: !!a.claimed };
        });
    }

    function loadImg(key, src) {
        return new Promise(function (res) {
            const img = new Image();
            img.onload = function () { images[key] = img; res(img); };
            img.onerror = function () { res(null); };
            img.src = src;
        });
    }

    function loadAll() {
        return Promise.all(Object.keys(ASSETS).map(function (k) { return loadImg(k, ASSETS[k]); }));
    }

    function bgKeyForStage(stage) {
        return 'bg-day';
    }

    function growthState() {
        const state = bridge.readState();
        state.growth = garden.normalize(state.growth || {});
        return state;
    }

    function commitGrowth(g) {
        const state = bridge.readState();
        state.growth = g;
        bridge.writeState(state);
    }

    function refreshWallet() {
        const w = bridge.getWallet();
        const g = growthState().growth;
        els.wallet.innerHTML =
            `<span class="chip">阳光 <b>${w.sunlight}</b></span>` +
            `<span class="chip">能量 <b>${g.garden.defenseEnergy || 0}</b></span>` +
            `<span class="chip">星芒 Lv.<b>${w.petLevel}</b></span>`;
    }

    function loadProgress() {
        progress = bridge.getProgress(GAME_ID).progress;
        if (!progress.unlockedStage) progress.unlockedStage = 1;
        if (!Array.isArray(progress.clearedStages)) progress.clearedStages = [];
        if (!progress.stars) progress.stars = {};
        bridge.saveProgress(GAME_ID, progress);
    }

    function renderMap() {
        els.stageCount.textContent = String(stagesApi.count);
        els.map.innerHTML = '';
        stagesApi.list.forEach(function (stage) {
            const locked = stage.id > progress.unlockedStage;
            const cleared = progress.clearedStages.indexOf(stage.id) !== -1;
            const current = stage.id === progress.unlockedStage && !cleared;
            const stars = Math.max(0, Math.min(3, Number(progress.stars[stage.id]) || (cleared ? 1 : 0)));
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'stage-card' + (locked ? ' is-locked' : '') + (current ? ' is-current' : '') + (cleared ? ' is-cleared' : '');
            btn.disabled = locked;
            btn.setAttribute('aria-label', locked ? '第 ' + stage.id + ' 关未解锁' : '第 ' + stage.id + ' 关');
            const thumb = document.createElement('span');
            thumb.className = 'stage-thumb';
            const num = document.createElement('b');
            num.className = 'stage-num';
            num.textContent = String(stage.id);
            thumb.appendChild(num);
            if (locked) {
                const lock = document.createElement('span');
                lock.className = 'stage-lock';
                lock.setAttribute('aria-hidden', 'true');
                thumb.appendChild(lock);
            }
            btn.appendChild(thumb);
            const starRow = document.createElement('span');
            starRow.className = 'stage-stars';
            starRow.textContent = locked ? '' : ('★★★'.slice(0, stars) + '☆☆☆'.slice(stars));
            btn.appendChild(starRow);
            if (!locked) btn.addEventListener('click', function () { enterStage(stage.id); });
            els.map.appendChild(btn);
        });
        els.progressTip.textContent = progress.clearedStages.length + ' / ' + stagesApi.count;
        refreshWallet();
    }

    function showMap() {
        document.body.classList.add('is-picking');
        els.panelMap.classList.remove('is-hidden');
        els.panelPlay.classList.add('is-hidden');
        renderMap();
    }

    function showPlay() {
        document.body.classList.remove('is-picking');
        els.panelMap.classList.add('is-hidden');
        els.panelPlay.classList.remove('is-hidden');
    }

    function enterStage(id) {
        currentStage = stagesApi.get(id);
        settled = false;
        lastDefenseTick = 0;
        enterAt = performance.now();
        lastSkySunAt = 0;
        skySuns = [];
        autoWaveTried = false;
        plantedAt = 0;
        wavePauseUntil = 0;
        plantsLost = 0;
        lastPlantCount = 0;
        const state = growthState();
        let g = state.growth;
        const metaBonus = (bridge.getMetaBonuses && bridge.getMetaBonuses()) || {};
        g.garden.defenseEnergy = Math.max(Number(g.garden.defenseEnergy) || 0, currentStage.startEnergy || 2);
        g.sunlight = Math.max(0, Number(g.sunlight) || 0) + (metaBonus.gardenStartSun || 0);
        const started = garden.startDefenseGame(g, bridge.today());
        g = started.growth;
        g.garden.invader = Object.assign(g.garden.invader || {}, {
            active: false, health: 3, maxHealth: 3, wave: 0, blockedTurns: 0, slowedTurns: 0, lastEffect: ''
        });
        const unlocks = new Set(g.garden.unlockedPlantIds || ['plant-sunflower']);
        stagesApi.list.forEach(function (s) {
            if (s.id <= progress.unlockedStage) (s.unlockPlants || []).forEach(function (p) { unlocks.add(p); });
        });
        g.garden.unlockedPlantIds = Array.from(unlocks);
        g.garden.activePlantId = 'plant-sunflower';
        g.garden.defense.selectedPlantId = 'plant-sunflower';
        selectedPlantId = 'plant-sunflower';
        commitGrowth(g);

        els.stageTitle.textContent = '第 ' + currentStage.id + ' 关';
        els.stageBlurb.textContent = currentStage.blurb || '';
        els.killNeed.textContent = String(currentStage.waves || 1);
        els.killCount.textContent = '0';
        els.tip.textContent = '选种子点草坪种下。豌豆会自己发射，点掉下来的阳光。';
        hideSettle();
        speedAcc = {};
        showPlay();
        renderSeeds();
        renderHud();
        renderModBadge();
        companionSay(companionLine('welcome', USE_PLAY_MODS ? playMods : null, petLevelNow()));
        spawnWave();
    }

    function renderSeeds() {
        const g = growthState().growth;
        const unlocked = g.garden.unlockedPlantIds || [];
        const rules = garden.PLANT_RULES || {};
        const catalog = garden.PLANT_CATALOG || [];
        els.seeds.innerHTML = '';
        catalog.forEach(function (plant) {
            const ok = unlocked.indexOf(plant.id) !== -1;
            const cost = (rules[plant.id] && rules[plant.id].cost) || plant.unlockAt || 25;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'seed-card' + (selectedPlantId === plant.id ? ' is-selected' : '') + (ok ? '' : ' is-locked');
            btn.disabled = !ok;
            const img = images[plant.id];
            btn.innerHTML = (img ? `<img src="${img.src}" alt="">` : '') +
                `<span>${plant.title}</span><b>${cost}</b><small>${plant.skillTitle || ''}</small>`;
            btn.addEventListener('click', function () {
                if (!ok) return;
                const r = garden.selectPlant(g, plant.id);
                commitGrowth(r.growth);
                selectedPlantId = plant.id;
                renderSeeds();
                els.tip.textContent = `已选 ${plant.title}：点草坪种下，有僵尸时会自己发射。`;
            });
            els.seeds.appendChild(btn);
        });
    }

    function statusLabel(defense) {
        if (!defense) return '准备';
        if (defense.status === 'lost') return '失败';
        if (defense.status === 'won') return '胜利';
        if ((defense.zombies || []).length) return '战斗中';
        if (defense.wave > 0) return '清场';
        return '准备';
    }

    function renderHud() {
        const g = growthState().growth;
        const defense = g.garden.defense || {};
        els.energy.textContent = String(g.garden.defenseEnergy || 0);
        els.killCount.textContent = String(defense.wave || 0);
        if (currentStage) els.killNeed.textContent = String(currentStage.waves || 1);
        els.status.textContent = statusLabel(defense);
        refreshWallet();
    }

    // ===== S1 UI 层 =====
    function petLevelNow() {
        try {
            const w = bridge.getWallet();
            return (w && Number(w.petLevel)) || 1;
        } catch (e) {
            return 1;
        }
    }

    function renderModBadge() {
        if (!els.modBadge) return;
        const label = (USE_PLAY_MODS && playMods) ? playMods.label : '统一';
        els.modBadge.textContent = '难度 · ' + label;
        els.modBadge.title = '多认字可以解锁更强的僵尸和更多阳光';
    }

    function companionSay(line) {
        if (!els.companionSay || !line) return;
        els.companionSay.textContent = line;
        els.companionSay.classList.add('is-on');
        clearTimeout(companionSay._t);
        companionSay._t = setTimeout(function () {
            els.companionSay.classList.remove('is-on');
        }, 6000);
    }

    function showSettle(opts) {
        if (!els.settleLayer) return;
        const lines = buildSettlementLines(opts || {});
        const o = opts || {};
        els.settleTitle.textContent = o.title || '';
        els.settleGain.textContent = lines.gain || '';
        els.settleCompanion.textContent = o.companionLine || '';
        els.settleProgressLabel.textContent = lines.progressLabel;
        els.settleBarFill.style.width = lines.progressPercent + '%';
        els.settleGoal.textContent = lines.nextGoal.replace(/\{who\}/g, petLevelNow() >= 3 ? '小园长' : '小朋友');
        if (els.settleRetry) els.settleRetry.textContent = o.won ? '再玩一次' : '重开本关';
        els.settleLayer.classList.remove('is-hidden');
    }

    function hideSettle() {
        if (els.settleLayer) els.settleLayer.classList.add('is-hidden');
    }

    function queueCelebrations(awards) {
        const cards = milestoneCardsFrom(awards);
        if (!cards.length) return;
        celebrateQueue = celebrateQueue.concat(cards);
        showNextCelebration();
    }

    function showNextCelebration() {
        if (!els.celebrateLayer) return;
        if (!celebrateQueue.length) {
            els.celebrateLayer.classList.add('is-hidden');
            return;
        }
        const card = celebrateQueue[0];
        els.celebrateTitle.textContent = card.title;
        els.celebrateSub.textContent = card.claimed ? ('奖励阳光 +' + card.sun + ' · 星芒为你欢呼！') : '今日阳光已达上限，成就已点亮！';
        els.celebrateLayer.classList.remove('is-hidden');
    }

    function boardMetrics() {
        const lanes = 5;
        const columns = 6;
        // 对齐 lawn-day.png 拉到 1080x540 后的草地：天空约上 37%，左右是房子和石路
        const left = Math.round(VIEW_W * 0.125);
        const top = Math.round(VIEW_H * 0.375);
        const right = Math.round(VIEW_W * 0.855);
        const bottom = VIEW_H - 6;
        const width = right - left;
        const height = bottom - top;
        const laneH = height / lanes;
        const plantH = Math.round(laneH * 1.62);
        const plantW = Math.round(plantH * 0.9);
        const zombieH = Math.round(laneH * 2.72);
        const zombieW = Math.round(zombieH * 0.88);
        return {
            lanes: lanes,
            columns: columns,
            left: left,
            top: top,
            width: width,
            height: height,
            laneH: laneH,
            plantW: plantW,
            plantH: plantH,
            zombieW: zombieW,
            zombieH: zombieH,
            cell: Math.floor(width / columns)
        };
    }

    function lawnFromEvent(event) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        const m = boardMetrics();
        if (x < m.left || x > m.left + m.width || y < m.top || y > m.top + m.height) return null;
        const nx = (x - m.left) / m.width;
        const ny = (y - m.top) / m.height;
        const lane = Math.min(m.lanes - 1, Math.max(0, Math.floor(ny * m.lanes)));
        const column = Math.max(0, Math.min(m.columns - 1, Math.round(nx * (m.columns - 1))));
        return { x: nx, y: ny, lane: lane, column: column, px: x, py: y };
    }

    function clampBoxToLawn(box, m) {
        const w = Math.min(box.w, m.width);
        const x = Math.max(m.left, Math.min(m.left + m.width - w, box.x));
        return { x: x, y: box.y, w: w, h: box.h };
    }

    function plantScreenBox(plant, m, bob) {
        const nx = Number.isFinite(Number(plant.x)) ? Number(plant.x) : ((Number(plant.column) + 0.5) / m.columns);
        const half = m.plantW / 2;
        const cx = m.left + nx * m.width;
        const groundY = m.top + (Number(plant.lane) + 1) * m.laneH + (bob || 0);
        return clampBoxToLawn({ x: cx - half, y: groundY - m.plantH, w: m.plantW, h: m.plantH }, m);
    }

    function entityBox(lane, nx, m, bob, scale) {
        const w = m.plantW * (scale || 1);
        const h = m.plantH * (scale || 1);
        const cx = m.left + nx * m.width;
        const groundY = m.top + (Number(lane) + 1) * m.laneH + (bob || 0);
        return clampBoxToLawn({ x: cx - w / 2, y: groundY - h, w: w, h: h }, m);
    }

    function zombieScreenBox(zombie, defense, m, frac, bob) {
        const col = zombieDisplayColumn(defense, zombie, frac);
        const nx = (col + 0.5) / m.columns;
        const groundY = m.top + (Number(zombie.lane) + 1) * m.laneH + (bob || 0);
        const cx = m.left + nx * m.width;
        return clampBoxToLawn({
            x: cx - m.zombieW / 2,
            y: groundY - m.zombieH,
            w: m.zombieW,
            h: m.zombieH
        }, m);
    }

    function tickFrac(ts) {
        if (!lastDefenseTick) return 0;
        return Math.max(0, Math.min(1, ((ts || 0) - lastDefenseTick) / TICK_MS));
    }

    function zombieIsBlocked(defense, zombie) {
        return (defense.plants || []).some(function (plant) {
            return plant.health > 0 && plant.lane === zombie.lane && plant.column === zombie.column - 1;
        });
    }

    function lurchAmount(frac) {
        const window = WALK_LURCH;
        if (frac <= 0) return 0;
        if (frac >= window) return 1;
        const t = frac / window;
        return t * t * (3 - 2 * t);
    }

    function idHash(id) {
        let hash = 0;
        String(id || '').split('').forEach(function (ch) {
            hash = (hash * 31 + ch.charCodeAt(0)) | 0;
        });
        return Math.abs(hash % 1000) / 1000;
    }

    function zombieDisplayColumn(defense, zombie, frac) {
        const rules = (garden.ZOMBIE_RULES || {})[zombie.kind] || { moveEvery: 18 };
        const every = Math.max(1, Number(rules.moveEvery) || 10);
        if (zombie.slowTicks > 0 || zombieIsBlocked(defense, zombie)) return Number(zombie.column);
        const clock = Number(zombie.moveClock) || 0;
        return Number(zombie.column) - Math.min(1, (clock + lurchAmount(frac)) / every);
    }

    function spawnSkySun(m) {
        skySuns.push({
            x: m.left + 80 + Math.random() * Math.max(40, m.width - 160),
            y: 18,
            r: 28,
            vy: 1.15 + Math.random() * 0.55,
            amount: 25,
            born: performance.now()
        });
    }

    function collectSun(sun) {
        if (!sun || !sun.amount) return;
        const g = growthState().growth;
        g.sunlight = Math.max(0, Number(g.sunlight) || 0) + sun.amount;
        commitGrowth(g);
        skySuns = skySuns.filter(function (item) { return item !== sun; });
        toast('阳光 +' + sun.amount);
        renderHud();
    }

    function sunAtEvent(event) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        for (let i = skySuns.length - 1; i >= 0; i -= 1) {
            const sun = skySuns[i];
            const dx = x - sun.x;
            const dy = y - sun.y;
            if (dx * dx + dy * dy <= (sun.r + 10) * (sun.r + 10)) return sun;
        }
        return null;
    }

    function updateSuns(ts, m) {
        if (settled || els.panelPlay.classList.contains('is-hidden')) return;
        if (!lastSkySunAt) lastSkySunAt = ts;
        if (ts - lastSkySunAt > 7000) {
            lastSkySunAt = ts;
            spawnSkySun(m);
        }
        const floorY = m.top + m.height * 0.78;
        skySuns = skySuns.filter(function (sun) {
            if (sun.y < floorY) sun.y += sun.vy;
            return ts - sun.born < 8000;
        });
    }

    function drawSunToken(sun) {
        const img = images.sun;
        const size = sun.r * 2;
        if (img) ctx.drawImage(img, sun.x - sun.r, sun.y - sun.r, size, size);
        else {
            ctx.beginPath();
            ctx.fillStyle = '#f4c430';
            ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSprite(key, boxX, boxY, boxW, boxH) {
        const img = images[key];
        if (!img) {
            ctx.fillStyle = 'rgba(255,247,200,.85)';
            ctx.fillRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);
            return;
        }
        const ratio = img.naturalWidth / img.naturalHeight;
        let dw = boxW * 0.98;
        let dh = dw / ratio;
        if (dh > boxH * 0.98) {
            dh = boxH * 0.98;
            dw = dh * ratio;
        }
        ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh), dw, dh);
    }

    function drawZombieActor(zombie, box, ts, frac, moving, eating, icy) {
        const seed = idHash(zombie.id);
        const speed = icy ? 0.55 : (eating ? 4.2 : (moving ? 1.05 : 0.4));
        const phase = ((ts || 0) / 1000) * speed + seed * 6.28;
        const lurch = moving ? lurchAmount(frac) : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.beginPath();
        ctx.ellipse(box.x + box.w * 0.5, box.y + box.h - 2, box.w * 0.22, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(box.x + box.w * 0.5, box.y + box.h);
        if (icy) ctx.filter = 'hue-rotate(155deg) saturate(0.75)';
        if (eating) ctx.translate(Math.sin(phase) * -2.4, 0);
        else if (moving) ctx.translate(0, Math.sin(lurch * Math.PI) * -3);
        const key = images[zombie.kind] ? zombie.kind : 'zombie-basic';
        drawSprite(key, -box.w / 2, -box.h, box.w, box.h);
        ctx.restore();
    }

    function drawHealthBar(box, health, maxHealth) {
        const barW = box.w * 0.7;
        const x = box.x + box.w * 0.15;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fillRect(x, box.y + 8, barW, 7);
        ctx.fillStyle = '#e35a3a';
        ctx.fillRect(x, box.y + 8, barW * (health / Math.max(1, maxHealth)), 7);
    }

    function draw(ts) {
        if (els.panelPlay.classList.contains('is-hidden')) return;
        const g = growthState().growth;
        const defense = g.garden.defense || { plants: [], zombies: [], projectiles: [] };
        const m = boardMetrics();
        const frac = tickFrac(ts);
        updateSuns(ts, m);
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);

        const bg = images[bgKeyForStage(currentStage)] || images['bg-day'] || images.bg;
        if (bg) ctx.drawImage(bg, 0, 0, VIEW_W, VIEW_H);
        else {
            ctx.fillStyle = '#7ec8f0';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H * 0.3);
            ctx.fillStyle = '#6fbf4b';
            ctx.fillRect(0, VIEW_H * 0.3, VIEW_W, VIEW_H);
        }
        const stageId = Number(currentStage && currentStage.id) || 1;
        if (stageId % 2 === 1) {
            ctx.fillStyle = 'rgba(255,132,48,0.12)';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }

        // PvZ 式明暗棋盘格草坪:5 行 × 6 列按 (行+列) 交替,格子可读才好放植物
        const cellW = m.width / m.columns;
        for (let lane = 0; lane < m.lanes; lane += 1) {
            for (let col = 0; col < m.columns; col += 1) {
                ctx.fillStyle = (lane + col) % 2 === 0
                    ? 'rgba(255, 252, 214, .16)'
                    : 'rgba(24, 66, 14, .13)';
                ctx.fillRect(m.left + col * cellW, m.top + lane * m.laneH, cellW + 0.5, m.laneH);
            }
        }
        ctx.strokeStyle = 'rgba(46, 84, 28, .28)';
        ctx.lineWidth = 2;
        ctx.strokeRect(m.left - 1, m.top - 1, m.width + 2, m.height + 2);
        if (hoverPoint && !settled) {
            ctx.globalAlpha = 0.45;
            const ghost = plantScreenBox({ lane: hoverPoint.lane, x: hoverPoint.x, column: hoverPoint.column }, m, 0);
            drawSprite(selectedPlantId, ghost.x, ghost.y, ghost.w, ghost.h);
            ctx.globalAlpha = 1;
        }

        (defense.plants || []).forEach(function (plant, i) {
            const bob = Math.sin(animPhase * 2 + i) * 3;
            const box = plantScreenBox(plant, m, bob);
            drawSprite(plant.plantId, box.x, box.y, box.w, box.h);
        });

        (defense.zombies || []).forEach(function (zombie) {
            const eating = zombieIsBlocked(defense, zombie);
            const icy = zombie.slowTicks > 0;
            const moving = !eating && !icy;
            const box = zombieScreenBox(zombie, defense, m, frac, 0);
            drawZombieActor(zombie, box, ts, frac, moving, eating, icy);
            drawHealthBar(box, zombie.health, zombie.maxHealth);
            if (icy) {
                ctx.fillStyle = '#7ad7ff';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText('慢!', box.x + 8, box.y + 22);
            }
        });

        (defense.projectiles || []).forEach(function (pea) {
            const col = Number(pea.column) + frac;
            const box = entityBox(pea.lane, (col + 0.5) / m.columns, m, 0, 0.45);
            const px = box.x + box.w * 0.72;
            const py = box.y + box.h * 0.42;
            ctx.beginPath();
            ctx.fillStyle = pea.slowTicks ? '#7ad7ff' : '#9ae24f';
            ctx.arc(px, py, 11, 0, Math.PI * 2);
            ctx.fill();
        });

        skySuns.forEach(drawSunToken);

        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(12, 12, 130, 30);
        ctx.fillStyle = '#fff8c8';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('阳光 ' + (g.sunlight || 0), 20, 32);
    }

    function onPointerDown(event) {
        const sun = sunAtEvent(event);
        if (sun) {
            collectSun(sun);
            return;
        }
        placeAt(event);
    }

    function placeAt(event) {
        if (settled) return;
        const point = lawnFromEvent(event);
        if (!point) return;
        const g = growthState().growth;
        const status = (g.garden.defense || {}).status;
        if (status === 'lost' || status === 'won') return;
        const r = garden.placeDefensePlant(g, point.lane, point.column, { x: point.x });
        commitGrowth(r.growth);
        els.tip.textContent = r.ok ? '种好了！再种几棵，僵尸马上自己来。' : (r.reason || '不能种');
        if (r.ok && !plantedAt) plantedAt = performance.now();
        if (!r.ok) toast(r.reason || '不能种');
        renderSeeds();
        renderHud();
    }

    function spawnWave() {
        if (settled || !currentStage) return;
        const g = growthState().growth;
        const status = (g.garden.defense || {}).status;
        if (status === 'lost') return;
        const r = garden.spawnDefenseWave(g, bridge.today(), { stageId: currentStage && currentStage.id });
        if (r.ok && USE_PLAY_MODS && applyPlayMods({ rewardSun: 0, zombies: [] }, playMods).extraMob) {
            // 困难档：每波额外 +1 普通僵尸（应用层直接补位，不动规则层）
            const defense = r.growth.garden.defense;
            const taken = (defense.zombies || []).map(function (z) { return z.lane; });
            const lane = [0, 1, 2, 3, 4].filter(function (l) { return taken.indexOf(l) === -1; })[0];
            extraSeq += 1;
            (defense.zombies || (defense.zombies = [])).push({
                id: 'zombie-extra-' + extraSeq + '-' + bridge.today(),
                kind: 'zombie-basic',
                lane: lane === undefined ? 2 : lane,
                column: 5,
                health: 3,
                maxHealth: 3,
                slowTicks: 0,
                moveClock: 0
            });
        }
        commitGrowth(r.growth);
        if (r.ok) {
            els.tip.textContent = '僵尸来了！同路的豌豆会自己发射。';
            toast('僵尸出现！');
        } else {
            els.tip.textContent = r.reason || '暂时不能来一波';
            toast(r.reason || '暂时不能来一波');
        }
        renderHud();
    }

    function afterTick(g) {
        const defense = g.garden.defense || {};
        renderHud();
        const alive = (defense.plants || []).length;
        if (lastPlantCount && alive < lastPlantCount) plantsLost += lastPlantCount - alive;
        lastPlantCount = alive;
        if (defense.status === 'lost') {
            settled = true;
            toast('僵尸进家了');
            els.tip.textContent = '僵尸进家了。可以重开本关，阳光还在。';
            els.status.textContent = '失败';
            const failLine = companionLine('fail', USE_PLAY_MODS ? playMods : null, petLevelNow());
            companionSay(failLine);
            showSettle({
                won: false,
                stars: 0,
                sunAwarded: 0,
                title: '差一点点！',
                companionLine: '星芒：' + failLine,
                meta: (bridge.getMetaSummary && bridge.getMetaSummary()) || {}
            });
            return;
        }
        if (defense.status !== 'won') return;
        skySuns = [];
        if (defense.wave >= (currentStage.waves || 1)) {
            onStageClear();
            return;
        }
        wavePauseUntil = performance.now() + NEXT_WAVE_MS;
        toast('清掉了！下一波马上到，抓紧补种。');
        els.tip.textContent = '下一波马上到，抓紧补种。';
        renderHud();
    }

    function onStageClear() {
        if (settled || !currentStage) return;
        settled = true;
        let star = 1;
        if (plantsLost === 0) star += 1;
        const elapsed = (performance.now() - enterAt) / 1000;
        if (elapsed <= (currentStage.parSec || 90)) star += 1;
        star = Math.min(3, star);
        progress.stars[currentStage.id] = Math.max(Number(progress.stars[currentStage.id] || 0), star);
        if (progress.clearedStages.indexOf(currentStage.id) === -1) progress.clearedStages.push(currentStage.id);
        progress.totalWins = (progress.totalWins || 0) + 1;
        if (progress.unlockedStage < currentStage.id + 1 && currentStage.id < stagesApi.count) {
            progress.unlockedStage = currentStage.id + 1;
        }
        const state = growthState();
        (currentStage.unlockPlants || []).forEach(function (p) {
            if (state.growth.garden.unlockedPlantIds.indexOf(p) === -1) {
                state.growth.garden.unlockedPlantIds.push(p);
            }
        });
        bridge.writeState(state);
        bridge.saveProgress(GAME_ID, progress);
        const shaped = applyPlayMods({ rewardSun: currentStage.rewardSun, zombies: [] }, USE_PLAY_MODS ? playMods : null);
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: 'stage-' + currentStage.id + '-clear',
            amount: shaped.rewardSun,
            energy: 1,
            reason: '通关第' + currentStage.id + '关'
        });
        const awards = [];
        if (bridge.grantProgressPoints) {
            const pr = bridge.grantProgressPoints(GAME_ID, 3 + star, 'clear-' + currentStage.id);
            if (pr && Array.isArray(pr.awards)) awards.push.apply(awards, pr.awards);
        }
        if (bridge.recordPlaySession) {
            const play = bridge.recordPlaySession(GAME_ID);
            if (play && Array.isArray(play.awards)) awards.push.apply(awards, play.awards);
        }
        toast(award.awarded ? `通关！★×${star} · +${award.amount} 阳光` : `通关！★×${star} · ${award.reason}`);
        els.status.textContent = '胜利';
        const winLine = companionLine('win', USE_PLAY_MODS ? playMods : null, petLevelNow());
        companionSay(winLine);
        showSettle({
            won: true,
            stars: star,
            sunAwarded: award.awarded ? award.amount : shaped.rewardSun,
            sunMult: shaped.rewardSun === Number(currentStage.rewardSun) ? 1 : (playMods ? playMods.sunMult : 1),
            sunCapped: !award.awarded,
            title: '通关！第 ' + currentStage.id + ' 关',
            companionLine: '星芒：' + winLine,
            meta: (bridge.getMetaSummary && bridge.getMetaSummary()) || {}
        });
        queueCelebrations(awards);
    }

    function maybeAutoWave(ts) {
        if (settled || !currentStage || !enterAt) return;
        if (els.panelPlay.classList.contains('is-hidden')) return;
        const g = growthState().growth;
        const defense = g.garden.defense || {};
        if (defense.wave > 0) return;
        if (!(defense.plants || []).length || !plantedAt) return;
        if (ts - plantedAt < FIRST_WAVE_MS) return;
        autoWaveTried = true;
        spawnWave();
    }

    function maybeResumeWave(ts) {
        if (settled || !wavePauseUntil || ts < wavePauseUntil) return;
        wavePauseUntil = 0;
        spawnWave();
    }

    function maybeTickDefense(ts) {
        if (settled || !currentStage) return;
        if (els.panelPlay.classList.contains('is-hidden')) return;
        if (wavePauseUntil) return;
        const g = growthState().growth;
        const status = (g.garden.defense || {}).status;
        if (status !== 'playing') return;
        if (ts - lastDefenseTick < TICK_MS) return;
        lastDefenseTick = ts;
        if (USE_PLAY_MODS) advanceMoveClocks(g.garden.defense, speedAcc, playMods);
        const r = garden.tickDefense(g, 1);
        commitGrowth(r.growth);
        afterTick(r.growth);
    }

    function bind() {
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', function (e) { hoverPoint = lawnFromEvent(e); });
        canvas.addEventListener('pointerleave', function () { hoverPoint = null; });
        document.getElementById('spawn-btn').addEventListener('click', spawnWave);
        document.getElementById('restart-btn').addEventListener('click', function () {
            if (currentStage) enterStage(currentStage.id);
        });
        document.getElementById('back-map-btn').addEventListener('click', showMap);
        document.getElementById('map-btn').addEventListener('click', showMap);
        document.getElementById('fullscreen-btn').addEventListener('click', function () {
            const root = document.documentElement;
            if (!document.fullscreenElement) (root.requestFullscreen || function () {}).call(root);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        els.back.href = bridge.backHref('garden-defense');
        if (els.modBadge) {
            els.modBadge.addEventListener('click', function () {
                const msg = '多认字可以解锁更强的僵尸和更多阳光！';
                toast(msg);
                els.tip.textContent = msg + '（当前：' + ((USE_PLAY_MODS && playMods) ? playMods.label : '统一') + '）';
            });
        }
        if (els.settleRetry) {
            els.settleRetry.addEventListener('click', function () {
                hideSettle();
                if (currentStage) enterStage(currentStage.id);
            });
        }
        if (els.settleMap) {
            els.settleMap.addEventListener('click', function () {
                hideSettle();
                showMap();
            });
        }
        if (els.celebrateClose) {
            els.celebrateClose.addEventListener('click', function () {
                celebrateQueue.shift();
                showNextCelebration();
            });
        }
        function loop(ts) {
            animPhase = (ts || 0) / 1000;
            maybeResumeWave(ts || 0);
            maybeTickDefense(ts || 0);
            maybeAutoWave(ts || 0);
            draw(ts || 0);
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    function boot() {
        if (!bridge || !garden || !stagesApi) {
            els.progressTip.textContent = '模块加载失败';
            return;
        }
        loadProgress();
        if (USE_PLAY_MODS && bridge.getPlayMods) playMods = bridge.getPlayMods();
        renderModBadge();
        if (bridge.recordPlaySession) {
            const play = bridge.recordPlaySession(GAME_ID);
            if (play && play.awards && play.awards.length) {
                toast(play.awards.map(function (a) { return a.title; }).join(' · '));
                queueCelebrations(play.awards);
            }
        }
        loadAll().then(function () {
            renderMap();
            bind();
            showMap();
        });
    }

    boot();
})();
