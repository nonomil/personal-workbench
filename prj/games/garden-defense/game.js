(function () {
    'use strict';

    /**
     * 花园保卫 · 种植 + 技能发射（非自动多僵尸塔防）
     * 规则：selectPlant / placeDefensePlant / spawnInvader / usePlantSkill
     */
    const bridge = window.WorkbenchGameBridge;
    const garden = window.PersonalWorkbenchPreschoolGarden;
    const stagesApi = window.GardenDefenseStages;
    const GAME_ID = 'garden-defense';

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
        sun: PVZ + 'pvz-sun-token.png',
        'plant-sunflower': PVZ + 'pvz-sunflower.png',
        'plant-peashooter': PVZ + 'pvz-peashooter.png',
        'plant-wallnut': PVZ + 'pvz-wallnut.png',
        'plant-snowpea': PVZ + 'pvz-iceflower.png',
        'plant-cherrybomb': PVZ + 'pvz-triple-peashooter.png',
        'zombie-basic': PVZ + 'pvz-zombie-basic.png',
        'zombie-conehead': PVZ + 'pvz-zombie-conehead.png',
        'zombie-buckethead': PVZ + 'pvz-zombie-buckethead.png'
    };

    const images = {};
    let progress = null;
    let currentStage = null;
    let stageKills = 0;
    let selectedPlantId = 'plant-sunflower';
    let hoverCell = null;
    let animPhase = 0;
    let peaAnim = null; // {x0,y0,x1,y1,t}

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
        skillBtn: document.getElementById('skill-btn')
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
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'stage-card' + (locked ? ' is-locked' : '');
            btn.disabled = locked;
            btn.innerHTML = `<div>第 ${stage.id} 关 · ${stage.title}</div>` +
                `<small>${stage.blurb}</small>` +
                `<small>${cleared ? '已通关' : locked ? '未解锁' : '可挑战'} · 击退 ${stage.needKills} 只 · 奖 ${stage.rewardSun} 阳光</small>`;
            if (!locked) btn.addEventListener('click', function () { enterStage(stage.id); });
            els.map.appendChild(btn);
        });
        els.progressTip.textContent = `解锁第 ${progress.unlockedStage} 关 · 通关 ${progress.clearedStages.length} 关`;
        refreshWallet();
    }

    function showMap() {
        els.panelMap.classList.remove('is-hidden');
        els.panelPlay.classList.add('is-hidden');
        renderMap();
    }

    function showPlay() {
        els.panelMap.classList.add('is-hidden');
        els.panelPlay.classList.remove('is-hidden');
    }

    function enterStage(id) {
        currentStage = stagesApi.get(id);
        stageKills = 0;
        const state = growthState();
        let g = state.growth;
        // 给本关能量与开局阳光
        const metaBonus = (bridge.getMetaBonuses && bridge.getMetaBonuses()) || {};
        g.garden.defenseEnergy = Math.max(Number(g.garden.defenseEnergy) || 0, currentStage.startEnergy || 2);
        g.sunlight = Math.max(0, Number(g.sunlight) || 0) + (metaBonus.gardenStartSun || 0);
        // 清空本关种植盘，方便重玩
        g.garden.defense = garden.createDefaultDefense
            ? garden.createDefaultDefense()
            : { version: 1, board: { lanes: 5, columns: 6 }, plants: [], zombies: [], projectiles: [], selectedPlantId: 'plant-sunflower', wave: 0, nextEntityId: 1, tick: 0, defeated: 0, status: 'ready', startedAt: '' };
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

        els.stageTitle.textContent = `第 ${currentStage.id} 关 · ${currentStage.title}`;
        els.stageBlurb.textContent = currentStage.blurb;
        els.killNeed.textContent = String(currentStage.needKills);
        els.killCount.textContent = '0';
        els.tip.textContent = '选植物种在草坪上，再「来一波僵尸」，然后「使用技能」。';
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
                updateSkillButton();
                els.tip.textContent = `已选 ${plant.title}：${plant.skillDescription || plant.description}`;
            });
            els.seeds.appendChild(btn);
        });
        updateSkillButton();
    }

    function updateSkillButton() {
        const g = growthState().growth;
        const plant = (garden.PLANT_CATALOG || []).find(function (p) { return p.id === g.garden.activePlantId; }) || {};
        const inv = g.garden.invader || {};
        let label = plant.skillTitle || '使用技能';
        if (plant.skill === 'sunlight') label = '收集阳光';
        else if (plant.skill === 'block') label = '坚果挡住';
        else if (inv.active) label = (plant.skillTitle || '发射') + (plant.energyCost ? ` (${plant.energyCost}能量)` : '');
        else label = '先召唤僵尸';
        els.skillBtn.textContent = label;
    }

    function renderHud() {
        const g = growthState().growth;
        const inv = g.garden.invader || {};
        els.energy.textContent = String(g.garden.defenseEnergy || 0);
        els.killCount.textContent = String(stageKills);
        if (currentStage) els.killNeed.textContent = String(currentStage.needKills);
        els.status.textContent = inv.active ? `战斗中 HP ${inv.health}/${inv.maxHealth}` : '准备';
        updateSkillButton();
        refreshWallet();
    }

    function boardMetrics() {
        const lanes = 5, columns = 6;
        const marginX = 56, marginTop = 40, marginBottom = 30;
        const usableW = VIEW_W - marginX * 2;
        const usableH = VIEW_H - marginTop - marginBottom;
        let cell = Math.floor(Math.min(usableW / columns, usableH / lanes));
        cell = Math.max(52, Math.min(cell, 88));
        const boardW = cell * columns;
        const boardH = cell * lanes;
        return {
            lanes: lanes, columns: columns, cell: cell,
            left: Math.floor((VIEW_W - boardW) / 2),
            top: marginTop + Math.floor((usableH - boardH) / 2)
        };
    }

    function cellFromEvent(event) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        const m = boardMetrics();
        const column = Math.floor((x - m.left) / m.cell);
        const lane = Math.floor((y - m.top) / m.cell);
        if (lane < 0 || lane >= m.lanes || column < 0 || column >= m.columns) return null;
        return { lane: lane, column: column };
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

    function draw() {
        if (els.panelPlay.classList.contains('is-hidden')) return;
        const g = growthState().growth;
        const defense = g.garden.defense || { plants: [] };
        const inv = g.garden.invader || {};
        const m = boardMetrics();
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);

        const bg = images['bg-day'] || images.bg;
        if (bg) ctx.drawImage(bg, 0, 0, VIEW_W, VIEW_H);
        else {
            ctx.fillStyle = '#7ec8f0';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H * 0.3);
            ctx.fillStyle = '#6fbf4b';
            ctx.fillRect(0, VIEW_H * 0.3, VIEW_W, VIEW_H);
        }

        for (let lane = 0; lane < m.lanes; lane += 1) {
            for (let col = 0; col < m.columns; col += 1) {
                const x = m.left + col * m.cell;
                const y = m.top + lane * m.cell;
                ctx.fillStyle = (lane + col) % 2 === 0 ? 'rgba(98,168,62,.7)' : 'rgba(82,148,52,.65)';
                ctx.fillRect(x + 1, y + 1, m.cell - 2, m.cell - 2);
            }
        }
        if (hoverCell) {
            ctx.fillStyle = 'rgba(255,245,140,.4)';
            ctx.fillRect(m.left + hoverCell.column * m.cell + 1, m.top + hoverCell.lane * m.cell + 1, m.cell - 2, m.cell - 2);
        }

        (defense.plants || []).forEach(function (plant, i) {
            const bob = Math.sin(animPhase * 2 + i) * 2;
            drawSprite(plant.plantId, m.left + plant.column * m.cell, m.top + plant.lane * m.cell + bob, m.cell, m.cell);
        });

        // 入侵者固定出现在中间行最右侧
        if (inv.active || (inv.wave && inv.health === 0 && inv.lastEffect === 'defeated')) {
            const lane = 2;
            const col = 5;
            const wobble = inv.active ? Math.sin(animPhase * 3) * 2 : 0;
            const kind = inv.kind || 'zombie-basic';
            drawSprite(kind, m.left + col * m.cell + wobble, m.top + lane * m.cell, m.cell, m.cell);
            if (inv.active) {
                const barW = m.cell * 0.7;
                const x = m.left + col * m.cell + m.cell * 0.15;
                ctx.fillStyle = 'rgba(0,0,0,.25)';
                ctx.fillRect(x, m.top + lane * m.cell + 6, barW, 6);
                ctx.fillStyle = '#e35a3a';
                ctx.fillRect(x, m.top + lane * m.cell + 6, barW * (inv.health / Math.max(1, inv.maxHealth)), 6);
                if (inv.blockedTurns > 0) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillText('挡住!', x, m.top + lane * m.cell + 22);
                }
            }
        }

        // 豌豆飞行动画
        if (peaAnim) {
            peaAnim.t += 0.08;
            if (peaAnim.t >= 1) peaAnim = null;
            else {
                const t = peaAnim.t;
                const px = peaAnim.x0 + (peaAnim.x1 - peaAnim.x0) * t;
                const py = peaAnim.y0 + (peaAnim.y1 - peaAnim.y0) * t;
                ctx.beginPath();
                ctx.fillStyle = peaAnim.ice ? '#7ad7ff' : '#9ae24f';
                ctx.arc(px, py, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // HUD 阳光
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(12, 12, 130, 30);
        ctx.fillStyle = '#fff8c8';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('阳光 ' + (g.sunlight || 0), 20, 32);
    }

    function placeAt(event) {
        const cell = cellFromEvent(event);
        if (!cell) return;
        const g = growthState().growth;
        const r = garden.placeDefensePlant(g, cell.lane, cell.column);
        commitGrowth(r.growth);
        els.tip.textContent = r.ok ? '种好了！可以召唤僵尸。' : (r.reason || '不能种');
        if (!r.ok) toast(r.reason || '不能种');
        renderSeeds();
        renderHud();
    }

    function spawnInvader() {
        const g = growthState().growth;
        const r = garden.spawnInvader(g, bridge.today());
        commitGrowth(r.growth);
        if (r.spawned) {
            els.tip.textContent = '僵尸来了！选好植物，点「使用技能」。';
            toast('僵尸出现！');
        } else {
            els.tip.textContent = r.growth.garden.invader.active ? '场上已有僵尸，先使用技能。' : '暂时不能召唤';
        }
        renderHud();
    }

    function useSkill() {
        const g = growthState().growth;
        const plant = (garden.PLANT_CATALOG || []).find(function (p) { return p.id === g.garden.activePlantId; }) || {};
        const m = boardMetrics();
        const invLane = 2;
        const invCol = 5;
        // 找最近的同路植物做发射起点
        const plants = (g.garden.defense && g.garden.defense.plants) || [];
        const shooter = plants.filter(function (p) {
            return p.lane === invLane && (p.plantId === 'plant-peashooter' || p.plantId === 'plant-snowpea' || p.plantId === 'plant-cherrybomb');
        }).sort(function (a, b) { return b.column - a.column; })[0];

        const r = garden.usePlantSkill(g, bridge.today());
        commitGrowth(r.growth);
        if (!r.ok) {
            toast(r.reason || '不能用');
            els.tip.textContent = r.reason || '技能失败';
            renderHud();
            return;
        }

        if (r.effect === 'sunlight') {
            toast(`向日葵 +${r.amount || 10} 阳光！`);
            els.tip.textContent = '阳光已到账，可用来种植物。';
        } else if (r.effect === 'block') {
            toast('坚果挡住啦！');
        } else if (r.hit) {
            // 飞行动画
            const fromCol = shooter ? shooter.column : 1;
            peaAnim = {
                x0: m.left + fromCol * m.cell + m.cell * 0.6,
                y0: m.top + invLane * m.cell + m.cell * 0.45,
                x1: m.left + invCol * m.cell + m.cell * 0.3,
                y1: m.top + invLane * m.cell + m.cell * 0.45,
                t: 0,
                ice: r.effect === 'ice-pea'
            };
            if (r.defeated) {
                stageKills += 1;
                toast(`击退！本关 ${stageKills}/${currentStage.needKills}`);
                // 每关固定击退奖励（去重：关卡+击退序号）
                bridge.awardSunlight({
                    gameId: GAME_ID,
                    eventKey: 'kill-s' + currentStage.id + '-n' + stageKills,
                    amount: 2,
                    reason: '击退僵尸'
                });
                if (stageKills >= currentStage.needKills) {
                    onStageClear();
                    return;
                }
            } else {
                toast(`命中！伤害 ${r.damage}`);
            }
        }
        renderHud();
        refreshWallet();
    }

    let clearing = false;
    function onStageClear() {
        if (clearing || !currentStage) return;
        clearing = true;
        const star = Math.min(3, 1 + (stageKills >= currentStage.needKills ? 1 : 0) + 1);
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
        toast(award.awarded ? `通关！+${award.amount} 阳光` : `通关！${award.reason}`);
        els.status.textContent = '胜利';
        setTimeout(function () {
            clearing = false;
            showMap();
        }, 1500);
    }

    function bind() {
        canvas.addEventListener('pointerdown', placeAt);
        canvas.addEventListener('pointermove', function (e) { hoverCell = cellFromEvent(e); });
        canvas.addEventListener('pointerleave', function () { hoverCell = null; });
        document.getElementById('spawn-btn').addEventListener('click', spawnInvader);
        document.getElementById('skill-btn').addEventListener('click', useSkill);
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
            draw();
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
            renderMap();
            bind();
            showMap();
        });
    }

    boot();
})();
