(function () {
    'use strict';

    /**
     * 花园保卫 · 种植物后豌豆自己发射（接近原版循环）
     * 规则：selectPlant / placeDefensePlant / spawnDefenseWave / tickDefense
     * 循环参考 G:/StudyCode/pvz-refs/PlantsVsZombiesJS（MIT）：同路才打、子弹平移、点阳光。
     * 画面只用本仓 preschool-pvz-2d，不拷参考仓贴图。
     */
    const bridge = window.WorkbenchGameBridge;
    const garden = window.PersonalWorkbenchPreschoolGarden;
    const stagesApi = window.GardenDefenseStages;
    const GAME_ID = 'garden-defense';
    const TICK_MS = 720;
    const WALK_LURCH = 0.28;
    const FIRST_WAVE_MS = 2800;
    const NEXT_WAVE_MS = 1800;
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
    const BG0 = '../../assets/generated/preschool-pvz-2d/background/published/pvz-garden-lawn-bg.png';
    const LOCAL = './assets/';
    const ASSETS = {
        bg: BG0,
        'bg-day': LOCAL + 'bg/lawn-day.png',
        'bg-sunset': LOCAL + 'bg/lawn-sunset.png',
        'bg-night': LOCAL + 'bg/lawn-night.png',
        'zombie-walk-01': PVZ + 'pvz-zombie-walk-01.png',
        'zombie-walk-02': PVZ + 'pvz-zombie-walk-02.png',
        'zombie-walk-03': PVZ + 'pvz-zombie-walk-03.png',
        'zombie-walk-04': PVZ + 'pvz-zombie-walk-04.png',
        sun: PVZ + 'pvz-sun-token.png',
        'plant-sunflower': PVZ + 'pvz-sunflower.png',
        'plant-peashooter': PVZ + 'pvz-peashooter.png?v=20260814-pea-v2',
        'plant-wallnut': PVZ + 'pvz-wallnut.png',
        'plant-snowpea': PVZ + 'pvz-iceflower.png',
        'plant-cherrybomb': PVZ + 'pvz-cherrybomb.png',
        'zombie-basic': PVZ + 'pvz-zombie-basic.png',
        'zombie-conehead': PVZ + 'pvz-zombie-conehead.png',
        'zombie-buckethead': PVZ + 'pvz-zombie-buckethead.png'
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
        back: document.getElementById('back-link')
    };

    function toast(msg) {
        els.toast.textContent = msg;
        els.toast.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { els.toast.classList.remove('is-on'); }, 2400);
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
        // lawn-night.png 是俯视花园+垫子，不能当战场；偶数关白天，奇数关黄昏。
        const id = Number(stage && stage.id) || 1;
        return id % 2 === 0 ? 'bg-day' : 'bg-sunset';
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
        showPlay();
        renderSeeds();
        renderHud();
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
        const plantH = Math.min(laneH * 1.12, 92);
        const plantW = plantH * 0.72;
        const zombieH = Math.min(laneH * 0.94, 72);
        const zombieW = zombieH * 0.7;
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
        const h = Math.min(box.h, m.laneH);
        const x = Math.max(m.left, Math.min(m.left + m.width - w, box.x));
        const y = Math.max(m.top, Math.min(m.top + m.height - h, box.y));
        return { x: x, y: y, w: w, h: h };
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
        const rules = (garden.ZOMBIE_RULES || {})[zombie.kind] || { moveEvery: 10 };
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
        let dw = boxW * 0.86;
        let dh = dw / ratio;
        if (dh > boxH * 0.86) {
            dh = boxH * 0.86;
            dw = dh * ratio;
        }
        ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2 + 4, dw, dh);
    }

    function drawZombieActor(zombie, box, ts, frac, moving, eating, icy) {
        const seed = idHash(zombie.id);
        const speed = icy ? 0.8 : (eating ? 7 : (moving ? 2.1 : 0.55));
        const phase = ((ts || 0) / 1000) * speed + seed * 6.28;
        const lurch = moving ? lurchAmount(frac) : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.beginPath();
        ctx.ellipse(box.x + box.w * 0.5, box.y + box.h - 3, box.w * 0.28, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(box.x + box.w * 0.5, box.y + box.h);
        if (icy) ctx.filter = 'hue-rotate(155deg) saturate(0.75)';
        if (eating) {
            ctx.rotate(Math.sin(phase) * 0.08);
            ctx.translate(Math.sin(phase) * -1.6, 0);
        } else if (moving) {
            const bounce = Math.sin(lurch * Math.PI) * 4;
            const lean = 0.04 + lurch * 0.08 + Math.sin(phase) * 0.02;
            const squash = 1 + Math.sin(lurch * Math.PI) * 0.05;
            ctx.rotate(lean);
            ctx.scale(1.03 / squash, squash);
            ctx.translate(0, -bounce);
        } else {
            ctx.rotate(Math.sin(phase) * 0.03);
            ctx.translate(0, Math.sin(phase) * 1.2);
        }
        const walkFrame = moving ? ('zombie-walk-0' + (Math.floor(((ts || 0) / 180) % 4) + 1)) : '';
        const spriteKey = (zombie.kind === 'zombie-basic' && images[walkFrame]) ? walkFrame : zombie.kind;
        drawSprite(spriteKey, -box.w / 2, -box.h, box.w, box.h);
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

        for (let lane = 0; lane < m.lanes; lane += 1) {
            const y = m.top + lane * m.laneH;
            ctx.fillStyle = lane % 2 === 0 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
            ctx.fillRect(m.left, y, m.width, m.laneH);
        }
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
        const r = garden.spawnDefenseWave(g, bridge.today());
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
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: 'stage-' + currentStage.id + '-clear',
            amount: currentStage.rewardSun,
            energy: 1,
            reason: '通关第' + currentStage.id + '关'
        });
        if (bridge.grantProgressPoints) bridge.grantProgressPoints(GAME_ID, 3 + star, 'clear-' + currentStage.id);
        if (bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
        toast(award.awarded ? `通关！★×${star} · +${award.amount} 阳光` : `通关！★×${star} · ${award.reason}`);
        els.status.textContent = '胜利';
        setTimeout(function () {
            showMap();
        }, 1500);
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
        if (bridge.recordPlaySession) {
            const play = bridge.recordPlaySession(GAME_ID);
            if (play && play.awards && play.awards.length) {
                toast(play.awards.map(function (a) { return a.title; }).join(' · '));
            }
        }
        loadAll().then(function () {
            function setHow(id, key) {
                const el = document.getElementById(id);
                if (el && images[key]) el.src = images[key].src;
            }
            setHow('how-sun', 'plant-sunflower');
            setHow('how-pea', 'plant-peashooter');
            setHow('how-nut', 'plant-wallnut');
            setHow('how-zombie', 'zombie-basic');
            renderMap();
            bind();
            showMap();
        });
    }

    boot();
})();
