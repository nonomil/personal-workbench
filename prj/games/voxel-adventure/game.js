(function () {
    'use strict';

    /**
     * 挖放循环对照小孩哥工作台：点击挖矿、右键/长按放置、WASD、空格跳。
     * 走动/材料参考 KUBO；躲避怪参考 little-game-MC。画面只用本仓 voxel-v1。
     */
    const bridge = window.WorkbenchGameBridge;
    const worldApi = window.VoxelWorld;
    const questsApi = window.VoxelQuests;
    const VIEW_COLS = 16;
    const VIEW_ROWS = 12;
    const VIEW_W = 960;
    const VIEW_H = 540;
    const INVINCIBLE_MS = 1600;
    const MOVE_EVERY = 140;
    const WANDER_EVERY = 700;
    const CHASE_EVERY = 1100;
    const FALL_EVERY = 140;
    const JUMP_HANG_MS = 260;
    const LONG_PRESS_MS = 420;
    const THEME = '../../assets/generated/preschool-theme-assets/voxel-v1/published/';
    const LOCAL = './assets/';

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    if (/embed=1/.test(location.search || '')) document.body.classList.add('mc-embed');

    const ASSET = {
        grass: THEME + 'voxel-grass-block.png',
        dirt: THEME + 'voxel-dirt-block.png',
        stone: THEME + 'voxel-stone-block.png',
        wood: THEME + 'voxel-wood-block.png',
        plank: THEME + 'voxel-wood-block.png',
        crystal: THEME + 'voxel-purple-crystal.png',
        water: THEME + 'voxel-water-channel.png',
        bedrock: THEME + 'voxel-bedrock-block.png',
        miner: THEME + 'voxel-miner.png',
        spark: THEME + 'voxel-crystal-slime.png',
        lamb: THEME + 'voxel-companion.png',
        sky: LOCAL + 'bg/sky-day.png'
    };

    const FILL = {
        grass: '#6ec34f',
        dirt: '#a06a3c',
        leaf: '#3d9e45',
        plank: '#d4a574',
        wood: '#c4894a',
        stone: '#8a8f99',
        sand: '#e6c36a',
        water: '#4aa7d9',
        coal: '#2e3238',
        crystal: '#b59bff',
        bedrock: '#3a3a44'
    };

    const images = {};
    let progress = null;
    let world = null;
    let inventory = worldApi.emptyInv();
    let tool = 'hand';
    let selectedKind = null;
    let hover = null;
    let session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
    let miner = { x: 1, y: 5 };
    let hp = worldApi.MAX_HP;
    let lastHitAt = -99999;
    let creatures = [];
    let holds = { left: false, right: false, jump: false };
    let lastWanderAt = 0;
    let lastChaseAt = 0;
    let lastMoveAt = 0;
    let lastFallAt = 0;
    let jumpLockUntil = 0;
    let press = null;

    function toast(msg) {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { el.classList.remove('is-on'); }, 2400);
    }

    function loadImage(key, src) {
        return new Promise(function (resolve) {
            const img = new Image();
            img.onload = function () { images[key] = img; resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = src;
        });
    }

    function spawnActors() {
        miner = worldApi.spawnCell(world);
        hp = worldApi.MAX_HP;
        lastHitAt = -99999;
        creatures = [
            { kind: 'lamb', x: 5, y: miner.y },
            { kind: 'calf', x: 9, y: miner.y },
            { kind: 'spark', x: 12, y: miner.y }
        ].map(function (c) {
            const g = worldApi.applyGravity(world, c.x, c.y);
            return { kind: c.kind, x: g.x, y: g.y };
        });
    }

    function loadProgress() {
        progress = bridge.getProgress(GAME_ID).progress;
        if (!Array.isArray(progress.questsDone)) progress.questsDone = [];
        if (!Array.isArray(progress.clearedLevels)) progress.clearedLevels = [];
        if (!Number.isFinite(progress.crystalsTotal)) progress.crystalsTotal = 0;
        if (!Number.isFinite(progress.buildTotal)) progress.buildTotal = 0;
        if (!progress.buildTotalByKind || typeof progress.buildTotalByKind !== 'object') progress.buildTotalByKind = {};
        if (!Number.isFinite(progress.rank)) progress.rank = 1;
        if (worldApi.isValidWorld(progress.homeWorld)) {
            world = worldApi.cloneWorld(progress.homeWorld);
        } else {
            world = worldApi.createDefaultWorld(3);
        }
        inventory = Object.assign(worldApi.emptyInv(), progress.inventory || {});
        seedStarterQuestItems();
        spawnActors();
        bridge.saveProgress(GAME_ID, progress);
    }

    function seedStarterQuestItems() {
        const done = progress.questsDone || [];
        if (done.indexOf('q1') !== -1) return;
        if ((inventory.grass || 0) > 0) return;
        inventory.grass = 8;
        selectedKind = 'grass';
        tool = 'hand';
        progress.inventory = Object.assign(worldApi.emptyInv(), inventory);
    }

    function persistHome() {
        progress.homeWorld = worldApi.cloneWorld(world);
        progress.inventory = Object.assign(worldApi.emptyInv(), inventory);
        bridge.saveProgress(GAME_ID, progress);
    }

    function rank() {
        return worldApi.minerRank(progress.questsDone, questsApi.ranks);
    }

    function statsNow() {
        return {
            placedThis: session.placedThis,
            placedAnyThis: session.placedAnyThis,
            collectedThis: session.collectedThis,
            buildTotal: progress.buildTotal || 0,
            buildTotalByKind: progress.buildTotalByKind || {},
            crystalsTotal: progress.crystalsTotal || 0,
            blocksAlive: worldApi.countSolid(world)
        };
    }

    function currentQuest() {
        const done = progress.questsDone || [];
        const r = rank();
        const career = questsApi.list.find(function (q) {
            return done.indexOf(q.id) === -1 && r >= (q.rank || 1);
        });
        if (career) return career;
        const daily = questsApi.dailyForDate(questsApi.localDate());
        if (daily && done.indexOf(daily.id) === -1) return daily;
        return questsApi.list.find(function (q) { return done.indexOf(q.id) === -1; }) || null;
    }

    function bagTotal() {
        return ['grass', 'dirt', 'wood', 'leaf', 'plank', 'stone', 'sand', 'water', 'coal', 'crystal'].reduce(function (sum, key) {
            return sum + (Number(inventory[key]) || 0);
        }, 0);
    }

    function refreshWallet() {
        const w = bridge.getWallet();
        const hud = document.getElementById('wallet-hud');
        if (hud) {
            hud.innerHTML =
                `<span class="chip">阳光 <b>${w.sunlight}</b></span>` +
                `<span class="chip">生命 <b>${hp}</b>/${worldApi.MAX_HP}</span>` +
                `<span class="chip">矿工 Lv.<b>${rank()}</b></span>`;
        }
        const bag = document.getElementById('bag-count');
        const coord = document.getElementById('coord-label');
        if (bag) bag.textContent = String(bagTotal());
        if (coord) coord.textContent = miner.x + ', ' + miner.y;
    }

    function completeQuest(quest) {
        if (!quest || progress.questsDone.indexOf(quest.id) !== -1) return;
        progress.questsDone.push(quest.id);
        progress.rank = rank();
        bridge.saveProgress(GAME_ID, progress);
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: quest.daily ? quest.id : ('quest-' + quest.id),
            amount: quest.reward,
            reason: quest.title
        });
        if (bridge.grantProgressPoints) bridge.grantProgressPoints(GAME_ID, 4, 'quest-' + quest.id);
        if (bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
        toast(award.awarded ? (quest.title + ' · +' + award.amount + ' 阳光') : (quest.title + ' · ' + award.reason));
        refreshWallet();
        renderQuests();
        renderHud();
    }

    function checkQuests() {
        const q = currentQuest();
        if (q && worldApi.isQuestComplete(q, statsNow())) completeQuest(q);
    }

    function renderHud() {
        const q = currentQuest();
        const stats = statsNow();
        const have = q ? worldApi.questValue(q, stats) : 0;
        const need = q ? (q.need || 0) : 0;
        const title = document.getElementById('quest-title');
        const count = document.getElementById('quest-count');
        const needEl = document.getElementById('quest-need');
        const status = document.getElementById('run-status');
        if (title) title.textContent = q ? (q.title + ' ' + have + '/' + need) : '方块世界';
        if (count) count.textContent = String(have);
        if (needEl) needEl.textContent = String(need);
        if (status) status.textContent = q ? '建造中' : '休息';
        refreshWallet();
    }

    function renderHotbar() {
        const bar = document.getElementById('hotbar');
        const tools = [
            { id: 'hand', label: '木镐' },
            { id: 'axe', label: '斧' },
            { id: 'pick', label: '石镐' }
        ];
        const kinds = ['wood', 'plank', 'grass', 'sand', 'dirt', 'stone', 'crystal'];
        const labels = {
            grass: '草方块', dirt: '泥土', sand: '沙子', wood: '橡木', plank: '橡木板',
            stone: '石头', crystal: '晶体'
        };
        bar.innerHTML = '';
        tools.forEach(function (t) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hotbar-slot' + (tool === t.id ? ' is-tool-on' : '');
            btn.innerHTML = '<small>' + t.label + '</small>';
            btn.addEventListener('click', function () {
                tool = t.id;
                renderHotbar();
            });
            bar.appendChild(btn);
        });
        kinds.forEach(function (kind) {
            const count = inventory[kind] || 0;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hotbar-slot' + (selectedKind === kind ? ' is-active' : '');
            btn.disabled = count <= 0;
            const img = images[kind];
            btn.innerHTML = (img ? '<img src="' + img.src + '" alt="">' : '') +
                '<b>' + count + '</b><small>' + labels[kind] + '</small>';
            btn.addEventListener('click', function () {
                if (count <= 0) return;
                selectedKind = kind;
                renderHotbar();
            });
            bar.appendChild(btn);
        });
    }

    function renderQuests() {
        const box = document.getElementById('quest-list');
        const stats = statsNow();
        const done = progress.questsDone || [];
        const r = rank();
        box.innerHTML = '';
        const daily = questsApi.dailyForDate(questsApi.localDate());
        const show = [daily].concat(questsApi.list.filter(function (q) { return r >= (q.rank || 1) || done.indexOf(q.id) !== -1; })).slice(0, 8);
        show.forEach(function (q) {
            if (!q) return;
            const card = document.createElement('div');
            const finished = done.indexOf(q.id) !== -1;
            const have = Math.min(q.need, worldApi.questValue(q, stats));
            card.className = 'quest-card' + (finished ? ' is-done' : '') + (q.daily ? ' is-daily' : '');
            card.innerHTML = '<strong>' + q.title + '</strong><small>' + q.desc + '</small>' +
                '<div class="quest-bar"><span style="width:' + Math.round((finished ? 1 : have / q.need) * 100) + '%"></span></div>' +
                '<em>' + (finished ? '已完成' : (have + ' / ' + q.need)) + '</em>';
            box.appendChild(card);
        });
        document.getElementById('progress-tip').textContent =
            '任务 ' + done.length + ' · 矿工 ' + r;
        refreshWallet();
    }

    function camera() {
        const cols = world.cols;
        const rows = world.rows;
        const viewC = Math.min(VIEW_COLS, cols);
        const viewR = Math.min(VIEW_ROWS, rows);
        let ox = miner.x - Math.floor(viewC / 2);
        let oy = miner.y - Math.floor(viewR / 2);
        ox = Math.max(0, Math.min(ox, cols - viewC));
        oy = Math.max(0, Math.min(oy, rows - viewR));
        return { ox: ox, oy: oy, cols: viewC, rows: viewR };
    }

    function board() {
        const cam = camera();
        const tile = Math.floor(Math.min(VIEW_W / VIEW_COLS, VIEW_H / VIEW_ROWS));
        const w = tile * cam.cols;
        const h = tile * cam.rows;
        return {
            tile: tile,
            x: Math.floor((VIEW_W - w) / 2),
            y: Math.floor((VIEW_H - h) / 2),
            w: w,
            h: h,
            ox: cam.ox,
            oy: cam.oy,
            cols: cam.cols,
            rows: cam.rows
        };
    }

    function cellAt(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const px = (clientX - rect.left) * (VIEW_W / rect.width);
        const py = (clientY - rect.top) * (VIEW_H / rect.height);
        const b = board();
        const vx = Math.floor((px - b.x) / b.tile);
        const vy = Math.floor((py - b.y) / b.tile);
        if (vx < 0 || vy < 0 || vx >= b.cols || vy >= b.rows) return null;
        const x = vx + b.ox;
        const y = vy + b.oy;
        if (x < 0 || y < 0 || x >= world.cols || y >= world.rows) return null;
        return { x: x, y: y };
    }

    function doPlace(cell) {
        if (!selectedKind) {
            toast('先点下面背包里的方块，再右键或长按空地放下。');
            return false;
        }
        const bag = worldApi.consumeFromInventory(inventory, selectedKind);
        if (!bag.ok) { toast('没有这个方块了'); return false; }
        const placed = worldApi.placeBlock(world, cell.x, cell.y, selectedKind);
        if (!placed.ok) {
            inventory = worldApi.addToInventory(bag.inventory, selectedKind, 1);
            toast(placed.reason);
            return false;
        }
        inventory = bag.inventory;
        session.placedThis[selectedKind] = (session.placedThis[selectedKind] || 0) + 1;
        session.placedAnyThis += 1;
        progress.buildTotal = (progress.buildTotal || 0) + 1;
        progress.buildTotalByKind[selectedKind] = (progress.buildTotalByKind[selectedKind] || 0) + 1;
        if ((inventory[selectedKind] || 0) <= 0) selectedKind = null;
        persistHome();
        checkQuests();
        renderHotbar();
        renderHud();
        renderQuests();
        return true;
    }

    function doMine(cell) {
        const dug = worldApi.mineBlock(world, cell.x, cell.y, tool, rank());
        if (!dug.ok) {
            toast(dug.reason);
            return false;
        }
        (dug.dropped || [dug.kind]).forEach(function (kind) {
            inventory = worldApi.addToInventory(inventory, kind, 1);
        });
        selectedKind = dug.kind;
        if (dug.kind === 'wood' || dug.kind === 'leaf') {
            toast('砍到了！选中背包后，右键或长按空地就能放下。');
        }
        const quest = currentQuest();
        if (quest && quest.type === 'build' && quest.block === dug.kind) {
            toast('挖到了！选中下面的' + (dug.kind === 'grass' ? '草' : '方块') + '，右键或长按空地铺上去。');
        }
        if (dug.kind === 'crystal') {
            session.collectedThis.crystal = (session.collectedThis.crystal || 0) + 1;
            progress.crystalsTotal = (progress.crystalsTotal || 0) + 1;
        }
        persistHome();
        checkQuests();
        renderHotbar();
        renderHud();
        renderQuests();
        return true;
    }

    function onPointerDown(e) {
        const cell = cellAt(e.clientX, e.clientY);
        if (!cell) return;
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
        press = { x: cell.x, y: cell.y, at: performance.now(), button: e.button, placed: false };
        if (e.button === 2) {
            e.preventDefault();
            press.placed = doPlace(cell);
        }
    }

    function onPointerMove(e) {
        hover = cellAt(e.clientX, e.clientY);
        if (!press || press.placed) return;
        if (hover && (hover.x !== press.x || hover.y !== press.y)) press = null;
    }

    function onPointerUp(e) {
        if (!press) return;
        const cell = { x: press.x, y: press.y };
        const held = performance.now() - press.at;
        const kind = worldApi.getCell(world, cell.x, cell.y);
        if (!press.placed && e.button !== 2 && held >= LONG_PRESS_MS && worldApi.isPassable(kind) && selectedKind) {
            doPlace(cell);
        } else if (!press.placed && e.button !== 2) {
            doMine(cell);
        }
        press = null;
    }

    function drawTile(kind, dx, dy, size) {
        const img = images[kind];
        if (img) {
            ctx.drawImage(img, dx + 2, dy + 2, size - 4, size - 4);
            return;
        }
        ctx.fillStyle = FILL[kind] || '#ccc';
        ctx.fillRect(dx + 1, dy + 1, size - 2, size - 2);
        ctx.strokeStyle = 'rgba(0,0,0,.18)';
        ctx.strokeRect(dx + 1.5, dy + 1.5, size - 3, size - 3);
    }

    function actorScreen(actor, b) {
        return {
            x: b.x + (actor.x - b.ox) * b.tile + 4,
            y: b.y + (actor.y - b.oy) * b.tile - Math.floor(b.tile * 0.15),
            s: b.tile - 8
        };
    }

    function inView(cell, b) {
        return cell && (cell.x - b.ox) >= 0 && (cell.y - b.oy) >= 0
            && (cell.x - b.ox) < b.cols && (cell.y - b.oy) < b.rows;
    }

    function respawnFromVoid() {
        miner = worldApi.spawnCell(world);
        hp = worldApi.MAX_HP;
        toast('掉下去了，回到起点。背包还在。');
        refreshWallet();
    }

    function isInvincible(now) {
        return now - lastHitAt < INVINCIBLE_MS;
    }

    function bumpIfNeeded(now) {
        creatures.forEach(function (c) {
            if (c.kind !== 'spark') return;
            if (!worldApi.sameCell(miner, c)) return;
            if (isInvincible(now)) return;
            lastHitAt = now;
            hp = worldApi.hitMiner(hp, worldApi.BUMP_HP);
            if (hp <= 0) {
                miner = worldApi.spawnCell(world);
                hp = worldApi.MAX_HP;
                toast('被撞到了，回到起点。背包还在。');
            } else {
                toast('躲开晶晶！掉了 1 点生命。');
            }
            refreshWallet();
        });
    }

    function tryStepMiner(dx, now) {
        const moved = worldApi.tryMove(world, miner.x, miner.y, dx, 0);
        if (!moved.ok) return;
        miner = { x: moved.x, y: moved.y };
        bumpIfNeeded(now);
        refreshWallet();
    }

    function tryJump(now) {
        if (now < jumpLockUntil) return;
        const hopped = worldApi.jumpUp(world, miner.x, miner.y, 2);
        if (!hopped.ok) return;
        miner = { x: hopped.x, y: hopped.y };
        jumpLockUntil = now + JUMP_HANG_MS;
        bumpIfNeeded(now);
    }

    function tickWorld(now) {
        if (now >= jumpLockUntil && now - lastFallAt >= FALL_EVERY) {
            lastFallAt = now;
            const fall = worldApi.stepFall(world, miner.x, miner.y);
            if (fall.ok) miner = { x: fall.x, y: fall.y };
            if (worldApi.isVoid(world, miner.x, miner.y)) respawnFromVoid();
        }
        if (now - lastWanderAt >= WANDER_EVERY) {
            lastWanderAt = now;
            creatures = creatures.map(function (c) {
                if (c.kind === 'spark') return c;
                const next = worldApi.stepWander(world, c, Math.random());
                next.kind = c.kind;
                return next;
            });
        }
        if (now - lastChaseAt >= CHASE_EVERY) {
            lastChaseAt = now;
            creatures = creatures.map(function (c) {
                if (c.kind !== 'spark') return c;
                const next = worldApi.stepChase(world, c, miner);
                next.kind = c.kind;
                return next;
            });
        }
        if (now - lastMoveAt >= MOVE_EVERY) {
            lastMoveAt = now;
            if (holds.jump) tryJump(now);
            if (holds.left) tryStepMiner(-1, now);
            else if (holds.right) tryStepMiner(1, now);
        }
        bumpIfNeeded(now);
        if (worldApi.isVoid(world, miner.x, miner.y)) respawnFromVoid();
    }

    function drawActor(key, actor, b, now, flash) {
        const pos = actorScreen(actor, b);
        if (flash && Math.floor(now / 120) % 2 === 0) return;
        const img = images[key];
        if (img) {
            ctx.drawImage(img, pos.x, pos.y, pos.s, pos.s + 6);
            return;
        }
        ctx.fillStyle = key === 'spark' ? '#7d5cff' : '#f4d27a';
        ctx.fillRect(pos.x, pos.y, pos.s, pos.s);
    }

    function draw(now) {
        const t = Number(now) || 0;
        tickWorld(t);
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
        if (images.sky) ctx.drawImage(images.sky, 0, 0, VIEW_W, VIEW_H);
        else {
            ctx.fillStyle = '#8fd3f4';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
        const b = board();
        for (let vy = 0; vy < b.rows; vy += 1) {
            for (let vx = 0; vx < b.cols; vx += 1) {
                const x = vx + b.ox;
                const y = vy + b.oy;
                const kind = world.grid[y][x];
                const dx = b.x + vx * b.tile;
                const dy = b.y + vy * b.tile;
                if (kind === 'air') {
                    ctx.fillStyle = 'rgba(255,255,255,.08)';
                    ctx.fillRect(dx, dy, b.tile, b.tile);
                } else drawTile(kind, dx, dy, b.tile);
            }
        }
        if (inView(hover, b)) {
            ctx.strokeStyle = selectedKind ? '#f0c14a' : '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(b.x + (hover.x - b.ox) * b.tile + 1, b.y + (hover.y - b.oy) * b.tile + 1, b.tile - 2, b.tile - 2);
        }
        if (press && selectedKind && inView(press, b)) {
            const held = Math.min(1, (t - press.at) / LONG_PRESS_MS);
            ctx.fillStyle = 'rgba(240,193,74,' + (0.2 + held * 0.45) + ')';
            ctx.fillRect(b.x + (press.x - b.ox) * b.tile + 2, b.y + (press.y - b.oy) * b.tile + 2, (b.tile - 4) * held, b.tile - 4);
        }
        creatures.forEach(function (c) {
            const key = c.kind === 'spark' ? 'spark' : 'lamb';
            drawActor(key, c, b, t, false);
        });
        drawActor('miner', miner, b, t, isInvincible(t));
        requestAnimationFrame(draw);
    }

    function setHold(name, on) {
        if (!Object.prototype.hasOwnProperty.call(holds, name)) return;
        holds[name] = !!on;
    }

    function resetHome() {
        world = worldApi.createDefaultWorld(Date.now() % 97);
        inventory = worldApi.emptyInv();
        session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
        selectedKind = null;
        tool = 'hand';
        seedStarterQuestItems();
        spawnActors();
        persistHome();
        renderHotbar();
        renderHud();
        renderQuests();
        toast('家园刷新了，任务进度还在。');
    }

    function bind() {
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', function () { press = null; });
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        canvas.addEventListener('mouseleave', function () { hover = null; });
        document.querySelectorAll('[data-hold]').forEach(function (button) {
            const name = button.getAttribute('data-hold');
            button.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                setHold(name, true);
            });
            button.addEventListener('pointerup', function () { setHold(name, false); });
            button.addEventListener('pointerleave', function () { setHold(name, false); });
            button.addEventListener('pointercancel', function () { setHold(name, false); });
        });
        window.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setHold('left', true);
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setHold('right', true);
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
                e.preventDefault();
                setHold('jump', true);
            }
        });
        window.addEventListener('keyup', function (e) {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setHold('left', false);
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setHold('right', false);
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') setHold('jump', false);
        });
        document.getElementById('reset-btn').addEventListener('click', resetHome);
        const hudRefresh = document.getElementById('hud-refresh');
        if (hudRefresh) hudRefresh.addEventListener('click', resetHome);
        document.getElementById('fullscreen-btn').addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        document.getElementById('back-link').href = bridge.backHref('voxel-adventure');
    }

    loadProgress();
    if (!world) world = worldApi.createDefaultWorld(3);
    if (bridge.recordPlaySession) {
        const play = bridge.recordPlaySession(GAME_ID);
        if (play && play.awards && play.awards.length) {
            setTimeout(function () { toast(play.awards.map(function (a) { return a.title; }).join(' · ')); }, 400);
        }
    }
    bind();
    Promise.all([
        loadImage('grass', ASSET.grass),
        loadImage('dirt', ASSET.dirt),
        loadImage('stone', ASSET.stone),
        loadImage('wood', ASSET.wood),
        loadImage('plank', ASSET.plank),
        loadImage('crystal', ASSET.crystal),
        loadImage('water', ASSET.water),
        loadImage('bedrock', ASSET.bedrock),
        loadImage('miner', ASSET.miner),
        loadImage('spark', ASSET.spark),
        loadImage('lamb', ASSET.lamb),
        loadImage('sky', ASSET.sky)
    ]).then(function () {
        renderHotbar();
        renderHud();
        renderQuests();
        if (selectedKind === 'grass' && (progress.questsDone || []).indexOf('q1') === -1) {
            toast('左键点树和草就能砍进背包。选中草后，右键或长按空地铺路。');
        }
        requestAnimationFrame(draw);
    });
}());
