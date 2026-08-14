(function () {
    'use strict';

    /**
     * 横版引擎 kubo-sandbox；视觉 Paper Minecraft（DS-Scratch-我的世界.md）。
     */
    const bridge = window.WorkbenchGameBridge;
    const worldApi = window.VoxelWorld;
    const questsApi = window.VoxelQuests;
    const levelsApi = window.VoxelLevels;
    const GAME_ID = 'voxel-adventure';
    const TILE = 32;
    const WORLD_COLS = 220;
    const WORLD_ROWS = 28;
    const GROUND_ROW = 20;
    const GRAVITY = 0.42;
    const MOVE_SPEED = 3.2;
    const RUN_SPEED = 5.1;
    const JUMP_FORCE = -8.8;
    const VIEW_COLS = 16;
    const VIEW_ROWS = 12;
    const VIEW_W = 960;
    const VIEW_H = 540;
    const INVINCIBLE_MS = 1600;
    const CHASE_EVERY = 1100;
    const LONG_PRESS_MS = 420;
    const pixels = window.VoxelPixelTiles;

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    ctx.imageSmoothingEnabled = false;
    if (/embed=1/.test(location.search || '')) document.body.classList.add('mc-embed');
    let progress = null;
    let world = null;
    let levelId = 1;
    let inventory = worldApi.emptyInv();
    let tool = 'hand';
    let selectedKind = 'grass';
    let hover = null;
    let session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
    let hp = worldApi.MAX_HP;
    let lastHitAt = -99999;
    let lastChaseAt = 0;
    let cameraX = 0;
    let cameraY = 0;
    let keys = {};
    let holds = { left: false, right: false, jump: false };
    let press = null;
    let won = false;
    let frameCount = 0;
    const player = {
        x: 5 * TILE, y: 8 * TILE, w: 40, h: 56,
        vx: 0, vy: 0, onGround: false, facing: 1,
        inWater: false, jumpPressed: false
    };
    let creatures = [];
    const images = {};
    const HERO = {
        idle: './assets/hero/explorer-idle.png',
        walkA: './assets/hero/explorer-walk-a.png',
        walkB: './assets/hero/explorer-walk-b.png',
        jump: './assets/hero/explorer-jump.png',
        mine: './assets/hero/explorer-mine.png'
    };
    const SPRITE_W = 64;
    const SPRITE_H = 80;
    const MINE_WINDUP = 180;
    const MINE_HIT = 380;
    const MINE_END = 560;
    let mineAct = null;
    let chips = [];

    function toast(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
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

    function getBlock(tileX, tileY) {
        if (tileX < 0 || tileX >= WORLD_COLS || tileY < 0 || tileY >= WORLD_ROWS) return 'bedrock';
        return world.grid[tileY][tileX] || 'air';
    }

    function setBlock(tileX, tileY, id) {
        if (tileX < 0 || tileX >= WORLD_COLS || tileY < 0 || tileY >= WORLD_ROWS) return;
        world.grid[tileY][tileX] = id || 'air';
    }

    function isSolidAt(tileX, tileY) {
        const kind = getBlock(tileX, tileY);
        if (kind === 'bedrock') return true;
        return !worldApi.isPassable(kind);
    }

    function rectIntersectsSolid(x, y, w, h) {
        const left = Math.floor(x / TILE);
        const right = Math.floor((x + w - 1) / TILE);
        const top = Math.floor(y / TILE);
        const bottom = Math.floor((y + h - 1) / TILE);
        for (let ty = top; ty <= bottom; ty += 1) {
            for (let tx = left; tx <= right; tx += 1) {
                if (isSolidAt(tx, ty)) return true;
            }
        }
        return false;
    }

    function rectTouchesWater(x, y, w, h) {
        const left = Math.floor(x / TILE);
        const right = Math.floor((x + w - 1) / TILE);
        const top = Math.floor(y / TILE);
        const bottom = Math.floor((y + h - 1) / TILE);
        for (let ty = top; ty <= bottom; ty += 1) {
            for (let tx = left; tx <= right; tx += 1) {
                if (getBlock(tx, ty) === 'water') return true;
            }
        }
        return false;
    }

    function overlapRect(a, b) {
        return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
    }

    function generateWorld(levelSeed) {
        const n = Number(levelSeed) || 1;
        const lv = levelsApi.get(n);
        const region = levelsApi.getRegion(lv && lv.region ? lv.region : 'grassland');
        const grid = [];
        for (let y = 0; y < WORLD_ROWS; y += 1) {
            const row = [];
            for (let x = 0; x < WORLD_COLS; x += 1) row.push('air');
            grid.push(row);
        }
        const surfaceHeights = [];
        const bias = region.surfaceBias || 0;
        const isDesert = lv && lv.region === 'desert';
        const isCave = lv && (lv.region === 'cave' || lv.region === 'volcano' || lv.region === 'end');
        for (let x = 0; x < WORLD_COLS; x += 1) {
            let surface = GROUND_ROW + bias
                + Math.floor(Math.sin((x + n * 7) * 0.18) * 1.4)
                + Math.floor(Math.sin((x + n * 3) * 0.05) * 2);
            surface = Math.max(14, Math.min(WORLD_ROWS - 6, surface));
            surfaceHeights[x] = surface;
            for (let y = surface; y < WORLD_ROWS; y += 1) {
                if (y === WORLD_ROWS - 1) grid[y][x] = 'bedrock';
                else if (y === surface) grid[y][x] = isDesert ? 'sand' : 'grass';
                else if (y < surface + 3) grid[y][x] = isDesert ? 'sand' : 'dirt';
                else if (isCave && y < surface + 8 && x % 9 === n % 9) grid[y][x] = 'coal';
                else if (isCave && y === surface + 10 && x % 13 === (n * 2) % 13) grid[y][x] = 'crystal';
                else grid[y][x] = 'stone';
            }
        }
        if (!isDesert) {
            const lakeCenters = [24 + n, 67, 111, 163, 200].map(function (c) { return Math.min(WORLD_COLS - 8, c); });
            lakeCenters.forEach(function (cx) {
                const width = 3 + (cx % 3);
                const depth = 2 + (cx % 2);
                for (let x = cx - width; x <= cx + width; x += 1) {
                    if (x < 4 || x >= WORLD_COLS - 6) continue;
                    const dist = Math.abs(x - cx);
                    const localSurface = surfaceHeights[x];
                    const carveDepth = Math.max(1, depth - Math.floor(dist / 2));
                    for (let y = localSurface; y <= Math.min(WORLD_ROWS - 2, localSurface + carveDepth); y += 1) grid[y][x] = 'air';
                    for (let y = localSurface + 1; y <= Math.min(WORLD_ROWS - 2, localSurface + carveDepth); y += 1) grid[y][x] = 'water';
                }
            });
        }
        const treeN = Math.floor(6 * (region.treeDensity || 1));
        for (let i = 0; i < treeN; i += 1) {
            const x = 18 + i * 28 + (n % 5);
            const surface = surfaceHeights[x] || GROUND_ROW;
            if (surface - 1 >= 0) grid[surface - 1][x] = 'wood';
            if (surface - 2 >= 0) grid[surface - 2][x] = 'wood';
            if (surface - 3 >= 0) {
                [-1, 0, 1].forEach(function (dx) {
                    const lx = x + dx;
                    if (lx >= 0 && lx < WORLD_COLS && grid[surface - 3][lx] === 'air') grid[surface - 3][lx] = 'leaf';
                });
            }
        }
        if (isDesert) {
            for (let x = 40; x < 120; x += 14) {
                const s = surfaceHeights[x] || GROUND_ROW;
                if (s - 1 >= 0) grid[s - 1][x] = 'sand';
                if (s - 2 >= 0) grid[s - 2][x] = 'sand';
            }
        }
        for (let x = 145; x < 150; x += 1) {
            const y = Math.min(WORLD_ROWS - 4, surfaceHeights[x] + 4);
            if (grid[y][x] === 'stone') grid[y][x] = 'crystal';
        }
        const exitCol = WORLD_COLS - 6;
        const exitY = surfaceHeights[exitCol] || GROUND_ROW;
        if (exitY - 1 >= 0) grid[exitY - 1][exitCol] = 'wood';
        if (exitY - 2 >= 0) grid[exitY - 2][exitCol] = 'plank';
        world = {
            cols: WORLD_COLS, rows: WORLD_ROWS, grid: grid,
            exitCol: exitCol, exitY: exitY,
            region: lv && lv.region ? lv.region : 'grassland',
            goal: lv && lv.goal ? lv.goal : null
        };
    }

    function resetPlayer(fullHealth) {
        player.x = 5 * TILE;
        player.y = 8 * TILE;
        player.vx = 0;
        player.vy = 0;
        player.onGround = false;
        player.inWater = false;
        player.jumpPressed = false;
        player.facing = 1;
        if (fullHealth) hp = worldApi.MAX_HP;
        lastHitAt = -99999;
        won = false;
    }

    function spawnActors() {
        creatures = [40, 90, 140].map(function (tileX, i) {
            const g = worldApi.applyGravity(world, tileX, 8);
            return { kind: 'spark', x: g.x * TILE, y: g.y * TILE - 6, w: 32, h: 32, chase: i === 0 };
        });
    }

    function enterLevel(id) {
        levelId = Math.max(1, Math.min(levelsApi.count, Number(id) || 1));
        generateWorld(levelId);
        session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
        resetPlayer(true);
        spawnActors();
        renderHud();
        renderQuests();
        renderHotbar();
        const lv = levelsApi.get(levelId);
        toast((lv && lv.title ? lv.title : '第 ' + levelId + ' 关') + ' · 挖资源走到出口');
    }

    function loadProgress() {
        progress = bridge.getProgress(GAME_ID).progress;
        if (!Array.isArray(progress.questsDone)) progress.questsDone = [];
        if (!Array.isArray(progress.clearedLevels)) progress.clearedLevels = [];
        if (!Number.isFinite(progress.unlockedLevel)) progress.unlockedLevel = 1;
        if (!Number.isFinite(progress.crystalsTotal)) progress.crystalsTotal = 0;
        if (!Number.isFinite(progress.buildTotal)) progress.buildTotal = 0;
        if (!progress.buildTotalByKind || typeof progress.buildTotalByKind !== 'object') progress.buildTotalByKind = {};
        if (!Number.isFinite(progress.rank)) progress.rank = 1;
        inventory = Object.assign(worldApi.emptyInv(), progress.inventory || {});
        seedStarterQuestItems();
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

    function persistBag() {
        progress.inventory = Object.assign(worldApi.emptyInv(), inventory);
        progress.homeWorld = worldApi.cloneWorld(world);
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
        const html =
            '<span class="chip">阳光 <b>' + w.sunlight + '</b></span>' +
            '<span class="chip">生命 <b>' + hp + '</b>/' + worldApi.MAX_HP + '</span>' +
            '<span class="chip">第 <b>' + levelId + '</b>/' + levelsApi.count + ' 关</span>';
        if (hud && hud.innerHTML !== html) hud.innerHTML = html;
        const bag = document.getElementById('bag-count');
        const coord = document.getElementById('coord-label');
        const bagText = String(bagTotal());
        const coordText = Math.floor(player.x / TILE) + ', ' + Math.floor(player.y / TILE);
        if (bag && bag.textContent !== bagText) bag.textContent = bagText;
        if (coord && coord.textContent !== coordText) coord.textContent = coordText;
    }

    function completeQuest(quest) {
        if (!quest || progress.questsDone.indexOf(quest.id) !== -1) return;
        progress.questsDone.push(quest.id);
        progress.rank = rank();
        persistBag();
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: quest.daily ? quest.id : ('quest-' + quest.id),
            amount: quest.reward,
            reason: quest.title
        });
        toast(award.awarded ? (quest.title + ' · +' + award.amount + ' 阳光') : (quest.title + ' · ' + award.reason));
        renderQuests();
        renderHud();
    }

    function checkQuests() {
        const q = currentQuest();
        if (q && worldApi.isQuestComplete(q, statsNow())) completeQuest(q);
    }

    function renderHud() {
        const q = currentQuest();
        const have = q ? worldApi.questValue(q, statsNow()) : 0;
        const title = document.getElementById('quest-title');
        const count = document.getElementById('quest-count');
        const needEl = document.getElementById('quest-need');
        const status = document.getElementById('run-status');
        const lv = levelsApi.get(levelId);
        const goal = lv && lv.goal ? lv.goal : null;
        const goalHave = goal ? (session.collectedThis[goal.type] || 0) : 0;
        if (title) {
            title.textContent = (lv && lv.title ? lv.title : '方块关卡')
                + (goal ? ' · ' + (goal.label || goal.type) + ' ' + goalHave + '/' + goal.count : ' · 走到出口');
        }
        if (count) count.textContent = String(have);
        if (needEl) needEl.textContent = String(q ? q.need : 0);
        if (status) status.textContent = won ? '通关' : '探险中';
        refreshWallet();
    }

    function ownedTools() {
        const list = [{ id: 'hand', label: '空手', key: '1' }];
        if ((inventory.wood_pick || 0) > 0) list.push({ id: 'wood_pick', label: '木镐', key: String(list.length + 1) });
        if ((inventory.stone_pick || 0) > 0) list.push({ id: 'stone_pick', label: '石镐', key: String(list.length + 1) });
        return list;
    }

    function ensureToolValid() {
        const owned = ownedTools();
        if (!owned.some(function (t) { return t.id === tool; })) tool = 'hand';
    }

    function renderHotbar() {
        const bar = document.getElementById('hotbar');
        if (!bar) return;
        ensureToolValid();
        const tools = ownedTools();
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
            const icon = pixels && pixels.iconPreviewDataUrl ? pixels.iconPreviewDataUrl(t.id) : '';
            btn.innerHTML = (icon ? '<img class="hotbar-pixel" src="' + icon + '" alt="">' : '') +
                '<kbd>' + t.key + '</kbd><small>' + t.label + '</small>';
            btn.addEventListener('click', function () { tool = t.id; renderHotbar(); });
            bar.appendChild(btn);
        });
        kinds.forEach(function (kind, i) {
            const count = inventory[kind] || 0;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hotbar-slot' + (selectedKind === kind ? ' is-active' : '');
            btn.disabled = count <= 0;
            const preview = pixels && pixels.tilePreviewDataUrl ? pixels.tilePreviewDataUrl(kind) : '';
            const slotKey = String(tools.length + i + 1);
            btn.innerHTML = (preview ? '<img class="hotbar-pixel" src="' + preview + '" alt="">' : '') +
                '<kbd>' + slotKey + '</kbd><b>' + count + '</b><small>' + labels[kind] + '</small>';
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
        if (!box) return;
        box.innerHTML = '';
        levelsApi.list.forEach(function (lv) {
            const locked = lv.id > (progress.unlockedLevel || 1);
            const cleared = (progress.clearedLevels || []).indexOf(lv.id) !== -1;
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'quest-card' + (lv.id === levelId ? ' is-daily' : '') + (cleared ? ' is-done' : '');
            card.disabled = locked;
            card.innerHTML = '<strong>第 ' + lv.id + ' 关 · ' + lv.title + '</strong>' +
                '<small>' + (locked ? '先通前面一关' : (cleared ? '已通关 · 再走一次' : (
                    (lv.goal ? (lv.goal.label || lv.goal.type) + ' ' + lv.goal.count + ' + 出口' : '走到出口通关')
                ))) + '</small>';
            if (!locked) card.addEventListener('click', function () { enterLevel(lv.id); });
            box.appendChild(card);
        });
        const tip = document.getElementById('progress-tip');
        if (tip) tip.textContent = '通关 ' + (progress.clearedLevels || []).length + ' / ' + levelsApi.count;
        refreshWallet();
    }

    function cellAt(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const px = (clientX - rect.left) * (VIEW_W / rect.width) + cameraX;
        const py = (clientY - rect.top) * (VIEW_H / rect.height) + cameraY;
        const x = Math.floor(px / TILE);
        const y = Math.floor(py / TILE);
        if (x < 0 || y < 0 || x >= WORLD_COLS || y >= WORLD_ROWS) return null;
        return { x: x, y: y };
    }

    function canEditTile(tileX, tileY) {
        if (tileX < 0 || tileX >= WORLD_COLS || tileY < 0 || tileY >= WORLD_ROWS) return false;
        const tileRect = { x: tileX * TILE, y: tileY * TILE, w: TILE, h: TILE };
        return !overlapRect(tileRect, player);
    }

    function doPlace(cell) {
        if (!selectedKind) {
            toast('先点下面背包里的方块，再右键或长按空地放下。');
            return false;
        }
        if (!canEditTile(cell.x, cell.y)) return false;
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
        persistBag();
        checkQuests();
        renderHotbar();
        renderHud();
        return true;
    }

    function startMine(cell, now) {
        if (mineAct && now < mineAct.start + MINE_END) return false;
        if (!canEditTile(cell.x, cell.y)) return false;
        const kind = worldApi.getCell(world, cell.x, cell.y);
        if (!kind || kind === 'air') return false;
        if (!worldApi.canBreak(kind, tool)) {
            toast(worldApi.breakReason ? worldApi.breakReason(kind, tool) : '换个工具试试');
            return false;
        }
        const blockMid = cell.x * TILE + TILE / 2;
        player.facing = blockMid < player.x + player.w / 2 ? -1 : 1;
        mineAct = { start: now, cellX: cell.x, cellY: cell.y, kind: kind, hit: false };
        return true;
    }

    function spawnChips(tileX, tileY, kind) {
        const cx = tileX * TILE + TILE / 2;
        const cy = tileY * TILE + TILE / 2;
        const color = { grass: '#4fbf3a', dirt: '#8a5a2b', stone: '#8d9198', wood: '#7a4a22', sand: '#e6d08a', coal: '#3a3a40', crystal: '#9b7cff', leaf: '#2f9a3c', plank: '#c48a4a' }[kind] || '#bbb';
        for (let i = 0; i < 8; i += 1) {
            chips.push({
                x: cx, y: cy,
                vx: (Math.random() - 0.5) * 4.2,
                vy: -2.2 - Math.random() * 2.4,
                life: 22 + Math.floor(Math.random() * 10),
                color: color
            });
        }
    }

    function tickMine(now) {
        if (!mineAct) return;
        const age = now - mineAct.start;
        player.vx = 0;
        if (!mineAct.hit && age >= MINE_HIT) {
            mineAct.hit = true;
            doMine({ x: mineAct.cellX, y: mineAct.cellY });
            spawnChips(mineAct.cellX, mineAct.cellY, mineAct.kind);
        }
        if (age >= MINE_END) mineAct = null;
    }

    function doMine(cell) {
        if (!canEditTile(cell.x, cell.y)) return false;
        const dug = worldApi.mineBlock(world, cell.x, cell.y, tool);
        if (!dug.ok) {
            toast(dug.reason || '挖不动');
            return false;
        }
        (dug.dropped || [dug.kind]).forEach(function (kind) {
            inventory = worldApi.addToInventory(inventory, kind, 1);
            session.collectedThis[kind] = (session.collectedThis[kind] || 0) + 1;
        });
        selectedKind = dug.kind;
        if (dug.kind === 'crystal') {
            session.collectedThis.crystal = (session.collectedThis.crystal || 0) + 1;
            progress.crystalsTotal = (progress.crystalsTotal || 0) + 1;
        }
        persistBag();
        checkQuests();
        renderHotbar();
        renderHud();
        return true;
    }

    function onPointerDown(e) {
        const cell = cellAt(e.clientX, e.clientY);
        if (!cell) return;
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
        press = { x: cell.x, y: cell.y, at: performance.now(), button: e.button, placed: false, mined: false };
        if (e.button === 2) {
            e.preventDefault();
            press.placed = doPlace(cell);
        } else if (e.button === 0) {
            press.mined = startMine(cell, performance.now());
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
        } else if (!press.placed && !press.mined && e.button !== 2) {
            startMine(cell, performance.now());
        }
        press = null;
    }

    function handleJump() {
        if (player.inWater) {
            player.vy = Math.min(player.vy, -4.8);
            return;
        }
        if (player.onGround) {
            player.vy = JUMP_FORCE;
            player.onGround = false;
        }
    }

    function updateCamera() {
        cameraX = player.x - canvas.width * 0.42;
        cameraY = player.y - canvas.height * 0.55;
        const maxCamX = WORLD_COLS * TILE - canvas.width;
        const maxCamY = WORLD_ROWS * TILE - canvas.height;
        cameraX = Math.round(Math.max(0, Math.min(maxCamX, cameraX)));
        cameraY = Math.round(Math.max(0, Math.min(maxCamY, cameraY)));
    }

    function isInvincible(now) {
        return now - lastHitAt < INVINCIBLE_MS;
    }

    function respawnFromVoid() {
        resetPlayer(true);
        toast('掉下去了，回到起点。背包还在。');
        refreshWallet();
    }

    function bumpIfNeeded(now) {
        creatures.forEach(function (c) {
            if (!overlapRect(player, c)) return;
            if (isInvincible(now)) return;
            lastHitAt = now;
            hp = worldApi.hitMiner(hp, worldApi.BUMP_HP);
            player.vy = -6;
            if (hp <= 0) {
                resetPlayer(true);
                toast('没血了，回到起点。背包还在。');
            } else toast('躲开晶晶！掉了 1 点生命。');
            refreshWallet();
        });
    }

    function levelGoalMet() {
        const lv = levelsApi.get(levelId);
        if (!lv || !lv.goal) return true;
        return (session.collectedThis[lv.goal.type] || 0) >= lv.goal.count;
    }

    function onClear() {
        if (won) return;
        if (!levelGoalMet()) {
            const lv = levelsApi.get(levelId);
            const g = lv && lv.goal;
            toast((g && g.label ? g.label : '区域目标') + '还没完成，继续挖吧');
            return;
        }
        won = true;
        const lv = levelsApi.get(levelId);
        if ((progress.clearedLevels || []).indexOf(levelId) === -1) progress.clearedLevels.push(levelId);
        if (progress.unlockedLevel < levelId + 1 && levelId < levelsApi.count) progress.unlockedLevel = levelId + 1;
        persistBag();
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: 'level-' + levelId + '-clear',
            amount: (lv && lv.rewardSun) || 12,
            reason: '通关方块第' + levelId + '关'
        });
        toast(award.awarded ? ((lv && lv.title) || '本关') + '通关 · +' + award.amount + ' 阳光' : '通关了');
        renderQuests();
        renderHud();
        setTimeout(function () {
            if (levelId < levelsApi.count) enterLevel(levelId + 1);
        }, 1200);
    }

    function updatePlayer() {
        player.inWater = rectTouchesWater(player.x, player.y, player.w, player.h);
        const movingLeft = keys.a || keys.arrowleft || holds.left;
        const movingRight = keys.d || keys.arrowright || holds.right;
        const holdingShift = keys.shift;
        const currentMoveSpeed = player.inWater ? 2.1 : (holdingShift ? RUN_SPEED : MOVE_SPEED);
        player.vx = 0;
        if (!mineAct) {
            if (movingLeft) { player.vx = -currentMoveSpeed; player.facing = -1; }
            if (movingRight) { player.vx = currentMoveSpeed; player.facing = 1; }
        }
        player.x += player.vx;
        if (rectIntersectsSolid(player.x, player.y, player.w, player.h)) {
            if (player.vx > 0) player.x = Math.floor((player.x + player.w - 1) / TILE) * TILE - player.w;
            else if (player.vx < 0) player.x = Math.floor(player.x / TILE + 1) * TILE;
        }
        const onFloor = !player.inWater && player.vy >= 0
            && rectIntersectsSolid(player.x, player.y + 1, player.w, player.h);
        if (player.inWater) {
            player.vy += 0.08;
            if (holdingShift) player.vy -= 0.33;
            player.vy = Math.max(-4.4, Math.min(3.2, player.vy));
            player.y += player.vy;
            player.onGround = false;
            if (rectIntersectsSolid(player.x, player.y, player.w, player.h)) {
                if (player.vy > 0) {
                    player.y = Math.floor((player.y + player.h - 1) / TILE) * TILE - player.h;
                    player.vy = 0;
                } else if (player.vy < 0) {
                    player.y = Math.floor(player.y / TILE + 1) * TILE;
                    player.vy = 0;
                }
            }
        } else if (onFloor) {
            player.vy = 0;
            player.onGround = true;
            if (player.vx === 0) player.x = Math.round(player.x);
            player.y = Math.round(player.y);
        } else {
            player.vy += GRAVITY;
            if (player.vy > 12) player.vy = 12;
            player.y += player.vy;
            player.onGround = false;
            if (rectIntersectsSolid(player.x, player.y, player.w, player.h)) {
                if (player.vy > 0) {
                    player.y = Math.floor((player.y + player.h - 1) / TILE) * TILE - player.h;
                    player.vy = 0;
                    player.onGround = !player.inWater;
                } else if (player.vy < 0) {
                    player.y = Math.floor(player.y / TILE + 1) * TILE;
                    player.vy = 0;
                }
            }
        }
        if (player.y > WORLD_ROWS * TILE + 40 || worldApi.isVoid(world, Math.floor((player.x + player.w / 2) / TILE), WORLD_ROWS - 1)) {
            respawnFromVoid();
        }
    }

    function tickWorld(now) {
        tickMine(now);
        updatePlayer();
        if (now - lastChaseAt >= CHASE_EVERY) {
            lastChaseAt = now;
            creatures = creatures.map(function (c) {
                const actor = { x: Math.floor(c.x / TILE), y: Math.floor(c.y / TILE), kind: 'spark' };
                const target = { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
                const next = worldApi.stepChase(world, actor, target);
                c.x = next.x * TILE;
                c.y = next.y * TILE - 4;
                return c;
            });
        }
        bumpIfNeeded(now);
        if (!won && player.x + player.w >= (world.exitCol || WORLD_COLS - 6) * TILE) onClear();
        updateCamera();
        refreshWallet();
    }

    function drawBlock(tileX, tileY, kind) {
        const x = Math.round(tileX * TILE - cameraX);
        const y = Math.round(tileY * TILE - cameraY);
        if (pixels && pixels.drawTile(ctx, kind, x, y, TILE, frameCount)) return;
        ctx.fillStyle = '#ccc';
        ctx.fillRect(x, y, TILE, TILE);
    }

    function explorerPose(now) {
        if (mineAct && now - mineAct.start < MINE_END) {
            return (now - mineAct.start < MINE_WINDUP) ? 'idle' : (images.mine ? 'mine' : 'walkA');
        }
        if (!player.onGround) return 'jump';
        if (Math.abs(player.vx) > 0.35) return (Math.floor(now / 200) % 2 === 0) ? 'walkA' : 'walkB';
        return 'idle';
    }

    function drawPlayerSprite(now) {
        const t = Number(now) || 0;
        const flash = isInvincible(t) && Math.floor(t / 160) % 2 === 0;
        if (flash) return;
        const sw = SPRITE_W;
        const sh = SPRITE_H;
        const dx = Math.round(player.x - cameraX + (player.w - sw) / 2);
        const dy = Math.round(player.y - cameraY + player.h - sh);
        if (player.inWater) {
            ctx.fillStyle = 'rgba(72,170,255,0.18)';
            ctx.fillRect(dx + 8, dy + 36, sw - 16, sh - 40);
        }
        const pose = explorerPose(t);
        const img = images[pose];
        const fallback = { idle: 0, walkA: 1, walkB: 2, jump: 3 }[pose] || 0;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (player.facing < 0) {
            ctx.translate(dx + sw, dy);
            ctx.scale(-1, 1);
            if (img) ctx.drawImage(img, 0, 0, sw, sh);
            else if (pixels) pixels.drawSprite(ctx, 'explorer', 0, 0, sw, sh, fallback);
        } else if (img) {
            ctx.drawImage(img, dx, dy, sw, sh);
        } else if (pixels) {
            pixels.drawSprite(ctx, 'explorer', dx, dy, sw, sh, fallback);
        }
        ctx.restore();
        drawPickSwing(dx, dy, t);
    }

    function drawPickSwing(dx, dy, now) {
        if (!mineAct || !pixels) return;
        const age = now - mineAct.start;
        if (age >= MINE_WINDUP && images.mine) return;
        const t = Math.max(0, Math.min(1, age / MINE_WINDUP));
        const ang = -1.35 + t * 0.35;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (player.facing < 0) {
            ctx.translate(dx + SPRITE_W, dy);
            ctx.scale(-1, 1);
            ctx.translate(48, 34);
        } else {
            ctx.translate(dx + 48, dy + 34);
        }
        ctx.rotate(ang);
        const pick = (tool === 'stone_pick' || tool === 'wood_pick') ? tool : 'wood_pick';
        pixels.drawSprite(ctx, pick, -8, -28, 36, 36, 0);
        ctx.restore();
    }

    function drawMineFx(now) {
        if (mineAct) {
            const age = now - mineAct.start;
            const x = Math.round(mineAct.cellX * TILE - cameraX);
            const y = Math.round(mineAct.cellY * TILE - cameraY);
            if (age >= MINE_WINDUP) {
                ctx.strokeStyle = 'rgba(20,12,8,0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + 6, y + 5);
                ctx.lineTo(x + 15, y + 16);
                ctx.lineTo(x + 9, y + 27);
                ctx.moveTo(x + 24, y + 7);
                ctx.lineTo(x + 18, y + 20);
                ctx.stroke();
            }
        }
        chips = chips.filter(function (p) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.28;
            p.life -= 1;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x - cameraX), Math.round(p.y - cameraY), 4, 4);
            return p.life > 0;
        });
    }

    function drawCreatureSprite(c, now) {
        const x = Math.round(c.x - cameraX);
        const y = Math.round(c.y - cameraY);
        const frame = Math.floor((Number(now) || 0) / 180) % 3;
        if (pixels) {
            pixels.drawSprite(ctx, 'spark', x, y - 2, 32, 32, frame);
            return;
        }
        ctx.fillStyle = '#7d5cff';
        ctx.fillRect(x, y, c.w, c.h);
    }

    function drawSky() {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#3d9ee0');
        gradient.addColorStop(0.45, '#7ec8ef');
        gradient.addColorStop(1, '#c8ecff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffe27a';
        ctx.beginPath();
        ctx.arc(120 - cameraX * 0.02, 70, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,226,122,0.28)';
        ctx.beginPath();
        ctx.arc(120 - cameraX * 0.02, 70, 36, 0, Math.PI * 2);
        ctx.fill();
        if (pixels) {
            [40, 180, 340, 520, 700].forEach(function (base, i) {
                const hx = ((base - cameraX * 0.08) % (VIEW_W + 80)) - 40;
                pixels.drawSprite(ctx, 'hill', hx, 210 + (i % 2) * 8, 90, 36, 0);
            });
            [[90, 46, 0.12], [280, 68, 0.16], [510, 38, 0.1], [740, 58, 0.14]].forEach(function (cl) {
                const cx = ((cl[0] - cameraX * cl[2]) % (VIEW_W + 100)) - 40;
                pixels.drawSprite(ctx, 'cloud', cx, cl[1], 72, 28, 0);
            });
        }
    }

    function drawExit(now) {
        const exitX = (world.exitCol || WORLD_COLS - 6) * TILE - cameraX;
        const exitY = ((world.exitY || GROUND_ROW) - 2) * TILE - cameraY;
        if (pixels) {
            pixels.drawSprite(ctx, 'portal', exitX, exitY, 40, 40, Math.floor((Number(now) || 0) / 240) % 2);
            return;
        }
        ctx.fillStyle = '#ffe27a';
        ctx.fillRect(exitX + 10, 10, 6, 28);
    }

    function draw(now) {
        const t = Number(now) || 0;
        frameCount += 1;
        tickWorld(t);
        drawSky();
        const startCol = Math.max(0, Math.floor(cameraX / TILE));
        const endCol = Math.min(WORLD_COLS - 1, Math.ceil((cameraX + canvas.width) / TILE));
        const startRow = Math.max(0, Math.floor(cameraY / TILE));
        const endRow = Math.min(WORLD_ROWS - 1, Math.ceil((cameraY + canvas.height) / TILE));
        for (let y = startRow; y <= endRow; y += 1) {
            for (let x = startCol; x <= endCol; x += 1) {
                const kind = world.grid[y][x];
                if (!kind || kind === 'air') continue;
                drawBlock(x, y, kind);
            }
        }
        if (hover) {
            ctx.strokeStyle = selectedKind ? '#f0c14a' : '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(hover.x * TILE - cameraX + 0.5, hover.y * TILE - cameraY + 0.5, TILE - 1, TILE - 1);
        }
        creatures.forEach(function (c) { drawCreatureSprite(c, t); });
        drawExit(t);
        drawPlayerSprite(t);
        drawMineFx(t);
        requestAnimationFrame(draw);
    }

    function setHold(name, on) {
        if (!Object.prototype.hasOwnProperty.call(holds, name)) return;
        holds[name] = !!on;
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
                if (name === 'jump' && !player.jumpPressed) {
                    handleJump();
                    player.jumpPressed = true;
                }
            });
            button.addEventListener('pointerup', function () {
                setHold(name, false);
                if (name === 'jump') player.jumpPressed = false;
            });
            button.addEventListener('pointerleave', function () {
                setHold(name, false);
                if (name === 'jump') player.jumpPressed = false;
            });
            button.addEventListener('pointercancel', function () {
                setHold(name, false);
                if (name === 'jump') player.jumpPressed = false;
            });
        });
        window.addEventListener('keydown', function (e) {
            const k = e.key.toLowerCase();
            keys[k] = true;
            if (k >= '1' && k <= '9') {
                const idx = Number(k) - 1;
                const slots = ownedTools().concat(['wood', 'plank', 'grass', 'sand', 'dirt', 'stone', 'crystal'].map(function (kind) {
                    return { kind: kind, count: inventory[kind] || 0 };
                }));
                const slot = slots[idx];
                if (slot && slot.id) tool = slot.id;
                else if (slot && slot.kind && slot.count > 0) selectedKind = slot.kind;
                renderHotbar();
            }
            if (k === 'a' || k === 'arrowleft') setHold('left', true);
            if (k === 'd' || k === 'arrowright') setHold('right', true);
            if (e.code === 'Space' || k === 'w' || k === 'arrowup') {
                e.preventDefault();
                if (!player.jumpPressed) {
                    handleJump();
                    player.jumpPressed = true;
                }
            }
        });
        window.addEventListener('keyup', function (e) {
            const k = e.key.toLowerCase();
            keys[k] = false;
            if (k === 'a' || k === 'arrowleft') setHold('left', false);
            if (k === 'd' || k === 'arrowright') setHold('right', false);
            if (e.code === 'Space' || k === 'w' || k === 'arrowup') player.jumpPressed = false;
        });
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', function () { enterLevel(levelId); });
        const hudRefresh = document.getElementById('hud-refresh');
        if (hudRefresh) hudRefresh.addEventListener('click', function () { enterLevel(levelId); });
        const fullBtn = document.getElementById('fullscreen-btn');
        if (fullBtn) fullBtn.addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        const back = document.getElementById('back-link');
        if (back) back.href = bridge.backHref('voxel-adventure');
    }

    loadProgress();
    enterLevel(progress.unlockedLevel || 1);
    if (bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
    bind();
    Promise.all([
        loadImage('idle', HERO.idle),
        loadImage('walkA', HERO.walkA),
        loadImage('walkB', HERO.walkB),
        loadImage('jump', HERO.jump),
        loadImage('mine', HERO.mine)
    ]).then(function () {
        try {
            renderHotbar();
            renderHud();
            renderQuests();
            toast('A/D 跑，空格跳，左键挖，右键放。');
        } catch (err) {}
        requestAnimationFrame(draw);
    });
}());
