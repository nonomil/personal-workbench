(function () {
    'use strict';

    /**
     * 横版引擎 kubo-sandbox；视觉 Paper Minecraft（DS-Scratch-我的世界.md）。
     */
    const bridge = window.WorkbenchGameBridge;
    const sfx = window.WorkbenchGameSfx;
    const worldApi = window.VoxelWorld;
    const questsApi = window.VoxelQuests;
    const levelsApi = window.VoxelLevels;
    const GAME_ID = 'voxel-adventure';
    const USE_TOOL_GATE = true;
    const COMPANION_IMG = '../../assets/generated/preschool-theme-assets/voxel-v1/published/voxel-companion.png';
    const TILE = 32;
    const WORLD_COLS = 220;
    const WORLD_ROWS = 28;
    const GROUND_ROW = 24;
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
    let playMods = { mode: 'easy', label: '简单', literacyKnown: 0, enemySpeed: 0.75, chaseMs: 1400, sunMult: 1, extraMob: false };

    function refreshPlayMods() {
        if (bridge.getPlayMods) playMods = bridge.getPlayMods();
        return playMods;
    }

    function scaledSun(base) {
        return Math.max(1, Math.round(Number(base || 0) * (playMods.sunMult || 1)));
    }

    function nearestVoxelGoal(meta, quests, questsDone) {
        const done = Array.isArray(questsDone) ? questsDone : [];
        const nextQuest = (Array.isArray(quests) ? quests : []).find(function (q) {
            return q && !q.daily && done.indexOf(q.id) === -1;
        }) || null;
        const nextBadge = (meta && Array.isArray(meta.badges) ? meta.badges : []).find(function (b) {
            return b && !b.unlocked;
        }) || null;
        const questRemain = nextQuest ? 1 : Infinity;
        let badgeRemain = Infinity;
        if (nextBadge) {
            const m = /(\d+)/.exec(nextBadge.desc || nextBadge.title || '');
            const need = m ? Number(m[1]) : 0;
            const have = Number(meta && meta.voxelQuests) || 0;
            badgeRemain = need > 0 ? Math.max(1, need - have) : 1;
        }
        if (!nextQuest && !nextBadge) return '所有任务和里程碑都完成啦，继续自由建造吧！';
        if (questRemain <= badgeRemain && nextQuest) {
            return '下一个目标：' + nextQuest.title + ' · ' + (nextQuest.desc || '还差 1 个任务');
        }
        return '下一个目标：' + nextBadge.title + ' · 还差 ' + badgeRemain + ' 个任务';
    }

    function buildQuestSummary(input) {
        const data = input || {};
        const meta = data.meta || {};
        const points = Number(meta.adventurePoints) || 0;
        const need = meta.nextRank ? (Number(meta.nextRank.need) || points) : points;
        let gain = '';
        if (data.sunCapped) {
            gain = '本任务所得：今日阳光已达上限';
        } else {
            gain = '本任务所得：阳光 +' + (Number(data.sunAwarded) || 0);
            if (data.questTitle) gain += ' · ' + data.questTitle;
        }
        return {
            gain: gain,
            progressLabel: '冒险等级 Lv.' + (meta.adventureLevel || 1) + ' ' + (meta.adventureTitle || '') + ' · ' + points + '/' + need,
            progressPercent: need > 0 ? Math.min(100, Math.round(points / need * 100)) : 100,
            nextGoal: nearestVoxelGoal(meta, data.quests, data.questsDone)
        };
    }

    const COMPANION_LINES = {
        welcome: [
            '先放几块草，把家门口铺平。',
            '带上镐，去收集晶体吧。',
            '搭一点小路，基地会越来越好看。'
        ],
        quest: [
            '搭得真整齐，阳光也进账啦。',
            '收集完成！这块晶体亮闪闪。',
            '放下去的方块都站稳了，真棒。',
            '又搭好一截，星芒给你鼓掌。'
        ],
        daily: [
            '今天的活干完啦',
            '今日收集任务完成，收工回家。',
            '今天又放了好多块，基地更热闹了。'
        ],
        streak: [
            '连续三天都把今日活干完，星芒要给你戴小旗。',
            '三天连着搭建收集，你已经是工地小队长了。'
        ]
    };

    function companionLine(kind, pick) {
        const pool = COMPANION_LINES[kind] || COMPANION_LINES.quest || [];
        if (!pool.length) return '';
        const index = typeof pick === 'number' ? (Math.abs(Math.floor(pick)) % pool.length) : Math.floor(Math.random() * pool.length);
        return String(pool[index]);
    }

    function onRankUp(prevRank, nextRank, lastCelebratedRank) {
        const next = Number(nextRank) || 0;
        const prev = Number(prevRank) || 1;
        const last = Number(lastCelebratedRank) || 1;
        if (next <= 1 || next <= last || next <= prev) return null;
        const titles = { 2: '草地旅人', 3: '石匠学徒', 4: '晶体猎手', 5: '方块大师' };
        return {
            rank: next,
            title: titles[next] || '矿工',
            ability: '继续挖，更深的矿层在等你'
        };
    }

    function countDailyStreak(questsDone, todayStr) {
        const done = Array.isArray(questsDone) ? questsDone : [];
        let streak = 0;
        const day = String(todayStr || '').slice(0, 10);
        if (!day) return 0;
        const start = new Date(day + 'T12:00:00');
        for (let i = 0; i < 7; i += 1) {
            const d = new Date(start);
            d.setDate(start.getDate() - i);
            const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const hit = done.some(function (id) { return String(id).indexOf('daily:' + key + ':') === 0; });
            if (!hit) break;
            streak += 1;
        }
        return streak;
    }

    function sayCompanion(text) {
        const el = document.getElementById('companion-say');
        if (!el || !text) return;
        el.textContent = text;
        el.classList.add('is-on');
        clearTimeout(sayCompanion._t);
        sayCompanion._t = setTimeout(function () { el.classList.remove('is-on'); }, 3200);
    }

    function showSettleLayer(lines) {
        const layer = document.getElementById('settle-layer');
        if (!layer) return;
        const gain = document.getElementById('settle-gain');
        const progress = document.getElementById('settle-progress-label');
        const bar = document.getElementById('settle-bar-fill');
        const goal = document.getElementById('settle-goal');
        const talk = document.getElementById('settle-companion');
        if (gain) gain.textContent = lines.gain || '';
        if (progress) progress.textContent = lines.progressLabel || '';
        if (bar) bar.style.width = (Number(lines.progressPercent) || 0) + '%';
        if (goal) goal.textContent = lines.nextGoal || '';
        if (talk) talk.textContent = lines.companion || '';
        layer.classList.remove('is-hidden');
        if (sfx && sfx.clear) sfx.clear();
    }

    function hideSettleLayer() {
        const layer = document.getElementById('settle-layer');
        if (layer) layer.classList.add('is-hidden');
    }

    function showRankUpCard(card) {
        const layer = document.getElementById('celebrate-layer');
        if (!layer || !card) return;
        const title = document.getElementById('celebrate-title');
        const sub = document.getElementById('celebrate-sub');
        if (title) title.textContent = '升到 ' + card.title;
        if (sub) sub.textContent = card.ability;
        layer.classList.remove('is-hidden');
        if (sfx && sfx.rankUp) sfx.rankUp();
    }

    function hideRankUpCard() {
        const layer = document.getElementById('celebrate-layer');
        if (layer) layer.classList.add('is-hidden');
    }

    const LONG_PRESS_MS = 420;
    const pixels = window.VoxelPixelTiles;

    /* 2d-minecraft（zlib）16×16 贴图：kind/工具 → 文件；无贴图的 kind 走 pixel-tiles 回退 */
    const MC_DIR = './assets/mc/';
    const MC_TEXTURES = {
        grass: 'blocks/grass-block.png',
        dirt: 'blocks/dirt.png',
        stone: 'blocks/stone.png',
        wood: 'blocks/oak-log.png',
        leaf: 'blocks/oak-leaves.png',
        plank: 'blocks/oak-planks.png',
        coal: 'blocks/coal-ore.png',
        crystal: 'blocks/diamond-ore.png',
        wood_pick: 'items/wooden-pickaxe.png',
        stone_pick: 'items/stone-pickaxe.png',
        stick: 'items/stick.png'
    };
    const MC_DESTROY_STAGES = [0, 2, 4, 6, 8, 9].map(function (n) {
        return MC_DIR + 'blocks/destroy_stage_' + n + '.png';
    });

    function mcIcon(id) {
        const file = MC_TEXTURES[id];
        return file ? '<img class="hotbar-pixel mc-icon" src="' + MC_DIR + file + '" alt="">' : '';
    }

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
        idle: './assets/hero/explorer-idle.png?v=20260814-steve-v2',
        walkA: './assets/hero/explorer-walk-a.png?v=20260814-steve-v2',
        walkB: './assets/hero/explorer-walk-b.png?v=20260814-steve-v2',
        jump: './assets/hero/explorer-jump.png?v=20260814-steve-v2',
        mine: './assets/hero/explorer-mine.png?v=20260814-steve-v2'
    };
    const SPARK = {
        idle: './assets/enemies/spark-idle.png',
        walkA: './assets/enemies/spark-walk-a.png'
    };
    const ENEMY_ART = {
        spark: { idle: 'sparkIdle', walk: 'sparkWalkA', sw: 56, sh: 56, label: '晶晶' },
        slime: { idle: 'slimeIdle', sw: 52, sh: 48, label: '史莱姆', bounce: true },
        shroom: { idle: 'shroomIdle', sw: 52, sh: 56, label: '蘑菇仔' },
        spider: { idle: 'spiderIdle', sw: 56, sh: 40, label: '蜘蛛', climb: true },
        golem: { idle: 'golemIdle', sw: 56, sh: 56, label: '石傀儡' },
        bat: { idle: 'batIdle', sw: 56, sh: 44, label: '蝙蝠', fly: true, bounce: true },
        bee: { idle: 'beeIdle', sw: 52, sh: 48, label: '蜜蜂', fly: true, bounce: true },
        snowman: { idle: 'snowmanIdle', sw: 56, sh: 76, label: '雪人' },
        fire: { idle: 'fireSpiritIdle', sw: 52, sh: 52, label: '火焰精灵', fly: true, bounce: true },
        cactus: { idle: 'cactusMonsterIdle', sw: 52, sh: 56, label: '仙人掌' },
        ghost: { idle: 'ghostIdle', sw: 52, sh: 52, label: '幽灵', fly: true, bounce: true },
        creeper: { idle: 'creeperIdle', sw: 48, sh: 64, label: '绿爆爆' }
    };
    const BOX = { golem: { w: 48, h: 56 } };
    const SPRITE_W = 64;
    const SPRITE_H = 80;
    const SPARK_W = 56;
    const SPARK_H = 56;
    const SPARK_HOP_MS = 280;
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
            surface = Math.max(20, Math.min(WORLD_ROWS - 3, surface));
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
        const lv = levelsApi.get(levelId);
        const region = levelsApi.getRegion(lv && lv.region);
        const kinds = (region && region.mobs && region.mobs.length) ? region.mobs : ['slime'];
        const spots = playMods.extraMob ? [36, 88, 132, 176] : [36, 88, 132];
        creatures = spots.map(function (tileX, i) {
            const kind = kinds[i % kinds.length];
            const g = worldApi.applyGravity(world, tileX, 8);
            const box = BOX[kind] || { w: 40, h: 40 };
            const facing = i % 2 === 0 ? 1 : -1;
            return {
                kind: kind,
                x: g.x * TILE,
                y: g.y * TILE - 8,
                w: box.w,
                h: box.h,
                facing: facing,
                hopUntil: 0,
                chase: kind === 'spark',
                climbDir: kind === 'spider' ? { x: facing, y: 0 } : undefined
            };
        });
    }

    function enterLevel(id) {
        refreshPlayMods();
        levelId = Math.max(1, Math.min(levelsApi.count, Number(id) || 1));
        generateWorld(levelId);
        session = { placedThis: {}, placedAnyThis: 0, collectedThis: {} };
        resetPlayer(true);
        spawnActors();
        renderHud();
        renderQuests();
        renderHotbar();
        showPlay();
        const lv = levelsApi.get(levelId);
        const titleEl = document.getElementById('level-title');
        if (titleEl) titleEl.textContent = '第 ' + levelId + ' 关 · ' + (lv && lv.title ? lv.title : '');
        const goalEl = document.getElementById('goal-label');
        if (goalEl) goalEl.textContent = lv && lv.goal
            ? ((lv.goal.label || lv.goal.type) + ' ' + lv.goal.count + ' + 出口')
            : '走到出口通关';
        toast((lv && lv.title ? lv.title : '第 ' + levelId + ' 关') + ' · 识字 ' + playMods.literacyKnown + ' · ' + playMods.label + '模式');
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
        if (!Number.isFinite(progress.lastCelebratedRank)) progress.lastCelebratedRank = progress.rank || 1;
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

    function captureHomeSnapshot() {
        const today = questsApi && questsApi.localDate ? questsApi.localDate() : '';
        progress.homeSnapshot = worldApi.makeHomeSnapshot
            ? worldApi.makeHomeSnapshot(world, today)
            : { date: today, blocks: worldApi.countSolid(world), grid: [] };
        return progress.homeSnapshot;
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
            blocksAlive: worldApi.countSolid(world),
            blueprintCoverage: (function () {
                const q = currentQuest();
                return q && q.type === 'blueprint' && worldApi.blueprintCoverage
                    ? worldApi.blueprintCoverage(world, q.blueprint)
                    : 0;
            }())
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
            '<span class="chip">第 <b>' + levelId + '</b>/' + levelsApi.count + ' 关</span>' +
            '<span class="chip">识字 <b>' + (playMods.literacyKnown || 0) + '</b> · ' + playMods.label + '</span>';
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
        const prevRank = Number(progress.rank) || rank();
        progress.questsDone.push(quest.id);
        progress.rank = rank();
        persistBag();
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: quest.daily ? quest.id : ('quest-' + quest.id),
            amount: scaledSun(quest.reward),
            reason: quest.title
        });
        const meta = bridge.getMetaSummary ? bridge.getMetaSummary() : {};
        const talkKind = quest.daily
            ? (countDailyStreak(progress.questsDone, questsApi && questsApi.localDate ? questsApi.localDate() : '') >= 3 ? 'streak' : 'daily')
            : 'quest';
        const talk = companionLine(talkKind);
        const lines = buildQuestSummary({
            sunAwarded: award.awarded ? award.amount : 0,
            sunCapped: !award.awarded,
            questTitle: quest.title,
            daily: !!quest.daily,
            meta: meta,
            quests: questsApi && questsApi.list,
            questsDone: progress.questsDone,
            companion: talk
        });
        captureHomeSnapshot();
        persistBag();
        showSettleLayer(lines);
        sayCompanion(talk);
        const card = onRankUp(prevRank, progress.rank, progress.lastCelebratedRank);
        if (card) {
            progress.lastCelebratedRank = progress.rank;
            persistBag();
            showRankUpCard(card);
        }
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
            const icon = mcIcon(t.id) ||
                (pixels && pixels.iconPreviewDataUrl ? '<img class="hotbar-pixel" src="' + pixels.iconPreviewDataUrl(t.id) + '" alt="">' : '');
            btn.innerHTML = icon +
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
            const preview = mcIcon(kind) ||
                (pixels && pixels.tilePreviewDataUrl ? '<img class="hotbar-pixel" src="' + pixels.tilePreviewDataUrl(kind) + '" alt="">' : '');
            const slotKey = String(tools.length + i + 1);
            btn.innerHTML = preview +
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
        const box = document.getElementById('stage-map');
        if (!box) return;
        box.innerHTML = '';
        box.setAttribute('aria-label', levelsApi.count + ' 个区域关卡');
        const countEl = document.getElementById('stage-count');
        if (countEl) countEl.textContent = String(levelsApi.count);
        levelsApi.list.forEach(function (lv) {
            const locked = lv.id > (progress.unlockedLevel || 1);
            const cleared = (progress.clearedLevels || []).indexOf(lv.id) !== -1;
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'stage-card' + (locked ? ' is-locked' : '')
                + (cleared ? ' is-cleared' : '') + (lv.id === levelId && !locked ? ' is-current' : '');
            card.disabled = locked;
            card.setAttribute('aria-label', locked
                ? '第 ' + lv.id + ' 关未解锁'
                : '第 ' + lv.id + ' 关 ' + lv.title);
            const thumb = document.createElement('span');
            thumb.className = 'stage-thumb';
            const num = document.createElement('b');
            num.className = 'stage-num';
            num.textContent = String(lv.id);
            thumb.appendChild(num);
            if (locked) {
                const lock = document.createElement('span');
                lock.className = 'stage-lock';
                lock.setAttribute('aria-hidden', 'true');
                thumb.appendChild(lock);
            }
            card.appendChild(thumb);
            const title = document.createElement('span');
            title.className = 'stage-best';
            title.textContent = locked ? '先通前面一关' : (lv.title + (cleared ? ' ✓' : ''));
            card.appendChild(title);
            if (!locked) card.addEventListener('click', function () { enterLevel(lv.id); });
            box.appendChild(card);
        });
        const tip = document.getElementById('progress-tip');
        if (tip) tip.textContent = '通关 ' + (progress.clearedLevels || []).length + ' / ' + levelsApi.count;
        refreshWallet();
    }

    function showMap() {
        document.body.classList.add('is-picking');
        document.getElementById('panel-map').classList.remove('is-hidden');
        document.getElementById('panel-play').classList.add('is-hidden');
        renderQuests();
    }

    function showPlay() {
        document.body.classList.remove('is-picking');
        document.getElementById('panel-map').classList.add('is-hidden');
        document.getElementById('panel-play').classList.remove('is-hidden');
    }

    function cellAt(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const px = (clientX - rect.left) * (canvas.width / rect.width) + cameraX;
        const py = (clientY - rect.top) * (canvas.height / rect.height) + cameraY;
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
        if (USE_TOOL_GATE && worldApi.rankMineReason) {
            const gate = worldApi.rankMineReason(kind, rank());
            if (gate) {
                toast(gate);
                return false;
            }
        }
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

    function fitCanvas() {
        const box = canvas.getBoundingClientRect();
        if (box.width < 32 || box.height < 32) return;
        const nextH = Math.min(WORLD_ROWS * TILE, Math.max(VIEW_H, Math.round(VIEW_W * (box.height / box.width))));
        if (canvas.width !== VIEW_W || canvas.height !== nextH) {
            canvas.width = VIEW_W;
            canvas.height = nextH;
            ctx.imageSmoothingEnabled = false;
        }
    }

    function updateCamera() {
        fitCanvas();
        cameraX = player.x - canvas.width * 0.42;
        const maxCamX = WORLD_COLS * TILE - canvas.width;
        const maxCamY = WORLD_ROWS * TILE - canvas.height;
        cameraX = Math.round(Math.max(0, Math.min(maxCamX, cameraX)));
        cameraY = Math.round(Math.max(0, maxCamY));
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
            } else {
                const art = ENEMY_ART[c.kind] || ENEMY_ART.spark;
                toast('躲开' + art.label + '！掉了 1 点生命。');
            }
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
            amount: scaledSun((lv && lv.rewardSun) || 12),
            reason: '通关方块第' + levelId + '关'
        });
        toast(award.awarded ? ((lv && lv.title) || '本关') + '通关 · +' + award.amount + ' 阳光' : '通关了');
        renderQuests();
        renderHud();
        setTimeout(function () {
            if (levelId < levelsApi.count) enterLevel(levelId + 1);
            else showMap();
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

    // 蜘蛛：贴地走、爬墙、挂天花板。以自身所在格子判断支撑面，
    // 前方撞墙则垂直爬升，到顶/到底再转回水平；支撑面消失就回头。
    function stepSpider(c) {
        const speed = 1.1 * (playMods.enemySpeed || 1);
        const tx = Math.floor((c.x + c.w / 2) / TILE);
        const ty = Math.floor((c.y + c.h / 2) / TILE);
        const below = isSolidAt(tx, ty + 1);
        const above = isSolidAt(tx, ty - 1);
        const left = isSolidAt(tx - 1, ty);
        const right = isSolidAt(tx + 1, ty);
        const dir = c.climbDir || { x: 1, y: 0 };

        if (dir.x !== 0) {
            if (isSolidAt(tx + dir.x, ty)) {
                c.climbDir = { x: 0, y: -1 };
                return;
            }
            if (!below && !above) {
                c.climbDir = { x: -dir.x, y: 0 };
                return;
            }
            if (below) c.y = (ty + 1) * TILE - c.h;
            else c.y = ty * TILE;
            c.x += dir.x * speed;
            c.facing = dir.x;
            return;
        }

        const vy = dir.y === -1 ? -1 : 1;
        if (isSolidAt(tx, ty + vy)) {
            if (left && right) { c.climbDir = { x: 0, y: -vy }; return; }
            c.climbDir = { x: c.facing || 1, y: 0 };
            return;
        }
        if (right) c.x = (tx + 1) * TILE - c.w;
        else if (left) c.x = tx * TILE;
        else { c.climbDir = { x: c.facing || 1, y: 0 }; return; }
        c.y += vy * speed;
    }

    function tickWorld(now) {
        tickMine(now);
        updatePlayer();
        creatures.forEach(function (c) {
            if (c.kind === 'spark') return;
            const art = ENEMY_ART[c.kind] || ENEMY_ART.spark;
            if (art.climb) {
                stepSpider(c);
                return;
            }
            const speed = (c.kind === 'slime' || c.kind === 'golem' ? 0.85 : 1.1) * (playMods.enemySpeed || 1);
            c.x += (c.facing || 1) * speed;
            if (rectIntersectsSolid(c.x, c.y, c.w, c.h)) {
                c.facing = -(c.facing || 1);
                c.x += c.facing * speed * 2;
            }
            if (art.fly) return;
            if (!rectIntersectsSolid(c.x, c.y + 1, c.w, c.h)) {
                c.y += 2.2;
                if (rectIntersectsSolid(c.x, c.y, c.w, c.h)) {
                    c.y = Math.floor((c.y + c.h - 1) / TILE) * TILE - c.h;
                }
            }
        });
        if (now - lastChaseAt >= (playMods.chaseMs || CHASE_EVERY)) {
            lastChaseAt = now;
            creatures = creatures.map(function (c) {
                if (c.kind !== 'spark') return c;
                const actor = { x: Math.floor(c.x / TILE), y: Math.floor(c.y / TILE), kind: 'spark' };
                const target = { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
                const next = worldApi.stepChase(world, actor, target);
                const nx = next.x * TILE;
                const ny = next.y * TILE - 8;
                if (nx !== c.x) c.facing = nx < c.x ? -1 : 1;
                if (nx !== c.x || ny !== c.y) c.hopUntil = now + SPARK_HOP_MS;
                c.x = nx;
                c.y = ny;
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
        const tex = MC_TEXTURES[kind] ? images['tex_' + kind] : null;
        if (tex) {
            ctx.drawImage(tex, x, y, TILE, TILE);
            return;
        }
        // 地砖一律静止帧(水面不播动画)
        if (pixels && pixels.drawTile(ctx, kind, x, y, TILE, 0)) return;
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
        const pickTex = images['tex_' + ((tool === 'stone_pick') ? 'stone_pick' : 'wood_pick')];
        if (pickTex) ctx.drawImage(pickTex, -18, -30, 36, 36);
        else if (pixels) pixels.drawSprite(ctx, 'wood_pick', -8, -28, 36, 36, 0);
        ctx.restore();
    }

    function drawMineFx(now) {
        if (mineAct) {
            const age = now - mineAct.start;
            const x = Math.round(mineAct.cellX * TILE - cameraX);
            const y = Math.round(mineAct.cellY * TILE - cameraY);
            if (age >= MINE_WINDUP) {
                // 挖掘裂纹：按进度叠 destroy_stage 贴图（2d-minecraft 的 0..9 取 6 帧）
                const t = Math.min(1, (age - MINE_WINDUP) / Math.max(1, MINE_END - MINE_WINDUP));
                const stage = images['destroy' + Math.min(MC_DESTROY_STAGES.length - 1, Math.floor(t * MC_DESTROY_STAGES.length))];
                if (stage) {
                    ctx.drawImage(stage, x, y, TILE, TILE);
                } else {
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

    function sparkPose(c, now) {
        if (c.hopUntil && now < c.hopUntil) return 'sparkWalkA';
        return (Math.floor(now / 320) % 2 === 0) ? 'sparkIdle' : (images.sparkWalkA ? 'sparkWalkA' : 'sparkIdle');
    }

    function enemyPose(c, now) {
        const art = ENEMY_ART[c.kind] || ENEMY_ART.spark;
        if (c.kind === 'spark') return sparkPose(c, now);
        return art.idle;
    }

    function drawCreatureSprite(c, now) {
        const art = ENEMY_ART[c.kind] || ENEMY_ART.spark;
        const sw = art.sw || SPARK_W;
        const sh = art.sh || SPARK_H;
        const bob = art.bounce ? Math.round(Math.sin((Number(now) || 0) / 180) * 3) : 0;
        const dx = Math.round(c.x - cameraX + (c.w - sw) / 2);
        const dy = Math.round(c.y - cameraY + c.h - sh - bob);
        const pose = enemyPose(c, now);
        const img = images[pose];
        if (img) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            if (c.facing < 0) {
                ctx.translate(dx + sw, dy);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, sw, sh);
            } else {
                ctx.drawImage(img, dx, dy, sw, sh);
            }
            ctx.restore();
            return;
        }
        const frame = Math.floor((Number(now) || 0) / 180) % 3;
        if (pixels) {
            pixels.drawSprite(ctx, 'spark', dx, dy, sw, sh, frame);
            return;
        }
        ctx.fillStyle = '#7d5cff';
        ctx.fillRect(dx, dy, c.w, c.h);
    }

    function regionSky() {
        const region = levelsApi.getRegion(world && world.region);
        return region || { sky: 'day' };
    }

    function horizonScreenY() {
        let topSolid = WORLD_ROWS;
        const startCol = Math.max(0, Math.floor(cameraX / TILE));
        const endCol = Math.min(WORLD_COLS - 1, Math.ceil((cameraX + canvas.width) / TILE));
        for (let x = startCol; x <= endCol; x += 1) {
            for (let y = 0; y < WORLD_ROWS; y += 1) {
                const kind = world.grid[y][x];
                if (kind && kind !== 'air' && kind !== 'water') {
                    if (y < topSolid) topSolid = y;
                    break;
                }
            }
        }
        if (topSolid >= WORLD_ROWS) topSolid = GROUND_ROW;
        return Math.round(topSolid * TILE - cameraY);
    }

    function drawSky() {
        ctx.fillStyle = '#4a4642';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const info = regionSky();
        const hy = Math.max(0, Math.min(canvas.height, horizonScreenY()));
        if (hy <= 0) return;
        const key = info.sky === 'dusk' ? 'skyDusk' : 'skyDay';
        const img = images[key] || images.skyDay;
        if (img) {
            const srcH = Math.max(1, Math.round(img.height * 0.34));
            const shift = Math.round(cameraX * 0.06) % canvas.width;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(img, 0, 0, img.width, srcH, -shift, 0, canvas.width, hy);
            ctx.drawImage(img, 0, 0, img.width, srcH, canvas.width - shift, 0, canvas.width, hy);
        } else {
            ctx.fillStyle = info.sky === 'dusk' ? '#8a6a7a' : '#7aa7c8';
            ctx.fillRect(0, 0, canvas.width, hy);
        }
        const veil = {
            warm: 'rgba(255,168,72,0.1)',
            cave: 'rgba(18,14,36,0.38)',
            cold: 'rgba(210,228,255,0.1)',
            ember: 'rgba(90,18,8,0.22)',
            void: 'rgba(24,10,48,0.4)'
        }[info.veil];
        if (veil) {
            ctx.fillStyle = veil;
            ctx.fillRect(0, 0, canvas.width, hy);
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
        if (document.getElementById('panel-play').classList.contains('is-hidden')) {
            requestAnimationFrame(draw);
            return;
        }
        const t = Number(now) || 0;
        frameCount += 1;
        tickWorld(t);
        drawSky();
        const worldBottom = WORLD_ROWS * TILE - cameraY;
        if (worldBottom < canvas.height) {
            ctx.fillStyle = '#2b2420';
            ctx.fillRect(0, Math.max(0, worldBottom), canvas.width, canvas.height - worldBottom);
        }
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
        window.addEventListener('resize', function () {
            updateCamera();
        });
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', function () { enterLevel(levelId); });
        const hudRefresh = document.getElementById('hud-refresh');
        if (hudRefresh) hudRefresh.addEventListener('click', function () { enterLevel(levelId); });
        const homeShot = document.getElementById('home-shot-btn');
        if (homeShot) homeShot.addEventListener('click', function () {
            const snap = captureHomeSnapshot();
            persistBag();
            toast('家园已拍照 · ' + (snap.blocks || 0) + ' 块');
            sayCompanion('这块家园，带回去给家长看。');
        });
        const mapBtn = document.getElementById('map-btn');
        if (mapBtn) mapBtn.addEventListener('click', showMap);

        // 方块工坊(游戏内):小卖部/合成台/背包/家长锁
        const workshopOverlay = document.getElementById('workshop-overlay');
        let workshopTab = 'shop';

        function renderWorkshopPanel() {
            const api = window.VoxelWorkshop;
            if (!workshopOverlay || !api || typeof api.renderGamePanel !== 'function') return;
            workshopOverlay.innerHTML = api.renderGamePanel(workshopTab);
        }

        function closeWorkshop() {
            if (!workshopOverlay) return;
            workshopOverlay.classList.add('is-hidden');
            inventory = Object.assign(worldApi.emptyInv(), progress.inventory || {});
            renderHotbar();
            renderHud();
        }

        const workshopBtn = document.getElementById('workshop-btn');
        if (workshopBtn) workshopBtn.addEventListener('click', function () {
            workshopTab = 'shop';
            renderWorkshopPanel();
            if (workshopOverlay) workshopOverlay.classList.remove('is-hidden');
        });
        if (workshopOverlay) {
            workshopOverlay.addEventListener('click', function (e) {
                if (e.target === workshopOverlay) { closeWorkshop(); return; }
                const target = e.target.closest ? e.target.closest('[data-action]') : null;
                if (!target) return;
                const action = target.getAttribute('data-action');
                const api = window.VoxelWorkshop;
                if (action === 'voxel-workshop-close') { closeWorkshop(); return; }
                if (action === 'voxel-workshop-tab') {
                    workshopTab = target.getAttribute('data-tab') || 'shop';
                    renderWorkshopPanel();
                    return;
                }
                if (!api) return;
                if (action === 'voxel-buy') {
                    const r = api.buy(target.getAttribute('data-item'));
                    toast(r && r.reason ? r.reason : '买不了');
                    if (r && r.ok) renderWorkshopPanel();
                } else if (action === 'voxel-craft') {
                    const r = api.craft(target.getAttribute('data-recipe'));
                    toast(r && r.reason ? r.reason : '合成不了');
                    if (r && r.ok) renderWorkshopPanel();
                } else if (action === 'voxel-parent-lock') {
                    const r = api.toggleLock();
                    toast(r && r.reason ? r.reason : '家长锁');
                    renderWorkshopPanel();
                }
            });
            window.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && !workshopOverlay.classList.contains('is-hidden')) closeWorkshop();
            });
        }
        const settleClose = document.getElementById('settle-close-btn');
        if (settleClose) settleClose.addEventListener('click', hideSettleLayer);
        const celebrateClose = document.getElementById('celebrate-close-btn');
        if (celebrateClose) celebrateClose.addEventListener('click', hideRankUpCard);
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
    levelId = Math.max(1, Math.min(levelsApi.count, progress.unlockedLevel || 1));
    if (bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
    bind();
    showMap();
    Promise.all([
        loadImage('idle', HERO.idle),
        loadImage('walkA', HERO.walkA),
        loadImage('walkB', HERO.walkB),
        loadImage('jump', HERO.jump),
        loadImage('mine', HERO.mine),
        loadImage('sparkIdle', SPARK.idle),
        loadImage('sparkWalkA', SPARK.walkA),
        loadImage('slimeIdle', './assets/enemies/slime-idle.png'),
        loadImage('shroomIdle', './assets/enemies/shroom-idle.png'),
        loadImage('spiderIdle', './assets/enemies/spider.png'),
        loadImage('golemIdle', './assets/enemies/golem.png'),
        loadImage('batIdle', './assets/enemies/bat-idle.png'),
        loadImage('beeIdle', './assets/enemies/bee-idle.png'),
        loadImage('snowmanIdle', './assets/enemies/snowman-idle.png'),
        loadImage('fireSpiritIdle', './assets/enemies/fire-spirit-idle.png'),
        loadImage('cactusMonsterIdle', './assets/enemies/cactus-monster.png'),
        loadImage('ghostIdle', './assets/enemies/ghost.png'),
        loadImage('creeperIdle', './assets/enemies/green-boom.png'),
        loadImage('skyDay', './assets/bg/sky-day.png'),
        loadImage('skyDusk', './assets/bg/sky-dusk.png')
    ].concat(Object.keys(MC_TEXTURES).map(function (id) {
        return loadImage('tex_' + id, MC_DIR + MC_TEXTURES[id]);
    })).concat(MC_DESTROY_STAGES.map(function (src, i) {
        return loadImage('destroy' + i, src);
    }))).then(function () {
        try {
            renderHotbar();
            renderHud();
            renderQuests();
            toast('A/D 跑，空格跳，左键挖，右键放。');
            sayCompanion(companionLine('welcome'));
        } catch (err) {}
        requestAnimationFrame(draw);
    });
}());
