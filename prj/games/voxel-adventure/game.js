(function () {
    'use strict';

    /**
     * 横版过关对照 DS 方案的 KUBO 路线：2D 侧视、跑跳、挖放、躲怪、走到出口。
     * 挖放循环对照小孩哥工作台：点击挖矿、右键/长按放置、WASD、空格跳。
     * 走动/材料参考 KUBO；躲避怪参考 little-game-MC。画面只用本仓 voxel-v1。
     */
    const bridge = window.WorkbenchGameBridge;
    const worldApi = window.VoxelWorld;
    const questsApi = window.VoxelQuests;
    const levelsApi = window.VoxelLevels;
    const GAME_ID = 'voxel-adventure';
    const VIEW_COLS = 16;
    const VIEW_ROWS = 12;
    const VIEW_W = 960;
    const VIEW_H = 540;
    const TILE = 40;
    const INVINCIBLE_MS = 1600;
    const CHASE_EVERY = 1100;
    const LONG_PRESS_MS = 420;
    const GRAVITY = 1500;
    const HOLD_GRAVITY = 780;
    const JUMP_VY = -620;
    const MAX_FALL = 900;
    const RUN_SPEED = 240;
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
    let level = null;
    let levelId = 1;
    let inventory = worldApi.emptyInv();
    let tool = 'hand';
    let selectedKind = null;
    let hover = null;
    let session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
    let player = { x: 48, y: 280, w: 32, h: 44, vx: 0, vy: 0, onGround: false, facing: 1 };
    let hp = worldApi.MAX_HP;
    let lastHitAt = -99999;
    let lastGroundedAt = -9999;
    let cameraX = 0;
    let cameraY = 0;
    let creatures = [];
    let holds = { left: false, right: false, jump: false };
    let lastChaseAt = 0;
    let lastTs = 0;
    let press = null;
    let won = false;

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

    function tileSolid(kind) {
        return !worldApi.isPassable(kind) && kind !== 'leaf';
    }

    function buildWorldFromLevel(lv) {
        const cols = Math.max(VIEW_COLS + 4, Math.ceil((lv.width || 1400) / TILE));
        const rows = VIEW_ROWS + 2;
        const grid = [];
        for (let y = 0; y < rows; y += 1) {
            const row = [];
            for (let x = 0; x < cols; x += 1) row.push('air');
            grid.push(row);
        }
        const groundRow = Math.min(rows - 4, Math.max(8, Math.floor((lv.groundY || 400) / TILE)));
        for (let x = 0; x < cols; x += 1) {
            const pit = (x > 8 && x < cols - 4 && x % 17 === 12) || (x > 8 && x < cols - 4 && x % 17 === 13);
            if (pit) {
                grid[rows - 1][x] = 'air';
                continue;
            }
            grid[groundRow][x] = x < 3 ? 'sand' : (x % 11 === 0 ? 'water' : 'grass');
            if (grid[groundRow][x] === 'water') {
                grid[groundRow + 1][x] = 'sand';
            } else {
                grid[groundRow + 1][x] = 'dirt';
                grid[groundRow + 2][x] = 'dirt';
            }
            for (let y = groundRow + 3; y < rows - 1; y += 1) grid[y][x] = 'stone';
            grid[rows - 1][x] = 'bedrock';
            if (x % 9 === 4 && x > 4 && x < cols - 6) {
                if (groundRow - 1 >= 0) grid[groundRow - 1][x] = 'wood';
                if (groundRow - 2 >= 0) grid[groundRow - 2][x] = 'wood';
                if (groundRow - 3 >= 0) {
                    [-1, 0, 1].forEach(function (dx) {
                        const lx = x + dx;
                        if (lx >= 0 && lx < cols && grid[groundRow - 3][lx] === 'air') grid[groundRow - 3][lx] = 'leaf';
                    });
                }
            }
        }
        (lv.platforms || []).forEach(function (p) {
            const x0 = Math.max(0, Math.floor(p.x / TILE));
            const x1 = Math.min(cols - 1, Math.floor((p.x + p.w - 1) / TILE));
            const y = Math.max(2, Math.min(groundRow - 1, Math.floor(p.y / TILE)));
            for (let x = x0; x <= x1; x += 1) {
                if (grid[y][x] === 'air') grid[y][x] = 'grass';
                if (y + 1 < rows && grid[y + 1][x] === 'air') grid[y + 1][x] = 'dirt';
            }
        });
        (lv.crystals || []).forEach(function (c, i) {
            const x = Math.max(2, Math.min(cols - 3, Math.floor(c.x / TILE)));
            const y = Math.min(rows - 3, groundRow + 3 + (i % 2));
            if (grid[y][x] === 'stone') grid[y][x] = 'crystal';
        });
        const exitCol = Math.min(cols - 2, Math.max(10, Math.floor((lv.flag && lv.flag.x ? lv.flag.x : lv.width - 80) / TILE)));
        if (groundRow - 1 >= 0) grid[groundRow - 1][exitCol] = 'wood';
        if (groundRow - 2 >= 0) grid[groundRow - 2][exitCol] = 'plank';
        return { cols: cols, rows: rows, grid: grid, groundRow: groundRow, exitCol: exitCol };
    }

    function spawnPlayer() {
        const x = 2;
        let y = 0;
        for (let yy = 0; yy < world.rows; yy += 1) {
            if (worldApi.isPassable(worldApi.getCell(world, x, yy)) && !worldApi.isPassable(worldApi.getCell(world, x, yy + 1))) {
                y = yy;
                break;
            }
        }
        player.x = x * TILE + 4;
        player.y = y * TILE - (player.h - TILE) - 2;
        player.vx = 0;
        player.vy = 0;
        player.onGround = true;
        player.facing = 1;
        hp = worldApi.MAX_HP;
        lastHitAt = -99999;
        lastGroundedAt = performance.now();
        won = false;
    }

    function spawnActors() {
        const sparkTile = worldApi.spawnCell(world);
        creatures = (level.enemies || []).map(function (e, i) {
            return {
                kind: 'spark',
                x: e.x,
                y: (world.groundRow - 1) * TILE - 4,
                w: 36,
                h: 40,
                dir: e.dir || 1,
                minX: e.minX,
                maxX: e.maxX,
                chase: i === 0
            };
        });
        if (!creatures.length) {
            creatures = [{
                kind: 'spark',
                x: sparkTile.x * TILE,
                y: sparkTile.y * TILE,
                w: 36,
                h: 40,
                dir: 1,
                minX: 200,
                maxX: 700,
                chase: true
            }];
        }
    }

    function enterLevel(id) {
        levelId = Math.max(1, Math.min(levelsApi.count, Number(id) || 1));
        level = levelsApi.get(levelId);
        world = buildWorldFromLevel(level);
        session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
        spawnPlayer();
        spawnActors();
        renderHud();
        renderQuests();
        renderHotbar();
        toast(level.title + ' · 往右走到出口');
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
        if (hud) {
            hud.innerHTML =
                '<span class="chip">阳光 <b>' + w.sunlight + '</b></span>' +
                '<span class="chip">生命 <b>' + hp + '</b>/' + worldApi.MAX_HP + '</span>' +
                '<span class="chip">第 <b>' + levelId + '</b>/' + levelsApi.count + ' 关</span>';
        }
        const bag = document.getElementById('bag-count');
        const coord = document.getElementById('coord-label');
        if (bag) bag.textContent = String(bagTotal());
        if (coord) coord.textContent = Math.round(player.x / TILE) + ', ' + Math.round(player.y / TILE);
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
        if (title) title.textContent = (level ? level.title : '方块关卡') + ' · 走到出口';
        if (count) count.textContent = String(have);
        if (needEl) needEl.textContent = String(need);
        if (status) status.textContent = won ? '通关' : '探险中';
        refreshWallet();
    }

    function renderHotbar() {
        const bar = document.getElementById('hotbar');
        if (!bar) return;
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
                '<small>' + (locked ? '先通前面一关' : (cleared ? '已通关 · 再走一次' : '走到出口通关')) + '</small>';
            if (!locked) card.addEventListener('click', function () { enterLevel(lv.id); });
            box.appendChild(card);
        });
        const q = currentQuest();
        if (q) {
            const have = Math.min(q.need, worldApi.questValue(q, statsNow()));
            const card = document.createElement('div');
            card.className = 'quest-card';
            card.innerHTML = '<strong>' + q.title + '</strong><small>' + q.desc + '</small>' +
                '<div class="quest-bar"><span style="width:' + Math.round((have / q.need) * 100) + '%"></span></div>' +
                '<em>' + have + ' / ' + q.need + '</em>';
            box.appendChild(card);
        }
        const tip = document.getElementById('progress-tip');
        if (tip) tip.textContent = '通关 ' + (progress.clearedLevels || []).length + ' / ' + levelsApi.count;
        refreshWallet();
    }

    function cameraOrigin() {
        const maxX = Math.max(0, world.cols * TILE - VIEW_W);
        const maxY = Math.max(0, world.rows * TILE - VIEW_H);
        cameraX = Math.max(0, Math.min(maxX, player.x - VIEW_W * 0.38));
        cameraY = Math.max(0, Math.min(maxY, player.y - VIEW_H * 0.62));
        return { x: cameraX, y: cameraY };
    }

    function cellAt(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const px = (clientX - rect.left) * (VIEW_W / rect.width) + cameraX;
        const py = (clientY - rect.top) * (VIEW_H / rect.height) + cameraY;
        const x = Math.floor(px / TILE);
        const y = Math.floor(py / TILE);
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
        persistBag();
        checkQuests();
        renderHotbar();
        renderHud();
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
            ctx.drawImage(img, dx + 1, dy + 1, size - 2, size - 2);
            return;
        }
        ctx.fillStyle = FILL[kind] || '#ccc';
        ctx.fillRect(dx + 1, dy + 1, size - 2, size - 2);
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function solidsNear(px, py) {
        const boxes = [];
        const x0 = Math.max(0, Math.floor(px / TILE) - 1);
        const x1 = Math.min(world.cols - 1, Math.floor((px + player.w) / TILE) + 1);
        const y0 = Math.max(0, Math.floor(py / TILE) - 1);
        const y1 = Math.min(world.rows - 1, Math.floor((py + player.h) / TILE) + 1);
        for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
                if (!tileSolid(world.grid[y][x])) continue;
                boxes.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE });
            }
        }
        return boxes;
    }

    function isInvincible(now) {
        return now - lastHitAt < INVINCIBLE_MS;
    }

    function respawnFromVoid() {
        spawnPlayer();
        toast('掉下去了，回到起点。背包还在。');
        refreshWallet();
    }

    function bumpIfNeeded(now) {
        creatures.forEach(function (c) {
            if (!rectsOverlap(player, c)) return;
            if (isInvincible(now)) return;
            lastHitAt = now;
            hp = worldApi.hitMiner(hp, worldApi.BUMP_HP);
            player.vx = player.facing * -120;
            player.vy = -240;
            if (hp <= 0) {
                spawnPlayer();
                toast('没血了，回到起点。背包还在。');
            } else {
                toast('躲开晶晶！掉了 1 点生命。');
            }
            refreshWallet();
        });
    }

    function onClear() {
        if (won) return;
        won = true;
        if ((progress.clearedLevels || []).indexOf(levelId) === -1) progress.clearedLevels.push(levelId);
        if (progress.unlockedLevel < levelId + 1 && levelId < levelsApi.count) progress.unlockedLevel = levelId + 1;
        persistBag();
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: 'level-' + levelId + '-clear',
            amount: level.rewardSun || 12,
            reason: '通关方块第' + levelId + '关'
        });
        if (bridge.grantProgressPoints) bridge.grantProgressPoints(GAME_ID, 4, 'clear-level-' + levelId);
        if (bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
        toast(award.awarded ? (level.title + '通关 · +' + award.amount + ' 阳光') : (level.title + '通关 · ' + award.reason));
        renderQuests();
        renderHud();
        setTimeout(function () {
            if (levelId < levelsApi.count) enterLevel(levelId + 1);
        }, 1200);
    }

    function tickWorld(now, dt) {
        const speed = RUN_SPEED;
        player.vx = 0;
        if (holds.left) { player.vx -= speed; player.facing = -1; }
        if (holds.right) { player.vx += speed; player.facing = 1; }
        const g = (holds.jump && player.vy < 0) ? HOLD_GRAVITY : GRAVITY;
        player.vy += g * dt;
        if (player.vy > MAX_FALL) player.vy = MAX_FALL;
        if (holds.jump && player.onGround) {
            player.vy = JUMP_VY;
            player.onGround = false;
            lastGroundedAt = -9999;
        }
        player.x += player.vx * dt;
        solidsNear(player.x, player.y).forEach(function (box) {
            if (!rectsOverlap(player, box)) return;
            if (player.vx > 0) player.x = box.x - player.w;
            else if (player.vx < 0) player.x = box.x + box.w;
        });
        player.y += player.vy * dt;
        player.onGround = false;
        solidsNear(player.x, player.y).forEach(function (box) {
            if (!rectsOverlap(player, box)) return;
            if (player.vy >= 0 && player.y + player.h - box.y < Math.max(16, player.vy * dt + 8)) {
                player.y = box.y - player.h;
                player.vy = 0;
                player.onGround = true;
            } else if (player.vy < 0) {
                player.y = box.y + box.h;
                player.vy = 0;
            }
        });
        if (player.onGround) lastGroundedAt = now;
        player.x = Math.max(0, Math.min(world.cols * TILE - player.w, player.x));
        const foot = {
            x: Math.floor((player.x + player.w / 2) / TILE),
            y: Math.floor((player.y + player.h + 2) / TILE)
        };
        if (player.y > world.rows * TILE + 20 || worldApi.isVoid(world, foot.x, Math.min(world.rows - 1, foot.y))) {
            respawnFromVoid();
            return;
        }
        if (now - lastChaseAt >= CHASE_EVERY) {
            lastChaseAt = now;
            creatures = creatures.map(function (c) {
                if (!c.chase) {
                    c.x += c.dir * 48 * (CHASE_EVERY / 1000);
                    if (c.x < c.minX || c.x > c.maxX) c.dir *= -1;
                    return c;
                }
                const actor = { x: Math.floor(c.x / TILE), y: Math.floor(c.y / TILE), kind: 'spark' };
                const target = { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
                const next = worldApi.stepChase(world, actor, target);
                c.x = next.x * TILE;
                c.y = next.y * TILE - 4;
                return c;
            });
        } else {
            creatures.forEach(function (c) {
                if (c.chase) return;
                c.x += c.dir * 48 * dt;
                if (c.x < c.minX || c.x > c.maxX) c.dir *= -1;
            });
        }
        bumpIfNeeded(now);
        const exitX = (world.exitCol || world.cols - 2) * TILE;
        if (!won && player.x + player.w >= exitX) onClear();
    }

    function draw(now) {
        const t = Number(now) || 0;
        const dt = Math.min(0.032, lastTs ? (t - lastTs) / 1000 : 0.016);
        lastTs = t;
        tickWorld(t, dt);
        const cam = cameraOrigin();
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
        if (images.sky) ctx.drawImage(images.sky, 0, 0, VIEW_W, VIEW_H);
        else {
            ctx.fillStyle = '#8fd3f4';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
        const x0 = Math.max(0, Math.floor(cam.x / TILE));
        const y0 = Math.max(0, Math.floor(cam.y / TILE));
        const x1 = Math.min(world.cols - 1, x0 + VIEW_COLS + 1);
        const y1 = Math.min(world.rows - 1, y0 + VIEW_ROWS + 1);
        for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
                const kind = world.grid[y][x];
                const dx = x * TILE - cam.x;
                const dy = y * TILE - cam.y;
                if (kind === 'air') continue;
                drawTile(kind, dx, dy, TILE);
            }
        }
        if (hover) {
            ctx.strokeStyle = selectedKind ? '#f0c14a' : '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(hover.x * TILE - cam.x + 1, hover.y * TILE - cam.y + 1, TILE - 2, TILE - 2);
        }
        creatures.forEach(function (c) {
            const img = images.spark;
            const dx = c.x - cam.x;
            const dy = c.y - cam.y;
            if (img) ctx.drawImage(img, dx, dy, c.w, c.h);
            else {
                ctx.fillStyle = '#7d5cff';
                ctx.fillRect(dx, dy, c.w, c.h);
            }
        });
        const flash = isInvincible(t) && Math.floor(t / 120) % 2 === 0;
        if (!flash) {
            const img = images.miner;
            const dx = player.x - cam.x;
            const dy = player.y - cam.y;
            if (img) {
                ctx.save();
                if (player.facing < 0) {
                    ctx.translate(dx + player.w, dy);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, player.w, player.h);
                } else ctx.drawImage(img, dx, dy, player.w, player.h);
                ctx.restore();
            } else {
                ctx.fillStyle = '#f4d27a';
                ctx.fillRect(dx, dy, player.w, player.h);
            }
        }
        const exitX = (world.exitCol || world.cols - 2) * TILE - cam.x;
        ctx.fillStyle = 'rgba(255, 235, 59, .85)';
        ctx.fillRect(exitX + 8, 8, 6, 36);
        ctx.fillStyle = '#fffde7';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('出口', exitX - 6, 58);
        requestAnimationFrame(draw);
    }

    function setHold(name, on) {
        if (!Object.prototype.hasOwnProperty.call(holds, name)) return;
        holds[name] = !!on;
    }

    function resetHome() {
        enterLevel(levelId);
        toast('本关重来，背包还在。');
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
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', resetHome);
        const hudRefresh = document.getElementById('hud-refresh');
        if (hudRefresh) hudRefresh.addEventListener('click', resetHome);
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
        try {
            renderHotbar();
            renderHud();
            renderQuests();
            toast('横版过关：D 往右跑，空格跳，走到黄色出口。左键挖，右键放。');
        } catch (err) {}
        requestAnimationFrame(draw);
    });
}());
