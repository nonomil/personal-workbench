(function () {
    'use strict';

    const bridge = window.WorkbenchGameBridge;
    const gameSfx = window.WorkbenchGameSfx;
    const levelsApi = window.PlatformLevels;
    const pixels = window.VoxelPixelTiles;
    const decor = window.PlatformPixelDecor;
    const GAME_ID = 'platform-quest';

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    const VIEW_W = 960;
    const VIEW_H = 480;
    const qaParams = new URLSearchParams(location.search);
    const qaEnabled = qaParams.has('qa');
    const qaAuto = qaParams.get('qa') === 'run';
    let qaJumpUntil = 0;
    // 与 refs/mahmodnasser-mario CONFIG.TILE_SIZE 一致：平台按 32 正方格铺，不整条碎
    const TILE_SIZE = 40;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    // Paper-MC 家族贴图:水管工主角(world-rebuild 批次三帧) + 同批小怪,地砖由 pixel-tiles.js 代码绘制
    // 主角帧缺失时回退到跳跳侠 4 帧,再回退旧探险家帧,保证离线可玩
    const LOCAL = './assets/';
    const SPRITE_V = '?v=20260815-cast-v2';
    const ASSET = {
        idle: LOCAL + 'hero/hero-idle.png' + SPRITE_V,
        walkA: LOCAL + 'hero/hero-run-1.png' + SPRITE_V,
        walkB: LOCAL + 'hero/hero-run-2.png' + SPRITE_V,
        walkC: LOCAL + 'hero/hero-run-3.png' + SPRITE_V,
        walkD: LOCAL + 'hero/hero-run-4.png' + SPRITE_V,
        jump: LOCAL + 'hero/hero-jump.png' + SPRITE_V,
        idleLegacy: LOCAL + 'hero/jumper-idle.png',
        walkALegacy: LOCAL + 'hero/jumper-walk-a.png',
        walkBLegacy: LOCAL + 'hero/jumper-walk-b.png',
        jumpLegacy: LOCAL + 'hero/jumper-jump.png',
        'sky-day': LOCAL + 'bg/sky-day.png?v=20260814-mario-sky-v1',
        'sky-sunset': LOCAL + 'bg/sky-sunset.png?v=20260814-mario-sky-v1',
        'sky-night': LOCAL + 'bg/sky-night.png?v=20260814-mario-sky-v1',
        'enemy-shroom': LOCAL + 'enemies/shroom-walk-a.png' + SPRITE_V,
        'enemy-shroom-b': LOCAL + 'enemies/shroom-walk-b.png' + SPRITE_V,
        'enemy-shroom-c': LOCAL + 'enemies/shroom-walk-c.png' + SPRITE_V,
        'enemy-shroom-idle': LOCAL + 'enemies/shroom-idle.png',
        'enemy-slime': LOCAL + 'enemies/enemy-slime.png',
        'enemy-bat': LOCAL + 'enemies/bat-idle.png',
        'enemy-beetle': LOCAL + 'enemies/beetle-walk-a.png' + SPRITE_V,
        'enemy-beetle-b': LOCAL + 'enemies/beetle-walk-b.png' + SPRITE_V,
        'enemy-beetle-c': LOCAL + 'enemies/beetle-walk-c.png' + SPRITE_V,
        'enemy-leaf': LOCAL + 'enemies/leaf-walk-a.png' + SPRITE_V,
        'enemy-leaf-b': LOCAL + 'enemies/leaf-walk-b.png' + SPRITE_V,
        'enemy-leaf-c': LOCAL + 'enemies/leaf-walk-c.png' + SPRITE_V,
        'enemy-shell': LOCAL + 'enemies/beetle-shell.png' + SPRITE_V,
        'enemy-plant': LOCAL + 'enemies/plant-up.png' + SPRITE_V,
        'enemy-plant-b': LOCAL + 'enemies/plant-bob.png' + SPRITE_V
    };

    const images = {};
    let progress = null;
    let level = null;
    let levelId = 1;
    let skyKey = 'sky-day';
    let enemyKey = 'enemy-shroom';
    let playing = false;
    let won = false;
    let awarding = false;
    let startTime = 0;
    let coins = 0;
    let cameraX = 0;
    let cameraTarget = 0;
    let last = 0;
    let pops = [];
    let floats = [];
    let debris = [];
    let fireworks = [];
    let climbingFlag = false;
    let stompCombo = 0;
    let lastStompAt = -9999;

    const player = {
        x: 48, y: 320, w: 40, h: 52,
        vx: 0, vy: 0, onGround: false, facing: 1,
        pose: 'idle', runFrame: 0, runTimer: 0
    };
    const input = { left: false, right: false, jumpHeld: false, run: false, down: false };
    const phy = window.PlatformPhysics || {
        GRAVITY: 1500, HOLD_GRAVITY: 780, JUMP_VY: -560, AIR_JUMP_VY: -520, MAX_FALL: 900,
        RUN_SPEED: 240, SPRINT_SPEED: 340, ENEMY_SPEED: 48,
        COYOTE_MS: 120, JUMP_BUFFER_MS: 120, INVINCIBLE_MS: 3000, MAX_AIR_JUMPS: 1,
        START_HEARTS: 5, STAR_INVINCIBLE_MS: 8000, COIN_LIFE_MILESTONE: 100, FRICTION: 0.82,
        tryJump: function (now, g, j, c, b) { return (now - g) <= (c || 120) && (now - j) <= (b || 120); },
        isInvincible: function (now, hit, ms) { return hit >= 0 && now - hit < (ms || 3000); },
        canAirJump: function (used, max) { return (used || 0) < (max || 1); }
    };
    let lastGroundedAt = -9999;
    let lastJumpPressedAt = -9999;
    let jumpConsumedAt = -9999;
    let lastHitAt = -9999;
    let starUntil = -1;
    let hearts = 5;
    let pickups = [];
    let airJumpsUsed = 0;
    let lastSafeX = 48;
    let lastSafeY = 320;
    let playerPowered = false;
    let playerCanThrow = false;
    let heldCube = false;
    let shots = [];
    let lastThrowAt = -9999;
    let scene = 'over';
    let overSnap = null;
    let overReturnX = 80;
    let underCoins = [];

    const USE_PLAY_MODS = true;
    let playMods = { mode: 'easy', label: '简单', enemySpeed: 1, sunMult: 1, extraMob: false };
    let lastCompanionAt = -1;

    function refreshPlayMods() {
        if (USE_PLAY_MODS && bridge && typeof bridge.getPlayMods === 'function') {
            playMods = bridge.getPlayMods() || playMods;
        }
        return playMods;
    }

    function canJump(state, now, opts) {
        const coyote = opts && opts.coyoteMs != null ? Number(opts.coyoteMs) : 120;
        const buffer = opts && opts.bufferMs != null ? Number(opts.bufferMs) : 120;
        const groundedAgo = now - (state && state.lastGroundedAt);
        const pressedAgo = now - (state && state.lastJumpPressedAt);
        return groundedAgo >= 0 && groundedAgo <= coyote && pressedAgo >= 0 && pressedAgo <= buffer;
    }

    function jumpVelocity(held) {
        return -620;
    }

    function jumpHeight(held) {
        let vy = jumpVelocity(held);
        let y = 0;
        let minY = 0;
        const dt = 1 / 60;
        const GRAVITY = 1500;
        const HOLD_GRAVITY = 780;
        for (let i = 0; i < 180; i += 1) {
            const g = (held && vy < 0) ? HOLD_GRAVITY : GRAVITY;
            vy += g * dt;
            y += vy * dt;
            if (y < minY) minY = y;
            if (i > 2 && y >= 0) break;
        }
        return -minY;
    }

    function normalizePlatform(p) {
        const plat = Array.isArray(p)
            ? { x: p[0], y: p[1], w: p[2], h: p[3] }
            : Object.assign({}, p);
        if (!plat.mv && plat.breakable !== false) {
            plat.type = plat.type || 'grass';
            plat.breakable = true;
        }
        plat.broken = !!plat.broken;
        return plat;
    }

    function placeSolidCube(block, tile) {
        const t = Number(tile) || 40;
        const out = Object.assign({}, block || {});
        out.w = t;
        out.h = t;
        if (out.stair || out.breakable === false || out.type === 'ground') return out;
        const walkTop = 400 - 52;
        let y = Math.round(Number(out.y) || 0);
        if (y + t > walkTop) y = walkTop - t;
        out.y = y;
        return out;
    }

    function groundRects(level) {
        if (!level) return [];
        const y = Number(level.groundY) || 400;
        const list = level.grounds;
        if (list && list.length) {
            return list.map(function (g) {
                return {
                    x: Number(g.x != null ? g.x : g[0]) || 0,
                    y: y,
                    w: Number(g.w != null ? g.w : g[1]) || 0,
                    h: 100
                };
            });
        }
        return [{ x: 0, y: y, w: Number(level.width) || 0, h: 100 }];
    }

    function expandPlatformsToCubes(list, tile) {
        const t = Number(tile) || 40;
        const out = [];
        (list || []).forEach(function (p) {
            const plat = Array.isArray(p)
                ? { x: p[0], y: p[1], w: p[2], h: p[3] }
                : Object.assign({}, p);
            if (plat.mv || plat.breakable === false || plat.stair) {
                plat.broken = !!plat.broken;
                out.push(plat);
                return;
            }
            const n = Math.max(1, Math.round(Number(plat.w) / t) || 1);
            const placed = placeSolidCube({ x: plat.x, y: plat.y, w: plat.w, h: plat.h }, t);
            for (let i = 0; i < n; i += 1) {
                out.push({
                    x: Math.round(Number(plat.x) + i * t),
                    y: placed.y,
                    w: t,
                    h: t,
                    type: plat.type || 'grass',
                    breakable: true,
                    broken: false,
                    item: (i % 3 === 1) ? 'coin' : null,
                    lift: 0
                });
            }
        });
        return out;
    }

    function canBreakSolid(solid, powered) {
        if (!solid || solid.type === 'question') return false;
        if (solid.type === 'grass') return true;
        if (solid.type === 'brick' || solid.breakable) return !!powered;
        return false;
    }

    function skipSidePushOnHeadBump(player, solid) {
        if (!player || !solid || solid.broken || solid.mv) return false;
        if (!(player.vy < 0)) return false;
        if (!(solid.type === 'question' || solid.type === 'brick' || solid.type === 'grass' || solid.breakable === true)) return false;
        return player.y >= (Number(solid.y) || 0) + (Number(solid.h) || 0) - 10;
    }

    function pickBumpTarget(player, solids) {
        if (!player || !solids) return null;
        const headX = player.x + player.w / 2;
        let best = null;
        let bestDist = 1e9;
        for (let i = 0; i < solids.length; i += 1) {
            const s = solids[i];
            if (!s || s.broken || s.mv) continue;
            if (!(s.type === 'question' || s.type === 'brick' || s.type === 'grass' || s.breakable)) continue;
            const d = Math.abs((s.x + s.w / 2) - headX);
            if (d < bestDist) {
                best = s;
                bestDist = d;
            }
        }
        return best;
    }

    function snapDrawRect(x, y, w, h) {
        return {
            x: Math.round(Number(x) || 0),
            y: Math.round(Number(y) || 0),
            w: Math.max(1, Math.round(Number(w) || 0)),
            h: Math.max(1, Math.round(Number(h) || 0))
        };
    }

    function spriteDestSize(imgW, imgH, maxW, maxH) {
        const ratio = (Number(imgW) || 1) / (Number(imgH) || 1);
        let dw = Math.round(Number(maxW) || 1);
        let dh = Math.round(dw / ratio);
        if (dh > (Number(maxH) || dh)) {
            dh = Math.round(Number(maxH) || 1);
            dw = Math.round(dh * ratio);
        }
        return { w: Math.max(1, dw), h: Math.max(1, dh) };
    }

    function enemyAdvance(enemy, step, obstacles, bounds) {
        if (!enemy) return { x: 0, dir: 1 };
        const dir = enemy.dir || 1;
        const blocked = function (x) {
            const probe = { x: x, y: enemy.y, w: enemy.w, h: enemy.h };
            const left = bounds && bounds.left != null ? Number(bounds.left) : 0;
            const right = bounds && bounds.right != null ? Number(bounds.right) : 0;
            if (probe.x < left || probe.x + probe.w > right) return true;
            const floors = bounds && bounds.floors;
            if (floors && floors.length) {
                let onFloor = false;
                for (let f = 0; f < floors.length; f += 1) {
                    const g = floors[f];
                    if (probe.x >= g.x && probe.x + probe.w <= g.x + g.w) { onFloor = true; break; }
                }
                if (!onFloor) return true;
            }
            const list = obstacles || [];
            for (let i = 0; i < list.length; i += 1) {
                const o = list[i];
                if (!o) continue;
                if (probe.x < o.x + o.w && probe.x + probe.w > o.x && probe.y < o.y + o.h && probe.y + probe.h > o.y) return true;
            }
            return false;
        };
        const stuck = obstacles || [];
        for (let s = 0; s < stuck.length; s += 1) {
            const o = stuck[s];
            if (!o) continue;
            if (enemy.x < o.x + o.w && enemy.x + enemy.w > o.x && enemy.y < o.y + o.h && enemy.y + enemy.h > o.y) {
                const leftGap = (enemy.x + enemy.w) - o.x;
                const rightGap = (o.x + o.w) - enemy.x;
                const pushed = leftGap <= rightGap ? o.x - enemy.w : o.x + o.w;
                return { x: pushed, dir: leftGap <= rightGap ? -1 : 1 };
            }
        }
        if (!blocked(enemy.x + dir * step)) return { x: enemy.x + dir * step, dir: dir };
        if (!blocked(enemy.x - dir * step)) return { x: enemy.x - dir * step, dir: -dir };
        return { x: enemy.x, dir: dir };
    }

    function bounceShot(shot, dt, floors, gravity, maxFall) {
        if (!shot) return { x: 0, y: 0, w: 12, h: 12, vx: 0, vy: 0, bounces: 0, life: 0, dead: true };
        const next = {
            x: shot.x + (shot.vx || 0) * dt,
            y: shot.y + (shot.vy || 0) * dt,
            w: shot.w || 12,
            h: shot.h || 12,
            vx: shot.vx || 0,
            vy: (shot.vy || 0) + (gravity || 1500) * dt,
            bounces: shot.bounces || 0,
            life: (shot.life == null ? 2.4 : shot.life) - dt,
            dead: !!shot.dead,
            kind: shot.kind || 'ball'
        };
        if (next.vy > (maxFall || 900)) next.vy = maxFall || 900;
        const list = floors || [];
        for (let i = 0; i < list.length; i += 1) {
            const g = list[i];
            if (!g) continue;
            if (next.x < g.x + g.w && next.x + next.w > g.x && next.y < g.y + g.h && next.y + next.h > g.y) {
                if ((shot.vy || 0) >= 0 && shot.y + next.h <= g.y + 10) {
                    next.y = g.y - next.h;
                    next.vy = -220;
                    next.bounces += 1;
                }
            }
        }
        if (next.bounces >= 4 || next.life <= 0 || next.y > 520) next.dead = true;
        return next;
    }

    function touchingFlag(player, flag) {
        if (!player || !flag) return false;
        const zone = {
            x: flag.x - 10,
            y: flag.y - 48,
            w: (flag.w || 44) + 20,
            h: (flag.h || 120) + 48
        };
        const overlap = player.x < zone.x + zone.w && player.x + player.w > zone.x
            && player.y < zone.y + zone.h && player.y + player.h > zone.y;
        return overlap || player.x + player.w >= flag.x;
    }

    function standingOnPipe(actor, pipe) {
        if (!actor || !pipe || !pipe.w) return false;
        const mid = actor.x + actor.w * 0.5;
        if (mid < pipe.x || mid > pipe.x + pipe.w) return false;
        const feet = actor.y + actor.h;
        return Math.abs(feet - pipe.y) <= 10;
    }

    function applyStomp(enemy, playerX) {
        if (!enemy) return { state: 'gone', vx: 0, wakeIn: 0 };
        if (enemy.kind === 'beetle') {
            if (enemy.state === 'slide') return { state: 'shell', vx: 0, wakeIn: 5000 };
            if (enemy.state === 'shell') {
                const mid = enemy.x + (enemy.w || 32) * 0.5;
                const dir = playerX < mid ? 1 : -1;
                return { state: 'slide', vx: dir * 320, wakeIn: 0 };
            }
            return { state: 'shell', vx: 0, wakeIn: 5000 };
        }
        return { state: 'gone', vx: 0, wakeIn: 0 };
    }

    function plantVisible(now, hideMs, showMs, offset) {
        const hide = hideMs || 1400;
        const show = showMs || 1600;
        const span = hide + show;
        const t = (((now || 0) + (offset || 0)) % span + span) % span;
        return t >= hide;
    }

    function crushEnemy(enemy) {
        if (!enemy) return { state: 'flat', life: 0, h: 10, y: 0, x: 0 };
        const h = 10;
        return {
            state: 'flat',
            life: 0.42,
            h: h,
            x: enemy.x,
            y: (enemy.y || 0) + (enemy.h || 28) - h
        };
    }

    function tickCrush(enemy, dt) {
        if (!enemy) return { gone: true, life: 0 };
        const next = { state: enemy.state || 'flat', life: (enemy.life || 0) - (dt || 0), gone: false };
        if (next.life <= 0) next.gone = true;
        return next;
    }

    function flagSlide(player, flag, dt, groundY) {
        if (!player || !flag) return { climbing: false, done: false, x: 0, y: 0 };
        const next = {
            climbing: true,
            done: false,
            x: flag.x - 6,
            y: (player.y || 0) + 240 * (dt || 0)
        };
        const land = (groundY || 400) - (player.h || 52);
        if (next.y >= land) {
            next.y = land;
            next.done = true;
        }
        return next;
    }

    function checkpointRaise(raise, dt) {
        const cur = Number(raise) || 0;
        if (cur >= 1) return 1;
        const next = cur + (dt || 0) * 2.6;
        return next >= 1 ? 1 : next;
    }

    function enemyStandY(enemy, floors, groundY) {
        const gy = groundY || 400;
        const h = (enemy && enemy.h) || 22;
        const mid = enemy ? (enemy.x || 0) + (enemy.w || 32) * 0.5 : 0;
        const list = floors || [];
        let best = gy;
        for (let i = 0; i < list.length; i += 1) {
            const g = list[i];
            if (!g) continue;
            if (mid >= g.x && mid <= g.x + g.w && g.y < best) best = g.y;
        }
        return best - h;
    }

    function spawnFireworks(x, y) {
        const out = [];
        const colors = ['#ffd02f', '#ff6b52', '#7ee07a', '#7ec8ff', '#ffe566'];
        for (let i = 0; i < 16; i += 1) {
            const a = (i / 16) * Math.PI * 2;
            out.push({
                x: x,
                y: y,
                vx: Math.cos(a) * 90,
                vy: Math.sin(a) * 90 - 40,
                life: 0.85,
                color: colors[i % colors.length]
            });
        }
        return out;
    }

    function flattenEnemy(enemy) {
        const crushed = crushEnemy(enemy);
        enemy.state = crushed.state;
        enemy.life = crushed.life;
        enemy.h = crushed.h;
        enemy.y = crushed.y;
        return crushed;
    }

    function enemyShouldReverse(enemy, obstacles, bounds) {
        if (!enemy) return false;
        const left = bounds && bounds.left != null ? Number(bounds.left) : 0;
        const right = bounds && bounds.right != null ? Number(bounds.right) : 0;
        if (enemy.x < left || enemy.x + enemy.w > right) return true;
        const floors = bounds && bounds.floors;
        if (floors && floors.length) {
            const dir = enemy.dir || 1;
            const lead = dir > 0 ? enemy.x + enemy.w + 1 : enemy.x - 1;
            let leadOn = false;
            for (let f = 0; f < floors.length; f += 1) {
                const g = floors[f];
                if (lead >= g.x && lead <= g.x + g.w) { leadOn = true; break; }
            }
            if (!leadOn) return true;
        }
        const box = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
        const list = obstacles || [];
        for (let i = 0; i < list.length; i += 1) {
            const o = list[i];
            if (!o) continue;
            if (box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.y + o.h && box.y + box.h > o.y) return true;
        }
        return false;
    }

    function resolveGroundContact(player, ground) {
        const next = { x: player.x, y: player.y, vy: player.vy, onGround: false };
        if (!player || !ground) return next;
        const overlap = player.x < ground.x + ground.w && player.x + player.w > ground.x
            && player.y < ground.y + ground.h && player.y + player.h > ground.y;
        if (overlap && player.vy >= 0) {
            next.y = ground.y - player.h;
            next.vy = 0;
            next.onGround = true;
            next.x = player.x;
        }
        return next;
    }

    function applyPlayMods(input, mods) {
        const data = input || {};
        const m = mods || {};
        const speed = Number(m.enemySpeed);
        const sunMult = Number(m.sunMult);
        const enemySpeed = Number.isFinite(speed) ? speed : 1;
        const mult = Number.isFinite(sunMult) ? sunMult : 1;
        const hard = m.mode === 'hard';
        const easy = m.mode === 'easy';
        const enemies = (data.enemies || []).map(function (e) {
            const minX = Number(e.minX) || 0;
            const maxX = Number(e.maxX) || 0;
            const mid = (minX + maxX) / 2;
            const half = ((maxX - minX) / 2) * (hard ? 1.2 : 1);
            return { minX: mid - half, maxX: mid + half };
        });
        return {
            rewardSun: Math.round((Number(data.rewardSun) || 0) * mult),
            enemySpeed: enemySpeed,
            coyoteMs: easy ? 140 : 120,
            extraMob: !!m.extraMob,
            enemies: enemies
        };
    }

    function buildRunSummary(input) {
        const data = input || {};
        const meta = data.meta || {};
        const points = Number(meta.adventurePoints) || 0;
        const need = meta.nextRank ? (Number(meta.nextRank.need) || points) : points;
        let gain = '本局：' + data.time + 's · 金币 ' + (Number(data.coins) || 0) + ' · ★×' + (Number(data.stars) || 0);
        if (data.isNewRecord) gain += ' · 新纪录！';
        const badges = Array.isArray(meta.badges) ? meta.badges : [];
        const nextBadge = badges.filter(function (b) { return b && !b.unlocked; })[0] || null;
        let nextGoal = '';
        if (nextBadge) {
            const m = /(\d+)/.exec(nextBadge.desc || '');
            const needN = m ? Number(m[1]) : 0;
            const have = Number(meta.platformClears) || 0;
            const remain = needN > 0 ? Math.max(1, needN - have) : 1;
            nextGoal = '下一个目标：' + nextBadge.title + ' · 还差 ' + remain + ' 关';
        } else {
            const over = Math.max(1, Math.ceil((Number(data.time) || 0) - (Number(data.parTime) || 0)));
            nextGoal = '下一个目标：第 ' + (data.levelId || 1) + ' 关再快 ' + over + ' 秒到 3 星';
        }
        return {
            gain: gain,
            progressLabel: '冒险等级 Lv.' + (meta.adventureLevel || 1) + ' ' + (meta.adventureTitle || '') + ' · ' + points + '/' + need,
            progressPercent: need > 0 ? Math.min(100, Math.round(points / need * 100)) : 100,
            nextGoal: nextGoal
        };
    }

    const LEVEL_WELCOME = {
        4: '顶问号拿弹跳果，站水管按下钻能进地下。',
        5: '站在管口等一等，花就不敢探头。',
        8: '密林水管能进地下，先把花等回去。',
        9: '飞叶低头再踩，硬壳虫缩了再踢。',
        11: '踩硬壳虫会缩壳，再踩一下就能踢飞。',
        12: '站在水管口等一等，花就不敢探头。',
        13: '飞叶会上下飘，等它低头再踩。',
        15: '砖城里先缩壳再踢，路会自己空出来。',
        16: '最后一面旗，先跑稳再收星星。'
    };

    const COMPANION_LINES = {
        welcome: [
            '先跑稳再跳，旗就在前面。',
            '踩怪要等落到它头上。',
            '金币可以回头再捡，先别掉坑。',
            '问号里的弹跳果，按奔跑再扔小球。'
        ],
        stomp: [
            '踩得好！',
            '这只怪落地了。'
        ],
        shell: [
            '缩成壳了，再踩一下就能踢飞。',
            '壳会往前滑，能把前面的怪撞开。'
        ],
        record: [
            '新纪录！跑得更快了。',
            '这次比上次快，星芒看见了。'
        ],
        checkpoint: [
            '存好啦，掉下去也会回到这里。',
            '检查点亮了，可以放心往前跑。'
        ],
        pit: [
            '跳早了一点点，等靠近坑边再跳。',
            '掉下去了，先看清落点再跳。',
            '下次贴着地面跑到坑边再起跳。',
            '坑有点宽，助跑后再跳会稳一点。'
        ],
        hit: [
            '被撞到了，等怪走开再从它头上踩。',
            '靠近怪的时候先跳起来踩，不要平跑硬撞。',
            '闪几下再跑，等无敌过了再靠近。',
            '怪是来回走的，等它转身再跳过去。',
            '等花缩回去再从水管边跑。',
            '硬壳虫缩了再踩，不要平跑去撞壳。'
        ]
    };

    function companionLine(kind, pick) {
        if (kind === 'welcome' && typeof LEVEL_WELCOME !== 'undefined' && typeof level !== 'undefined' && level && LEVEL_WELCOME[level.id]) {
            return LEVEL_WELCOME[level.id];
        }
        const pool = COMPANION_LINES[kind] || COMPANION_LINES.welcome || [];
        if (!pool.length) return '';
        const index = typeof pick === 'number' ? (Math.abs(Math.floor(pick)) % pool.length) : Math.floor(Math.random() * pool.length);
        return String(pool[index]);
    }

    function companionSayAllowed(lastAt, now, gapMs) {
        const gap = gapMs == null ? 5000 : gapMs;
        if (lastAt == null || lastAt < 0) return true;
        return now - lastAt >= gap;
    }

    function sayCompanion(text, now) {
        const el = document.getElementById('companion-say');
        if (!el || !text) return;
        el.textContent = text;
        el.classList.add('is-on');
        lastCompanionAt = now == null ? performance.now() : now;
        clearTimeout(sayCompanion._t);
        sayCompanion._t = setTimeout(function () { el.classList.remove('is-on'); }, 2800);
    }

    function sayCompanionThrottled(kind, now) {
        const t = now == null ? performance.now() : now;
        if (!companionSayAllowed(lastCompanionAt, t, 5000)) return false;
        sayCompanion(companionLine(kind), t);
        return true;
    }

    function updateModBadge() {
        const el = document.getElementById('mod-badge');
        if (!el) return;
        el.textContent = '难度 · ' + (playMods.label || '普通');
    }

    function showSettleLayer(lines) {
        const layer = document.getElementById('settle-layer');
        if (!layer) return;
        const gain = document.getElementById('settle-gain');
        const progress = document.getElementById('settle-progress-label');
        const bar = document.getElementById('settle-bar-fill');
        const goal = document.getElementById('settle-goal');
        if (gain) gain.textContent = lines.gain || '';
        if (progress) progress.textContent = lines.progressLabel || '';
        if (bar) bar.style.width = (Number(lines.progressPercent) || 0) + '%';
        if (goal) goal.textContent = lines.nextGoal || '';
        layer.classList.remove('is-hidden');
    }

    function hideSettleLayer() {
        const layer = document.getElementById('settle-layer');
        if (layer) layer.classList.add('is-hidden');
    }

    if (typeof globalThis !== 'undefined') {
        globalThis.PlatformFeel = {
            canJump: canJump,
            jumpVelocity: jumpVelocity,
            jumpHeight: jumpHeight,
            resolveGroundContact: resolveGroundContact,
            COYOTE_MS: 120,
            BUFFER_MS: 120
        };
    }


    function toast(msg) {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { el.classList.remove('is-on'); }, 2500);
    }

    function loadImage(key, src, fallback) {
        return new Promise(function (resolve) {
            const img = new Image();
            img.onload = function () { images[key] = img; resolve(img); };
            img.onerror = function () {
                if (fallback) loadImage(key, fallback, null).then(resolve);
                else resolve(null);
            };
            img.src = src;
        });
    }

    // Web Audio 合成音效:零素材文件,首次用户手势时解锁
    const sfx = (function () {
        let actx = null;
        function ensure() {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            if (!actx) actx = new AC();
            if (actx.state === 'suspended') actx.resume();
            return actx;
        }
        function tone(freq, dur, type, vol, slideTo, delay) {
            const ac = ensure();
            if (!ac) return;
            const t0 = ac.currentTime + (delay || 0);
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = type || 'square';
            osc.frequency.setValueAtTime(freq, t0);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
            gain.gain.setValueAtTime(vol || 0.1, t0);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.start(t0);
            osc.stop(t0 + dur + 0.03);
        }
        return {
            unlock: ensure,
            jump: function () { tone(320, 0.16, 'square', 0.08, 640); },
            coin: function () { tone(988, 0.08, 'square', 0.07); tone(1319, 0.14, 'square', 0.07, null, 0.06); },
            stomp: function () { tone(240, 0.1, 'triangle', 0.14, 90); },
            hurt: function () { tone(220, 0.2, 'sawtooth', 0.08, 110); },
            fall: function () { tone(400, 0.3, 'triangle', 0.08, 120); },
            power: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.1, 'square', 0.07, null, i * 0.07); }); },
            clear: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.14, 'square', 0.08, null, i * 0.1); }); },
            bump: function () { tone(170, 0.07, 'square', 0.09, 120); },
            break: function () {
                tone(140, 0.06, 'square', 0.11, 80);
                tone(90, 0.12, 'triangle', 0.09, 45, 0.04);
            },
            question: function () {
                tone(520, 0.05, 'square', 0.08, 780);
                tone(780, 0.1, 'square', 0.07, 1040, 0.05);
            },
            throw: function () { tone(620, 0.08, 'square', 0.07, 420); tone(880, 0.1, 'square', 0.06, 520, 0.05); }
        };
    }());

    function loadAssets() {
        return Promise.all([
            loadImage('idle', ASSET.idle, ASSET.idleLegacy),
            loadImage('walkA', ASSET.walkA, ASSET.walkALegacy),
            loadImage('walkB', ASSET.walkB, ASSET.walkBLegacy),
            loadImage('walkC', ASSET.walkC, ASSET.walkA),
            loadImage('walkD', ASSET.walkD, ASSET.walkB),
            loadImage('jump', ASSET.jump, ASSET.jumpLegacy),
            loadImage('sky-day', ASSET['sky-day']),
            loadImage('sky-sunset', ASSET['sky-sunset']),
            loadImage('sky-night', ASSET['sky-night']),
            loadImage('enemy-shroom', ASSET['enemy-shroom']),
            loadImage('enemy-shroom-b', ASSET['enemy-shroom-b']),
            loadImage('enemy-shroom-c', ASSET['enemy-shroom-c']),
            loadImage('enemy-slime', ASSET['enemy-slime']),
            loadImage('enemy-bat', ASSET['enemy-bat']),
            loadImage('enemy-beetle', ASSET['enemy-beetle']),
            loadImage('enemy-beetle-b', ASSET['enemy-beetle-b']),
            loadImage('enemy-beetle-c', ASSET['enemy-beetle-c']),
            loadImage('enemy-leaf', ASSET['enemy-leaf']),
            loadImage('enemy-leaf-b', ASSET['enemy-leaf-b']),
            loadImage('enemy-leaf-c', ASSET['enemy-leaf-c']),
            loadImage('enemy-shell', ASSET['enemy-shell']),
            loadImage('enemy-plant', ASSET['enemy-plant']),
            loadImage('enemy-plant-b', ASSET['enemy-plant-b'])
        ]);
    }

    function themeForLevel(id) {
        if (id >= 8) return { sky: 'sky-night', enemy: 'enemy-shroom' };
        if (id >= 4) return { sky: 'sky-sunset', enemy: 'enemy-shroom' };
        return { sky: 'sky-day', enemy: 'enemy-shroom' };
    }

    function loadProgress() {
        progress = bridge.getProgress(GAME_ID).progress;
        if (!progress.unlockedLevel) progress.unlockedLevel = 1;
        if (!Array.isArray(progress.clearedLevels)) progress.clearedLevels = [];
        if (!progress.stars) progress.stars = {};
        if (!Number.isFinite(progress.coinsTotal)) progress.coinsTotal = 0;
        if (!progress.bestTime) progress.bestTime = {};
        bridge.saveProgress(GAME_ID, progress);
    }

    function playPassNow() {
        if (!bridge.getPlayPass) return { remaining: 99, exhausted: false, redeemCost: 25, canRedeem: false };
        return bridge.getPlayPass(GAME_ID);
    }

    function refreshWallet() {
        const w = bridge.getWallet();
        const pass = playPassNow();
        document.getElementById('wallet-hud').innerHTML =
            `<span class="chip">阳光 <b>${w.sunlight}</b></span>` +
            `<span class="chip">今日还可冲 <b>${pass.remaining}</b> 次</span>` +
            `<span class="chip">星芒 Lv.<b>${w.petLevel}</b></span>` +
            `<span class="chip">生涯金币 <b>${progress.coinsTotal || 0}</b></span>`;
    }

    function showRest(pass) {
        const view = pass || playPassNow();
        const layer = document.getElementById('rest-layer');
        if (!layer) return;
        document.getElementById('rest-title').textContent = '先歇一歇再冲';
        document.getElementById('rest-copy').textContent = '今天已经跑得很棒。去做一张字卡或一项今日任务，星芒就给你新的冲关次数。';
        document.getElementById('rest-pass').textContent = view.canRedeem
            ? ('也可以用 ' + (view.redeemCost || 25) + ' 阳光再冲一次。')
            : '今天的阳光兑换也用完了，明天再来，或者先去点亮成就。';
        const learn = document.getElementById('rest-learn-link');
        if (learn) learn.href = bridge.backHref('platform-quest').replace('#overview', '#courses');
        layer.classList.remove('is-hidden');
        playing = false;
    }

    function hideRest() {
        const layer = document.getElementById('rest-layer');
        if (layer) layer.classList.add('is-hidden');
    }

    function tryStartRun(freeRetry) {
        if (freeRetry || !bridge.consumePlayPass) return true;
        const spent = bridge.consumePlayPass(GAME_ID);
        if (spent.ok) {
            refreshWallet();
            return true;
        }
        showRest(spent.pass);
        toast('今天先休息一下，去做任务再来冲');
        return false;
    }

    function formatBestTime(sec) {
        const n = Number(sec);
        if (!Number.isFinite(n) || n <= 0) return '';
        return (Math.round(n * 10) / 10) + 's';
    }

    function starsText(id) {
        const n = Number(progress.stars[id] || 0);
        return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
    }

    const LEVEL_TIPS = {
        1: '站在水管上按下钻，能进地下；顶碎砖块可接住再扔',
        2: '蘑菇不贴水管。问号里的弹跳果，按奔跑扔小球',
        3: '星星无敌时碰怪也会消失',
        4: '问号里有弹跳果，水管能进地下',
        5: '从这里起空中只能再跳一次；管口会冒花',
        6: '中间亮块是检查点，掉坑会回到那里',
        7: '检查点在中段，别跳过',
        8: '密林里有地下房，站管口花就缩回去',
        9: '夜里飞叶和硬壳虫一起走',
        10: '收齐金币并限时冲旗，拿满三星',
        11: '踩硬壳虫会缩成壳，再踩或碰到就能踢飞',
        12: '水管里会冒花，站在管口它就不敢出来',
        13: '飞叶会上下飘，小球或踩都能对付',
        14: '飞叶和硬壳虫会一起出现，小球能同时对付',
        15: '夜廊砖多，缩壳踢飞能清出一条路',
        16: '最后一关，收齐再冲旗'
    };

    function updateCoinHud() {
        const el = document.getElementById('coin-count');
        if (!el || !level) return;
        el.textContent = coins + ' / ' + level.coins.length;
    }

    function updateStarGoalsHud() {
        const el = document.getElementById('star-goals');
        if (!el || !level || !playing) return;
        const coinOk = coins >= level.coins.length;
        const elapsed = (performance.now() - startTime) / 1000;
        const timeOk = elapsed <= level.parTime;
        el.innerHTML =
            '<span class="' + (won ? 'is-on' : '') + '">★到旗</span>' +
            '<span class="' + (coinOk ? 'is-on' : '') + '">' + (coinOk ? '★' : '☆') + '金币</span>' +
            '<span class="' + (timeOk ? 'is-on' : '') + '">' + (timeOk ? '★' : '☆') + '速度</span>';
    }

    function updateTimerHud() {
        const el = document.getElementById('run-timer');
        if (!el || !playing || !level) return;
        const elapsed = Math.floor((performance.now() - startTime) / 1000);
        const best = progress.bestTime && progress.bestTime[level.id];
        el.textContent = elapsed + 's / ' + level.parTime + 's'
            + (best ? (' · 最佳 ' + best + 's') : '');
    }

    function maxAirJumpsForLevel() {
        if (!level) return phy.MAX_AIR_JUMPS || 1;
        if (level.id <= (phy.EARLY_LEVEL_AIR_UNTIL || 4)) return phy.EARLY_LEVEL_AIR_JUMPS || 2;
        return phy.MAX_AIR_JUMPS || 1;
    }

    function updateHeartsHud() {
        const el = document.getElementById('heart-count');
        if (!el) return;
        const max = phy.START_HEARTS || 5;
        el.textContent = '♥'.repeat(Math.max(0, hearts)) + '♡'.repeat(Math.max(0, max - hearts));
    }

    function renderMap() {
        const map = document.getElementById('level-map');
        map.innerHTML = '';
        levelsApi.list.forEach(function (lv) {
            const locked = lv.id > progress.unlockedLevel;
            const cleared = progress.clearedLevels.indexOf(lv.id) !== -1;
            const current = lv.id === progress.unlockedLevel && !cleared;
            const stars = Math.max(0, Math.min(3, Number(progress.stars[lv.id]) || (cleared ? 1 : 0)));
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'stage-card' + (locked ? ' is-locked' : '') + (current ? ' is-current' : '') + (cleared ? ' is-cleared' : '');
            btn.disabled = locked;
            btn.setAttribute('aria-label', locked ? '第 ' + lv.id + ' 关未解锁' : '第 ' + lv.id + ' 关');
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
            btn.appendChild(thumb);
            const starRow = document.createElement('span');
            starRow.className = 'stage-stars';
            starRow.textContent = locked ? '' : ('★★★'.slice(0, stars) + '☆☆☆'.slice(stars));
            btn.appendChild(starRow);
            if (!locked) {
                const best = progress.bestTime && progress.bestTime[lv.id];
                const meta = document.createElement('span');
                meta.className = 'stage-best';
                if (best) meta.textContent = formatBestTime(best) + ' 最佳';
                else meta.textContent = '≤' + lv.parTime + 's';
                btn.appendChild(meta);
                if (cleared && stars < 3) {
                    const challenge = document.createElement('span');
                    challenge.className = 'stage-challenge';
                    challenge.textContent = '可挑战';
                    btn.appendChild(challenge);
                }
            }
            if (!locked) btn.addEventListener('click', function () { enterLevel(lv.id); });
            map.appendChild(btn);
        });
        const totalEl = document.getElementById('level-total');
        if (totalEl) totalEl.textContent = String(levelsApi.count);
        const pass = playPassNow();
        document.getElementById('progress-tip').textContent = pass.exhausted
            ? '今日小目标：去做一张字卡，换一次新的冲关。'
            : (progress.clearedLevels.length + ' / ' + levelsApi.count + ' · 还可冲 ' + pass.remaining + ' 次');
        refreshWallet();
    }

    function showMap() {
        playing = false;
        document.body.classList.add('is-picking');
        document.getElementById('panel-map').classList.remove('is-hidden');
        document.getElementById('panel-play').classList.add('is-hidden');
        renderMap();
    }

    function showPlay() {
        document.body.classList.remove('is-picking');
        document.getElementById('panel-map').classList.add('is-hidden');
        document.getElementById('panel-play').classList.remove('is-hidden');
    }

    function prepEnemy(e, gy) {
        if (!e) return e;
        const ground = gy || 400;
        if (e.kind === 'beetle' && !e.state) e.state = 'walk';
        if (e.kind === 'plant') {
            e.w = 28;
            e.h = 36;
            e.pipeX = e.x - 8;
            e.y = ground - 88;
            e.visible = false;
            return e;
        }
        if (e.kind === 'bat') {
            e.w = 32;
            e.h = 28;
            e.y = ground - 120;
            return e;
        }
        e.w = 32;
        e.h = (e.kind === 'beetle' && (e.state === 'shell' || e.state === 'slide')) ? 22 : 36;
        e.y = ground - e.h;
        return e;
    }

    function allPipes() {
        if (level && level.pipes && level.pipes.length) return level.pipes;
        return (level && level.pipe) ? [level.pipe] : [];
    }

    function enterLevel(id, opts) {
        if (!tryStartRun(opts && opts.freeRetry)) return;
        hideRest();
        levelId = id;
        level = levelsApi.get(id);
        const theme = themeForLevel(level.id);
        skyKey = theme.sky;
        enemyKey = theme.enemy;
        level.platforms = expandPlatformsToCubes(level.platforms, TILE_SIZE);
        level.blocks = (level.blocks || []).map(function (b) {
            return placeSolidCube(b, TILE_SIZE);
        });
        (level.enemies || []).forEach(function (e) { prepEnemy(e, level.groundY); });
        scene = 'over';
        overSnap = null;
        underCoins = [];
        resetRun();
        refreshPlayMods();
        updateModBadge();
        if (USE_PLAY_MODS && level && level.enemies) {
            const applied = applyPlayMods({ rewardSun: level.rewardSun, enemies: level.enemies }, playMods);
            level.enemies.forEach(function (e, i) {
                if (applied.enemies[i]) { e.minX = applied.enemies[i].minX; e.maxX = applied.enemies[i].maxX; }
            });
        }
        sayCompanion(companionLine('welcome'));
        document.getElementById('level-title').textContent = `第 ${level.id} 关 · ${level.title}`;
        showPlay();
        playing = true;
        startTime = performance.now();
        updateStarGoalsHud();
        const tip = LEVEL_TIPS[level.id];
        if (tip) setTimeout(function () { toast(tip); }, 350);
    }

    function resetRun() {
        player.x = 48; player.y = 320; player.vx = 0; player.vy = 0;
        player.onGround = false; player.facing = 1; player.pose = 'idle'; player.ride = null;
        coins = 0; won = false; awarding = false; cameraX = 0; cameraTarget = 0;
        startTime = performance.now();
        pops = []; floats = []; debris = []; fireworks = [];
        climbingFlag = false;
        stompCombo = 0;
        lastStompAt = -9999;
        lastGroundedAt = -9999;
        lastJumpPressedAt = -9999;
        jumpConsumedAt = -9999;
        lastHitAt = -9999;
        starUntil = -1;
        playerPowered = false;
        playerCanThrow = false;
        heldCube = false;
        shots = [];
        lastThrowAt = -9999;
        scene = 'over';
        overSnap = null;
        underCoins = [];
        hearts = phy.START_HEARTS || 5;
        pickups = [];
        airJumpsUsed = 0;
        lastSafeX = 48;
        lastSafeY = 320;
        if (level) {
            level.coins.forEach(function (c) { c.taken = false; });
            const fresh = levelsApi.get(levelId);
            level.width = fresh.width;
            level.grounds = fresh.grounds;
            level.pipe = fresh.pipe;
            level.pipes = fresh.pipes;
            level.flag = fresh.flag;
            level.under = fresh.under;
            level.enemies = fresh.enemies;
            level.coins = fresh.coins;
            level.blocks = fresh.blocks || [];
            level.checkpoints = fresh.checkpoints || [];
            level.platforms = expandPlatformsToCubes(fresh.platforms, TILE_SIZE);
            level.blocks = (fresh.blocks || []).map(function (b) {
                return placeSolidCube(b, TILE_SIZE);
            });
            (level.enemies || []).forEach(function (e) { prepEnemy(e, level.groundY); });
        }
        document.getElementById('coin-count').textContent = '0 / ' + (level ? level.coins.length : 0);
        document.getElementById('run-status').textContent = '奔跑中';
        updateHeartsHud();
        updateTimerHud();
        updateStarGoalsHud();
        const poseEl = document.getElementById('pose-label');
        if (poseEl) poseEl.textContent = '站立';
        skyKey = themeForLevel(levelId).sky;
    }

    function enterUnder() {
        if (!level || !level.under || scene === 'under') return;
        const u = level.under;
        overSnap = {
            width: level.width,
            grounds: level.grounds,
            platforms: level.platforms,
            enemies: level.enemies,
            blocks: level.blocks,
            pipe: level.pipe,
            pipes: level.pipes,
            checkpoints: level.checkpoints,
            flag: level.flag,
            sky: skyKey
        };
        overReturnX = (level.pipe && level.pipe.x != null) ? level.pipe.x + 64 : player.x + 64;
        scene = 'under';
        level.width = u.width;
        level.grounds = u.grounds;
        level.platforms = expandPlatformsToCubes(JSON.parse(JSON.stringify(u.platforms || [])), TILE_SIZE);
        level.enemies = JSON.parse(JSON.stringify(u.enemies || []));
        level.blocks = (JSON.parse(JSON.stringify(u.blocks || []))).map(function (b) {
            return placeSolidCube(b, TILE_SIZE);
        });
        level.pipe = JSON.parse(JSON.stringify(u.pipe));
        level.pipes = u.pipes ? JSON.parse(JSON.stringify(u.pipes)) : (level.pipe ? [level.pipe] : []);
        level.checkpoints = [];
        level.flag = { x: -9999, y: 0, w: 1, h: 1 };
        underCoins = JSON.parse(JSON.stringify(u.coins || []));
        (level.enemies || []).forEach(function (e) { prepEnemy(e, level.groundY); });
        skyKey = u.sky || 'sky-night';
        player.x = 64;
        player.y = (level.groundY || 400) - player.h;
        player.vx = 0;
        player.vy = 0;
        cameraX = 0;
        cameraTarget = 0;
        toast('钻进水管，到地下啦');
        sayCompanion('地下有金币，走到另一头水管再下钻。');
    }

    function exitUnder() {
        if (scene !== 'under' || !overSnap) return;
        scene = 'over';
        level.width = overSnap.width;
        level.grounds = overSnap.grounds;
        level.platforms = overSnap.platforms;
        level.enemies = overSnap.enemies;
        level.blocks = overSnap.blocks;
        level.pipe = overSnap.pipe;
        level.pipes = overSnap.pipes;
        level.checkpoints = overSnap.checkpoints;
        level.flag = overSnap.flag;
        skyKey = overSnap.sky || themeForLevel(level.id).sky;
        underCoins = [];
        overSnap = null;
        player.x = Math.max(0, Math.min(level.width - player.w, overReturnX));
        player.y = (level.groundY || 400) - player.h;
        player.vx = 0;
        player.vy = 0;
        toast('回到地面啦');
    }

    function tryWarpPipe() {
        if (!input.down || !player.onGround || !level || !level.pipe) return;
        if (!standingOnPipe(player, level.pipe)) return;
        if (scene === 'over' && level.under) enterUnder();
        else if (scene === 'under') exitUnder();
    }

    function respawnAtCheckpoint(now) {
        if (scene === 'under') {
            player.x = 64;
            player.y = (level.groundY || 400) - player.h;
            player.vx = 0;
            player.vy = 0;
            player.ride = null;
            lastHitAt = now || performance.now();
            airJumpsUsed = 0;
            sfx.fall();
            toast('掉下去了，回到地下入口');
            return;
        }
        player.x = lastSafeX;
        player.y = lastSafeY;
        player.vx = 0;
        player.vy = 0;
        player.ride = null;
        lastHitAt = now || performance.now();
        airJumpsUsed = 0;
        sfx.fall();
        toast('掉下去了，回到刚才的地方');
        sayCompanion(companionLine('pit'));
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function solids() {
        const pipes = allPipes();
        const blocks = (level.blocks || []).filter(function (b) { return !b.broken; });
        const platforms = (level.platforms || []).filter(function (p) { return !p.broken; });
        return groundRects(level).concat(pipes).concat(platforms).concat(blocks);
    }

    function qaAheadBlocked() {
        const probe = { x: player.x + player.w + 4, y: player.y + 8, w: 12, h: player.h - 16 };
        return solids().some(function (s) { return rectsOverlap(probe, s); });
    }

    function qaPitAhead() {
        const probe = { x: player.x + player.w + 28, y: player.y + player.h + 4, w: 10, h: 24 };
        return !solids().some(function (s) { return rectsOverlap(probe, s); });
    }

    function qaDrive(now) {
        if (!qaAuto || !playing || won || climbingFlag) return;
        input.right = true;
        input.left = false;
        input.run = true;
        const needJump = player.onGround && (qaAheadBlocked() || qaPitAhead());
        if (needJump) {
            lastJumpPressedAt = now;
            input.jumpHeld = true;
            qaJumpUntil = now + 180;
        } else if (qaJumpUntil && now >= qaJumpUntil) {
            input.jumpHeld = false;
            qaJumpUntil = 0;
        }
    }

    function enemyObstacles() {
        const platforms = ((level && level.platforms) || []).filter(function (p) { return !p.broken; });
        const blocks = ((level && level.blocks) || []).filter(function (b) { return !b.broken; });
        return allPipes().concat(platforms).concat(blocks);
    }

    function spawnFloat(x, y, text, color) {
        floats.push({
            x: x,
            y: y,
            text: text,
            color: color || '#fffdf6',
            life: 0.85,
            vy: -56
        });
    }

    function spawnPop(x, y) {
        pops.push({ x: x, y: y, life: 0.45 });
    }

    function trySaveCheckpoint() {
        if (!level || !level.checkpoints) return;
        level.checkpoints.forEach(function (cp) {
            if (cp.saved || !player.onGround) return;
            const zone = { x: cp.x, y: cp.y, w: cp.w, h: cp.h };
            if (!rectsOverlap(player, zone)) return;
            cp.saved = true;
            cp.raise = 0;
            lastSafeX = cp.x + 8;
            lastSafeY = cp.y - player.h;
            if (lastSafeY > level.groundY - player.h) lastSafeY = level.groundY - player.h;
            toast('记录检查点');
            if (gameSfx && gameSfx.checkpoint) gameSfx.checkpoint();
            sayCompanion(companionLine('checkpoint'));
        });
    }

    function isBumpBlock(solid) {
        if (!solid || solid.broken || solid.mv) return false;
        if (solid.type === 'question' || solid.type === 'brick' || solid.type === 'grass') return true;
        return solid.breakable === true;
    }

    function spawnDebris(x, y, w) {
        const n = 5;
        for (let i = 0; i < n; i += 1) {
            debris.push({
                x: x + (w / n) * i + 4,
                y: y + 6,
                w: 8,
                h: 8,
                vx: (i - n / 2) * 38 + (Math.random() - 0.5) * 30,
                vy: -120 - Math.random() * 80,
                life: 0.55,
                color: i % 2 ? '#c65a22' : '#e08a4a'
            });
        }
    }

    function bumpBlock(block, now) {
        if (block.type === 'brick' || block.type === 'grass' || (block.breakable && block.type !== 'question')) {
            if (block.broken) return;
            if (!canBreakSolid(block, playerPowered)) {
                block.lift = 8;
                sfx.bump();
                return;
            }
            block.broken = true;
            block.lift = 0;
            sfx.break();
            spawnDebris(block.x, block.y, block.w);
            if (block.type === 'grass') {
                debris.slice(-5).forEach(function (d, i) {
                    d.color = i % 2 ? '#4fbf3a' : '#8a5a2b';
                });
            }
            if (block.type === 'brick') spawnPickup(block.x + 6, block.y - 18, 'cube');
            if (block.item === 'coin') {
                addCoin(now, 1);
                spawnPop(block.x + 8, block.y - 12);
            }
            spawnFloat(block.x + 4, block.y - 10, '碎!', '#ffd02f');
            return;
        }
        if (block.hit) {
            sfx.bump();
            return;
        }
        block.hit = true;
        block.lift = 8;
        sfx.question();
        if (block.item === 'coin') {
            addCoin(now, 1);
            spawnPop(block.x + 8, block.y - 12);
            spawnFloat(block.x + 4, block.y - 10, '+1', '#ffd02f');
            return;
        }
        spawnPickup(block.x + 4, block.y - 28, block.item);
        toast(block.item === 'star' ? '星星飞出来啦！' : (block.item === 'ball' ? '弹跳果飞出来啦！' : '蘑菇飞出来啦！'));
    }

    function spawnPickup(x, y, kind) {
        pickups.push({
            kind: kind,
            x: x,
            y: y,
            w: kind === 'cube' ? 22 : 28,
            h: kind === 'cube' ? 22 : 28,
            vx: kind === 'cube' ? 18 : 46,
            vy: -120,
            life: kind === 'cube' ? 2.2 : 8,
            taken: false
        });
    }

    function addCoin(now, amount) {
        const coinBonus = ((bridge.getMetaBonuses && bridge.getMetaBonuses()) || {}).platformCoinBonus || 0;
        const beforeTotal = (progress.coinsTotal || 0) + coins;
        sfx.coin();
        coins += (amount || 1) + coinBonus;
        updateCoinHud();
        const afterTotal = (progress.coinsTotal || 0) + coins;
        const milestone = phy.COIN_LIFE_MILESTONE || 100;
        const beforeM = Math.floor(beforeTotal / milestone);
        const afterM = Math.floor(afterTotal / milestone);
        if (afterM > beforeM) {
            const max = phy.START_HEARTS || 5;
            if (hearts < max) {
                hearts += 1;
                updateHeartsHud();
                toast('收集满 ' + milestone + ' 金币 · +1 小心心');
            } else {
                toast('收集满 ' + milestone + ' 金币！');
            }
        }
        void now;
    }

    function applyPickup(pickup) {
        pickup.taken = true;
        sfx.power();
        if (pickup.kind === 'mushroom') {
            const max = phy.START_HEARTS || 5;
            hearts = Math.min(max, hearts + 1);
            playerPowered = true;
            updateHeartsHud();
            toast('吃到蘑菇 · 变大啦');
            return;
        }
        if (pickup.kind === 'star') {
            starUntil = performance.now() + (phy.STAR_INVINCIBLE_MS || 8000);
            toast('星星无敌！');
            return;
        }
        if (pickup.kind === 'ball') {
            playerPowered = true;
            playerCanThrow = true;
            toast('弹跳果 · 按奔跑扔小球');
            return;
        }
        if (pickup.kind === 'cube') {
            heldCube = true;
            toast('接到方块 · 按奔跑扔出去');
        }
    }

    function tryThrow(now) {
        now = now || performance.now();
        if (now - lastThrowAt < 280) return false;
        if (!heldCube && !playerCanThrow) return false;
        let live = 0;
        for (let i = 0; i < shots.length; i += 1) {
            if (!shots[i].dead) live += 1;
        }
        if (live >= 2) return false;
        lastThrowAt = now;
        const kind = heldCube ? 'cube' : 'ball';
        if (heldCube) heldCube = false;
        shots.push({
            kind: kind,
            x: player.x + (player.facing > 0 ? player.w : -14),
            y: player.y + 18,
            w: kind === 'cube' ? 18 : 12,
            h: kind === 'cube' ? 18 : 12,
            vx: player.facing * (kind === 'cube' ? 240 : 300),
            vy: -240,
            bounces: 0,
            life: kind === 'cube' ? 1.8 : 2.4,
            dead: false
        });
        sfx.throw();
        return true;
    }

    function steerPickup(pickup, walls) {
        if (!pickup) return pickup;
        const list = walls || [];
        for (let i = 0; i < list.length; i += 1) {
            const wall = list[i];
            if (!wall) continue;
            if (pickup.x >= wall.x + wall.w || pickup.x + pickup.w <= wall.x) continue;
            if (pickup.y >= wall.y + wall.h || pickup.y + pickup.h <= wall.y) continue;
            if ((pickup.vy || 0) >= 0 && pickup.y + pickup.h - wall.y <= 20) {
                pickup.y = wall.y - pickup.h;
                pickup.vy = 0;
            } else {
                pickup.vx = -(pickup.vx || 0);
                if (pickup.x + pickup.w / 2 < wall.x + wall.w / 2) pickup.x = wall.x - pickup.w;
                else pickup.x = wall.x + wall.w;
            }
        }
        return pickup;
    }

    function updatePickups(dt) {
        pickups.forEach(function (pickup) {
            if (pickup.taken) return;
            if (pickup.life != null) {
                pickup.life -= dt;
                if (pickup.life <= 0) pickup.taken = true;
            }
            pickup.vy += phy.GRAVITY * dt;
            if (pickup.vy > phy.MAX_FALL) pickup.vy = phy.MAX_FALL;
            pickup.x += pickup.vx * dt;
            pickup.y += pickup.vy * dt;
            steerPickup(pickup, solids());
            if (rectsOverlap(player, pickup)) applyPickup(pickup);
        });
    }

    function updatePose(dt) {
        if (!player.onGround) player.pose = 'jump';
        else if (Math.abs(player.vx) > 20) {
            player.pose = 'run';
            player.runTimer += dt;
            if (player.runTimer > 0.09) {
                player.runTimer = 0;
                player.runFrame = (player.runFrame + 1) % 4;
            }
        }         else player.pose = 'idle';
        const poseEl = document.getElementById('pose-label');
        if (poseEl) {
            let label = player.pose === 'jump' ? '跳跃' : player.pose === 'run' ? '奔跑' : '站立';
            if (playerPowered) label += '·大';
            if (playerCanThrow) label += '·弹';
            if (heldCube) label += '·块';
            if (performance.now() < starUntil) label += '·星';
            poseEl.textContent = label;
        }
    }

    // 移动平台:正弦往返;玩家站在上面时随台移动
    function updateMovingPlatforms(now) {
        (level.platforms || []).forEach(function (p) {
            p.dx = 0;
            p.dy = 0;
            if (!p.mv) return;
            if (p.baseX === undefined) { p.baseX = p.x; p.baseY = p.y; }
            const mv = p.mv;
            const t = (Number(now) || 0) / 1000;
            const off = Math.sin(t * (mv.speed || 1) + (mv.phase || 0)) * (mv.range || 36);
            const nx = mv.axis === 'x' ? p.baseX + off : p.baseX;
            const ny = mv.axis === 'y' ? p.baseY + off : p.baseY;
            p.dx = nx - p.x;
            p.dy = ny - p.y;
            p.x = nx;
            p.y = ny;
        });
        if (player.ride && player.onGround) {
            player.x += player.ride.dx || 0;
            player.y += player.ride.dy || 0;
        }
    }

    // 敌人速度随关卡小幅递增(第10关约1.5倍封顶)
    function enemySpeed() {
        const base = phy.ENEMY_SPEED || 34;
        const id = level ? level.id : 1;
        return base * (1 + Math.min(0.5, (id - 1) * 0.06)) * (USE_PLAY_MODS ? (playMods.enemySpeed || 1) : 1);
    }

    function tickFireworks(dt) {
        fireworks = fireworks.filter(function (f) {
            f.life -= dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.vy += 220 * dt;
            return f.life > 0;
        });
    }

    function update(dt) {
        tickFireworks(dt);
        if (level && level.checkpoints) {
            level.checkpoints.forEach(function (cp) {
                if (cp.saved && (cp.raise || 0) < 1) cp.raise = checkpointRaise(cp.raise, dt);
            });
        }
        if (!playing || !level || won) return;
        const now = performance.now();
        qaDrive(now);
        if (climbingFlag) {
            const slid = flagSlide(player, level.flag, dt, level.groundY);
            player.x = slid.x;
            player.y = slid.y;
            player.vx = 0;
            player.vy = 0;
            player.onGround = slid.done;
            updatePose(dt);
            updateTimerHud();
            updateStarGoalsHud();
            const look = player.facing * (phy.CAMERA_LOOK || 80);
            cameraTarget = Math.max(0, Math.min(level.width - VIEW_W, player.x - VIEW_W * 0.38 + look));
            cameraX += (cameraTarget - cameraX) * Math.min(1, dt * (phy.CAMERA_LERP || 12));
            if (slid.done) {
                fireworks = fireworks.concat(spawnFireworks(level.flag.x, player.y));
                onClear();
            }
            return;
        }
        updateMovingPlatforms(now);
        const speed = input.run ? (phy.SPRINT_SPEED || 340) : phy.RUN_SPEED;
        if (input.left) { player.vx = -speed; player.facing = -1; }
        else if (input.right) { player.vx = speed; player.facing = 1; }
        else {
            player.vx *= phy.FRICTION || 0.82;
            if (Math.abs(player.vx) < 8) player.vx = 0;
        }
        const g = (input.jumpHeld && player.vy < 0) ? phy.HOLD_GRAVITY : phy.GRAVITY;
        player.vy += g * dt;
        if (player.vy > phy.MAX_FALL) player.vy = phy.MAX_FALL;
        const coyoteMs = (USE_PLAY_MODS && playMods.mode === 'easy') ? 140 : (phy.COYOTE_MS || 120);
        if (canJump({ lastGroundedAt: lastGroundedAt, lastJumpPressedAt: lastJumpPressedAt }, now, { coyoteMs: coyoteMs, bufferMs: phy.JUMP_BUFFER_MS || 120 })
            && now - jumpConsumedAt > 80) {
            player.vy = jumpVelocity(input.jumpHeld);
            player.onGround = false;
            player.ride = null;
            lastGroundedAt = -9999;
            lastJumpPressedAt = -9999;
            jumpConsumedAt = now;
            airJumpsUsed = 0;
            sfx.jump();
        } else if (!player.onGround
            && phy.canAirJump(airJumpsUsed, maxAirJumpsForLevel())
            && lastJumpPressedAt > jumpConsumedAt
            && now - lastJumpPressedAt <= (phy.AIR_JUMP_BUFFER_MS || phy.JUMP_BUFFER_MS || 120)) {
            player.vy = phy.AIR_JUMP_VY || -520;
            lastJumpPressedAt = -9999;
            jumpConsumedAt = now;
            airJumpsUsed += 1;
            sfx.jump();
        }
        player.x += player.vx * dt;
        solids().forEach(function (platform) {
            if (!rectsOverlap(player, platform)) return;
            if (!player.vx) return;
            if (skipSidePushOnHeadBump(player, platform)) return;
            // 最小穿透轴:横向穿透小于纵向重叠才水平推出,否则交给竖直解算
            // (修复:下落按住方向键时,全宽地面把玩家瞬移到关卡边缘)
            const penX = player.vx > 0
                ? (player.x + player.w) - platform.x
                : platform.x + platform.w - player.x;
            const penY = (player.y + player.h) - platform.y;
            if (penX >= penY) return;
            if (player.vx > 0) player.x = platform.x - player.w;
            else player.x = platform.x + platform.w;
        });
        player.y += player.vy * dt;
        player.onGround = false;
        const bumpCandidates = [];
        solids().forEach(function (platform) {
            if (!rectsOverlap(player, platform)) return;
            const feetInto = player.y + player.h - platform.y;
            if (player.vy >= 0 && feetInto < Math.max(28, player.vy * dt + 12)) {
                player.y = platform.y - player.h;
                player.vy = 0;
                player.onGround = true;
                player.ride = platform.mv ? platform : null;
            } else if (player.vy < 0) {
                const fromBelow = player.y >= platform.y + platform.h - 10;
                if (fromBelow) {
                    if (isBumpBlock(platform)) bumpCandidates.push(platform);
                    player.y = platform.y + platform.h;
                    player.vy = 0;
                } else if (feetInto > 0 && feetInto < (platform.h || 40) * 0.55) {
                    player.y = platform.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                    player.ride = platform.mv ? platform : null;
                }
            }
        });
        if (bumpCandidates.length) {
            bumpBlock(pickBumpTarget(player, bumpCandidates) || bumpCandidates[0], now);
        }
        (level.platforms || []).forEach(function (p) {
            if (p.lift) p.lift = Math.max(0, p.lift - 70 * dt);
        });
        (level.blocks || []).forEach(function (b) {
            if (b.lift) b.lift = Math.max(0, b.lift - 70 * dt);
        });
        if (!player.onGround) player.ride = null;
        if (player.onGround) {
            lastGroundedAt = now;
            airJumpsUsed = 0;
            if (scene === 'over' && player.x > lastSafeX + 40) {
                lastSafeX = player.x;
                lastSafeY = player.y;
            }
            if (scene === 'over') trySaveCheckpoint();
            tryWarpPipe();
        }
        player.x = Math.max(0, Math.min(level.width - player.w, player.x));
        if (player.y > VIEW_H + 80) respawnAtCheckpoint(now);

        const starActive = now < starUntil;
        const shielded = starActive || phy.isInvincible(now, lastHitAt, phy.INVINCIBLE_MS);
        const obstacles = enemyObstacles();
        const walkBounds = { left: 0, right: level.width, floors: groundRects(level) };
        level.enemies.forEach(function (enemy) {
            if (enemy.x < -100) return;
            if (enemy.state === 'flat') {
                const crush = tickCrush(enemy, dt);
                enemy.life = crush.life;
                if (crush.gone) enemy.x = -9999;
                return;
            }
            if (enemy.kind === 'plant') {
                const home = { x: enemy.pipeX != null ? enemy.pipeX : enemy.x - 8, y: (level.groundY || 400) - 60, w: 48, h: 60 };
                enemy.visible = plantVisible(now, 1400, 1600, enemy.x * 3);
                if (standingOnPipe(player, home)) enemy.visible = false;
                if (!enemy.visible) return;
            } else if (enemy.kind === 'bat') {
                enemy.x += (enemy.dir || 1) * enemySpeed() * dt * 1.15;
                if (enemy.x < 40 || enemy.x > level.width - 80) enemy.dir = -(enemy.dir || 1);
                enemy.y = (level.groundY || 400) - 120 + Math.sin(now / 260 + enemy.x / 40) * 18;
            } else if (enemy.kind === 'beetle' && enemy.state === 'shell') {
                if (enemy.wakeAt && now >= enemy.wakeAt) {
                    enemy.state = 'walk';
                    enemy.h = 36;
                    enemy.y = enemyStandY(enemy, solids(), level.groundY);
                    enemy.slideVx = 0;
                }
            } else if (enemy.kind === 'beetle' && enemy.state === 'slide') {
                const dir = (enemy.slideVx || 0) >= 0 ? 1 : -1;
                const moved = enemyAdvance(enemy, Math.abs(enemy.slideVx || 320) * dt, obstacles, walkBounds);
                enemy.x = moved.x;
                enemy.dir = moved.dir;
                if (moved.dir !== dir) enemy.slideVx = -(enemy.slideVx || 320);
                level.enemies.forEach(function (other) {
                    if (other === enemy || other.x < -100) return;
                    if (!rectsOverlap(enemy, other)) return;
                    const ox = other.x;
                    const oy = other.y;
                    flattenEnemy(other);
                    sfx.stomp();
                    spawnFloat(ox, oy - 6, '撞!', '#ffd02f');
                });
            } else {
                const moved = enemyAdvance(enemy, enemySpeed() * dt, obstacles, walkBounds);
                enemy.x = moved.x;
                enemy.dir = moved.dir;
            }
            if (enemy.x < -100) return;
            if (!rectsOverlap(player, enemy)) return;
            if (player.vy > 0 && player.y + player.h - enemy.y < 20) {
                const stomp = applyStomp(enemy, player.x);
                player.vy = -340;
                if (now - lastStompAt < 2000) stompCombo += 1;
                else stompCombo = 1;
                lastStompAt = now;
                sfx.stomp();
                if (stomp.state === 'gone') {
                    const ex = enemy.x;
                    const ey = enemy.y;
                    flattenEnemy(enemy);
                    spawnFloat(ex, ey - 6, stompCombo > 1 ? ('连踩 x' + stompCombo) : '踩!', '#7ee07a');
                } else {
                    enemy.state = stomp.state;
                    enemy.slideVx = stomp.vx;
                    enemy.wakeAt = stomp.wakeIn ? now + stomp.wakeIn : 0;
                    enemy.h = 22;
                    enemy.y = enemyStandY(enemy, solids(), level.groundY);
                    spawnFloat(enemy.x, enemy.y - 6, stomp.state === 'slide' ? '踢!' : '缩!', '#7ee07a');
                    if (stomp.state === 'shell') sayCompanionThrottled('shell', now);
                }
                sayCompanionThrottled('stomp', now);
                return;
            }
            if (enemy.kind === 'beetle' && enemy.state === 'shell') {
                const kick = applyStomp(enemy, player.x);
                enemy.state = kick.state;
                enemy.slideVx = kick.vx;
                enemy.wakeAt = 0;
                sfx.stomp();
                spawnFloat(enemy.x, enemy.y - 6, '踢!', '#ffd02f');
                return;
            }
            if (shielded) {
                if (starActive) {
                    const ex = enemy.x;
                    const ey = enemy.y;
                    flattenEnemy(enemy);
                    sfx.stomp();
                    spawnFloat(ex, ey - 6, '砰!', '#ffe566');
                }
                return;
            }
            lastHitAt = now;
            if (playerCanThrow) {
                playerCanThrow = false;
                player.vy = -180;
                sfx.hurt();
                toast('弹跳果掉了');
                return;
            }
            if (playerPowered) {
                playerPowered = false;
                player.vy = -180;
                sfx.hurt();
                toast('变大保护挡了一下');
                return;
            }
            hearts -= 1;
            updateHeartsHud();
            sfx.hurt();
            player.vy = -220;
            if (hearts <= 0) {
                hearts = phy.START_HEARTS || 5;
                updateHeartsHud();
                respawnAtCheckpoint(now);
                toast('没心了，回到刚才的地方');
            } else {
                toast('碰到了，闪几下再跑');
                sayCompanion(companionLine('hit'));
            }
        });

        if (scene === 'over') {
            level.coins.forEach(function (coin) {
                if (coin.taken) return;
                if (rectsOverlap(player, { x: coin.x, y: coin.y, w: 22, h: 22 })) {
                    coin.taken = true;
                    addCoin(now, 1);
                    spawnPop(coin.x, coin.y);
                    spawnFloat(coin.x, coin.y - 8, '+1', '#ffd02f');
                }
            });
        }
        updatePickups(dt);
        const shotFloors = solids();
        shots = shots.map(function (shot) {
            return bounceShot(shot, dt, shotFloors, phy.GRAVITY, phy.MAX_FALL);
        }).filter(function (shot) { return shot && !shot.dead; });
        shots.forEach(function (shot) {
            level.enemies.forEach(function (enemy) {
                if (enemy.x < -100 || shot.dead || enemy.state === 'flat') return;
                if (!rectsOverlap(shot, enemy)) return;
                if (enemy.kind === 'beetle') {
                    const kick = applyStomp({ kind: 'beetle', state: 'shell', x: enemy.x, w: enemy.w }, shot.x);
                    enemy.state = 'slide';
                    enemy.slideVx = kick.vx;
                    enemy.h = 22;
                    enemy.y = enemyStandY(enemy, solids(), level.groundY);
                    shot.dead = true;
                    sfx.stomp();
                    spawnFloat(shot.x, shot.y - 6, '踢!', '#ffd02f');
                    return;
                }
                flattenEnemy(enemy);
                shot.dead = true;
                sfx.stomp();
                spawnFloat(shot.x, shot.y - 6, '中!', '#ffd02f');
            });
        });
        shots = shots.filter(function (shot) { return !shot.dead; });
        underCoins.forEach(function (coin) {
            if (coin.taken) return;
            if (rectsOverlap(player, { x: coin.x, y: coin.y, w: 22, h: 22 })) {
                coin.taken = true;
                addCoin(now, 1);
                spawnPop(coin.x, coin.y);
                spawnFloat(coin.x, coin.y - 8, '+1', '#ffd02f');
            }
        });
        pops = pops.filter(function (p) {
            p.life -= dt;
            p.y -= 90 * dt;
            return p.life > 0;
        });
        floats = floats.filter(function (f) {
            f.life -= dt;
            f.y += f.vy * dt;
            return f.life > 0;
        });
        debris = debris.filter(function (d) {
            d.life -= dt;
            d.vy += 520 * dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            return d.life > 0;
        });

        if (touchingFlag(player, level.flag)) {
            climbingFlag = true;
            sayCompanion('冲到旗杆了，顺着滑下去。');
        }
        updatePose(dt);
        updateTimerHud();
        updateStarGoalsHud();
        const look = player.facing * (phy.CAMERA_LOOK || 80);
        cameraTarget = Math.max(0, Math.min(level.width - VIEW_W, player.x - VIEW_W * 0.38 + look));
        const lerp = Math.min(1, dt * (phy.CAMERA_LERP || 12));
        cameraX += (cameraTarget - cameraX) * lerp;
    }

    function clearTips(star, rounded) {
        const tips = [];
        if (coins < level.coins.length) {
            tips.push('还差 ' + (level.coins.length - coins) + ' 枚金币拿第二星');
        }
        if (rounded > level.parTime) {
            tips.push('再快 ' + Math.max(1, Math.ceil(rounded - level.parTime)) + ' 秒可拿速度星');
        }
        if (star >= 3) tips.push('三星全收！');
        else if (tips.length === 0) tips.push('再练一次冲三星');
        return tips;
    }

    function onClear() {
        if (won || awarding) return;
        won = true;
        awarding = true;
        playing = false;
        sfx.clear();
        document.getElementById('run-status').textContent = '通关！';
        const elapsed = (performance.now() - startTime) / 1000;
        const rounded = Math.round(elapsed * 10) / 10;
        if (!progress.bestTime) progress.bestTime = {};
        const prevBest = progress.bestTime[level.id];
        const isNewRecord = !prevBest || rounded < prevBest;
        if (isNewRecord) progress.bestTime[level.id] = rounded;
        if (isNewRecord && gameSfx && gameSfx.record) gameSfx.record();

        let star = 1;
        if (coins >= level.coins.length) star += 1;
        const timeForStar = Math.min(rounded, progress.bestTime[level.id] || rounded);
        if (timeForStar <= level.parTime) star += 1;
        star = Math.min(3, star);

        progress.stars[level.id] = Math.max(Number(progress.stars[level.id] || 0), star);
        if (progress.clearedLevels.indexOf(level.id) === -1) progress.clearedLevels.push(level.id);
        progress.coinsTotal = (progress.coinsTotal || 0) + coins;
        if (progress.unlockedLevel < level.id + 1 && level.id < levelsApi.count) {
            progress.unlockedLevel = level.id + 1;
        }
        bridge.saveProgress(GAME_ID, progress);

        const bonus = star >= 3 ? 5 : star >= 2 ? 2 : 0;
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: 'level-' + level.id + '-clear',
            amount: level.rewardSun + bonus,
            reason: '通关横版第' + level.id + '关'
        });
        if (typeof bridge.grantProgressPoints === 'function') {
            bridge.grantProgressPoints(GAME_ID, 3 + star, 'clear-level-' + level.id);
        }
        if (typeof bridge.recordPlaySession === 'function') bridge.recordPlaySession(GAME_ID);
        const tips = clearTips(star, rounded);
        const msg = award.awarded
            ? `通关 ${level.title}！★×${star} · ${rounded}s · +${award.amount} 阳光`
            : `通关！★×${star} · ${rounded}s · ${award.reason}`;
        toast(msg + ' · ' + tips[0]);
        updateStarGoalsHud();
        refreshWallet();
        const lines = buildRunSummary({
            time: rounded,
            coins: coins,
            stars: star,
            isNewRecord: isNewRecord,
            parTime: level.parTime,
            levelId: level.id,
            meta: (bridge.getMetaSummary && bridge.getMetaSummary()) || {}
        });
        if (lines && lines.gain && prevBest) {
            lines.gain += ' · 上次 ' + formatBestTime(prevBest);
        }
        showSettleLayer(lines);
        if (isNewRecord) sayCompanion(companionLine('record'));
        setTimeout(showMap, 2200);
    }

    function drawSprite(img, x, y, maxW, maxH, flipX) {
        if (!img) return false;
        const size = spriteDestSize(img.naturalWidth, img.naturalHeight, maxW, maxH);
        const box = snapDrawRect(x + (maxW - size.w) / 2, y + (maxH - size.h), size.w, size.h);
        ctx.save();
        ctx.imageSmoothingEnabled = (img.naturalWidth / box.w) > 2;
        ctx.imageSmoothingQuality = 'high';
        if (flipX) {
            ctx.translate(box.x + box.w, box.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, box.w, box.h);
        } else ctx.drawImage(img, box.x, box.y, box.w, box.h);
        ctx.restore();
        return true;
    }

    function heroImage() {
        // 本地主角三件套:idle/run/jump 连贯动作帧;run 时 run/idle 交替成走路节奏
        if (player.pose === 'jump') return images.jump || images.walkA || images.idle;
        if (player.pose === 'run') {
            const frames = [images.walkA, images.walkB, images.walkC, images.walkD];
            return frames[player.runFrame % 4] || images.walkA || images.idle;
        }
        return images.idle || images.walkA;
    }

    // 主角绘制:contain-fit + 底部中心锚点 + 跳跃倾角(上升抬头、下落前倾)
    function drawHero(img, x, y, maxW, maxH, flipX, tilt) {
        if (!img) return false;
        const ratio = img.naturalWidth / img.naturalHeight;
        let dw = maxW;
        let dh = dw / ratio;
        if (dh > maxH) { dh = maxH; dw = dh * ratio; }
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(x + maxW / 2, y + maxH);
        ctx.rotate(flipX ? -tilt : tilt);
        if (flipX) ctx.scale(-1, 1);
        ctx.drawImage(img, -dw / 2, -dh, dw, dh);
        ctx.restore();
        return true;
    }

    function drawParallaxBack() {
        // 天空图已含远山和云
    }

    // 地面 = 草方块行 + 泥土行(与方块世界同一套代码地砖)
    function drawGround() {
        const TILE = TILE_SIZE;
        const x0 = Math.floor(cameraX / TILE) * TILE;
        const x1 = cameraX + VIEW_W + TILE;
        const floors = groundRects(level);
        function covered(x) {
            return floors.some(function (g) { return x + TILE > g.x && x < g.x + g.w; });
        }
        if (pixels) {
            for (let x = x0; x < x1; x += TILE) {
                if (!covered(x)) continue;
                pixels.drawTile(ctx, 'grass', x, level.groundY, TILE);
            }
            for (let y = level.groundY + TILE; y < VIEW_H; y += TILE) {
                for (let x = x0; x < x1; x += TILE) {
                    if (!covered(x)) continue;
                    pixels.drawTile(ctx, 'dirt', x, y, TILE);
                }
            }
            return;
        }
        floors.forEach(function (g) {
            ctx.fillStyle = '#4fbf3a';
            ctx.fillRect(g.x, level.groundY, g.w, 18);
            ctx.fillStyle = '#8a5a2b';
            ctx.fillRect(g.x, level.groundY + 18, g.w, VIEW_H - level.groundY - 18);
        });
    }

    function draw() {
        if (!level || document.getElementById('panel-play').classList.contains('is-hidden')) return;
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
        ctx.imageSmoothingEnabled = false;
        const now = Date.now();
        ctx.save();
        ctx.translate(-Math.round(cameraX), 0);
        const skyImg = images[skyKey] || images['sky-day'];
        if (skyImg) {
            for (let x = Math.floor(cameraX / VIEW_W) * VIEW_W; x < cameraX + VIEW_W + VIEW_W; x += VIEW_W) {
                ctx.drawImage(skyImg, x, 0, VIEW_W, level.groundY);
            }
        } else {
            const sky = ctx.createLinearGradient(0, 0, 0, level.groundY);
            sky.addColorStop(0, '#5ec8f5');
            sky.addColorStop(1, '#b8eefc');
            ctx.fillStyle = sky;
            ctx.fillRect(cameraX, 0, VIEW_W, level.groundY);
        }
        if (scene === 'under') {
            ctx.fillStyle = 'rgba(12, 10, 32, .38)';
            ctx.fillRect(cameraX, 0, VIEW_W, level.groundY);
        }
        drawParallaxBack(now);
        drawGround();

        level.platforms.forEach(function (p) {
            if (p.broken) return;
            const lift = p.lift || 0;
            if (p.mv) {
                if (decor) decor.platformSlice(ctx, p.x, p.y - 2, p.w, p.h + 6);
                else {
                    ctx.fillStyle = '#e08a28';
                    ctx.fillRect(p.x, p.y, p.w, p.h);
                }
                return;
            }
            if (p.stair || p.type === 'brick') {
                if (decor) decor.drawBrick(ctx, p.x, p.y - lift, p.w || TILE_SIZE);
                else if (pixels) pixels.drawTile(ctx, 'stone', p.x, p.y - lift, p.h || TILE_SIZE);
                else {
                    ctx.fillStyle = '#c65a22';
                    ctx.fillRect(p.x, p.y - lift, p.w, p.h);
                }
                return;
            }
            if (pixels) pixels.drawTile(ctx, 'grass', p.x, p.y - lift, p.h || TILE_SIZE);
            else if (decor) decor.platformSlice(ctx, p.x, p.y - 2 - lift, p.w, p.h + 6);
            else {
                ctx.fillStyle = '#4fbf3a';
                ctx.fillRect(p.x, p.y - lift, p.w, p.h);
            }
        });
        (level.blocks || []).forEach(function (block) {
            if (block.broken) return;
            const lift = block.lift || 0;
            const kind = block.type === 'brick' ? 'block-brick' : 'block-question';
            if (decor) {
                if (kind === 'block-brick') decor.drawBrick(ctx, block.x, block.y - lift, block.w);
                else decor.drawQuestion(ctx, block.x, block.y - lift, block.w, block.hit);
            } else {
                ctx.fillStyle = kind === 'block-brick' ? '#c65a22' : '#f0b020';
                ctx.fillRect(block.x, block.y - lift, block.w, block.h);
            }
        });
        pickups.forEach(function (pickup) {
            if (pickup.taken) return;
            if (!decor) return;
            const bob = Math.sin(now / 140 + pickup.x / 18) * 2;
            if (pickup.kind === 'star') {
                decor.drawStar(ctx, pickup.x, pickup.y + bob, pickup.w + 4, Math.floor(now / 180) % 2);
            } else if (pickup.kind === 'mushroom') {
                decor.drawShroom(ctx, pickup.x, pickup.y + bob, pickup.w);
            } else if (pickup.kind === 'cube') {
                decor.drawBrick(ctx, pickup.x, pickup.y, pickup.w);
            } else if (pickup.kind === 'ball' && decor.drawBall) {
                decor.drawBall(ctx, pickup.x, pickup.y + bob, pickup.w, Math.floor(now / 120) % 2);
            } else if (pickup.kind === 'ball') {
                ctx.fillStyle = '#ffb020';
                ctx.beginPath();
                ctx.arc(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, pickup.w / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        (level.checkpoints || []).forEach(function (cp) {
            ctx.fillStyle = cp.saved ? 'rgba(255, 208, 47, .30)' : 'rgba(255, 255, 255, .18)';
            ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
            ctx.strokeStyle = 'rgba(62, 44, 65, .25)';
            ctx.strokeRect(cp.x + 0.5, cp.y + 0.5, cp.w - 1, cp.h - 1);
            if (decor) decor.checkpoint(ctx, cp.x, cp.y, cp.w, cp.h, cp.saved, cp.raise);
        });
        pops.forEach(function (pop) {
            ctx.globalAlpha = Math.max(0, pop.life / 0.45);
            if (decor) decor.drawCoin(ctx, pop.x, pop.y, 18, Math.floor(now / 90) % 4);
            ctx.globalAlpha = 1;
        });
        floats.forEach(function (f) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, f.life / 0.35);
            ctx.fillStyle = f.color;
            ctx.font = 'bold 17px sans-serif';
            ctx.strokeStyle = 'rgba(62, 44, 65, .45)';
            ctx.lineWidth = 3;
            ctx.strokeText(f.text, f.x, f.y);
            ctx.fillText(f.text, f.x, f.y);
            ctx.restore();
        });
        debris.forEach(function (d) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, d.life / 0.55);
            ctx.fillStyle = d.color;
            ctx.fillRect(d.x, d.y, d.w, d.h);
            ctx.restore();
        });
        fireworks.forEach(function (f) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, f.life / 0.85);
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        allPipes().forEach(function (p) {
            if (decor) decor.pipe(ctx, p.x, p.y, p.w, p.h);
        });
        const coinList = scene === 'under' ? underCoins : level.coins;
        coinList.forEach(function (coin, i) {
            if (coin.taken) return;
            const bounce = Math.sin(now / 220 + i) * 3;
            if (decor) decor.drawCoin(ctx, coin.x, coin.y + bounce, 24, Math.floor(now / 140 + i) % 4);
        });
        shots.forEach(function (shot) {
            if (shot.kind === 'cube' && decor) {
                decor.drawBrick(ctx, shot.x, shot.y, shot.w);
            } else if (decor && decor.drawBall) {
                decor.drawBall(ctx, shot.x, shot.y, shot.w + 4, Math.floor(now / 80) % 2);
            } else {
                ctx.fillStyle = '#ffb020';
                ctx.beginPath();
                ctx.arc(shot.x + shot.w / 2, shot.y + shot.h / 2, shot.w / 2 + 1, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        level.enemies.forEach(function (enemy) {
            if (enemy.x < -100) return;
            if (enemy.kind === 'plant' && !enemy.visible) return;
            if (enemy.state === 'flat') ctx.globalAlpha = Math.max(0.2, (enemy.life || 0) / 0.42);
            const walk = Math.floor(now / 160 + enemy.x / 24) % 3;
            const kind = enemy.kind || 'shroom';
            let frames;
            if (kind === 'beetle' && (enemy.state === 'shell' || enemy.state === 'slide')) {
                frames = [images['enemy-shell'], images['enemy-shell'], images['enemy-shell']];
            } else if (kind === 'beetle') {
                frames = [images['enemy-beetle'], images['enemy-beetle-b'], images['enemy-beetle-c']];
            } else if (kind === 'leaf') {
                frames = [images['enemy-leaf'], images['enemy-leaf-b'], images['enemy-leaf-c']];
            } else if (kind === 'plant') {
                frames = [images['enemy-plant'], images['enemy-plant-b'], images['enemy-plant']];
            } else if (kind === 'bat') {
                frames = [images['enemy-bat'], images['enemy-bat'], images['enemy-bat']];
            } else {
                frames = [images['enemy-shroom'], images['enemy-shroom-b'], images['enemy-shroom-c']];
            }
            const eImg = frames[walk] || frames[0] || images['enemy-shroom'] || images['enemy-slime'];
            if (eImg) drawSprite(eImg, enemy.x, enemy.y, enemy.w, enemy.h, enemy.dir < 0);
            ctx.globalAlpha = 1;
        });
        if (decor) decor.flag(ctx, level.flag.x, level.flag.y, level.flag.w, level.flag.h, Math.floor(now / 400) % 2);
        const blink = (phy.isInvincible(performance.now(), lastHitAt, phy.INVINCIBLE_MS)
            || performance.now() < starUntil)
            && Math.floor(performance.now() / 80) % 2 === 0;
            const drawW = playerPowered ? Math.round(player.w * 1.5) : player.w;
            const drawH = playerPowered ? Math.round(player.h * 1.5) : player.h;
            const drawY = playerPowered ? player.y - Math.round(player.h * 0.5) : player.y;
        if (!blink) {
            const heroImg = heroImage();
            let drawn = heroImg ? drawHero(heroImg, player.x, drawY, drawW, drawH, player.facing < 0, 0) : false;
            if (!drawn && pixels) {
                const frame = player.pose === 'jump' ? 3
                    : player.pose === 'run' ? (player.runFrame === 0 ? 1 : 2) : 0;
                const sw = 32;
                const sh = 55;
                const dx = Math.round(player.x + (drawW - sw) / 2);
                const dy = Math.round(drawY + drawH - sh);
                ctx.save();
                if (player.facing < 0) {
                    ctx.translate(dx + sw, dy);
                    ctx.scale(-1, 1);
                    pixels.drawSprite(ctx, 'explorer', 0, 0, sw, sh, frame);
                } else {
                    pixels.drawSprite(ctx, 'explorer', dx, dy, sw, sh, frame);
                }
                ctx.restore();
                drawn = true;
            }
            if (!drawn) {
                ctx.fillStyle = playerPowered ? '#ff6b52' : '#e54139';
                ctx.fillRect(player.x, drawY + 14, drawW, drawH - 14);
            }
        }
        if (playerPowered || playerCanThrow) {
            ctx.strokeStyle = playerCanThrow ? 'rgba(255, 160, 40, .7)' : 'rgba(255, 208, 47, .45)';
            ctx.lineWidth = 2;
            ctx.strokeRect(player.x - 2, drawY - 2, drawW + 4, drawH + 4);
        }
        if (heldCube && decor) {
            decor.drawBrick(ctx, player.x + 8, drawY - 20, 18);
        }
        ctx.restore();
        if (won) {
            ctx.fillStyle = 'rgba(62,44,65,.4)';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 26px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('冲线成功！', VIEW_W / 2, VIEW_H / 2 - 24);
            const stars = Math.max(0, Math.min(3, Number(progress.stars[level.id]) || 0));
            ctx.font = '20px sans-serif';
            ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), VIEW_W / 2, VIEW_H / 2 + 8);
            ctx.textAlign = 'left';
        }
    }

    function loop(ts) {
        const now = ts || 0;
        const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
        last = now;
        try {
            update(dt);
            draw();
            if (canvas && canvas.dataset) {
                canvas.dataset.px = String(Math.round(player.x));
                canvas.dataset.py = String(Math.round(player.y));
                canvas.dataset.scene = scene;
            }
        } catch (err) {
            const status = document.getElementById('run-status');
            if (status) status.textContent = '循环出错';
        }
        requestAnimationFrame(loop);
    }

    function bind() {
        const unlock = function () { sfx.unlock(); };
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('keydown', function (e) {
            const k = e.key.toLowerCase();
            if (k === 'a' || k === 'arrowleft') input.left = true;
            if (k === 'd' || k === 'arrowright') input.right = true;
            if (k === 's' || k === 'arrowdown') input.down = true;
            if (k === 'shift') {
                if (!input.run) tryThrow(performance.now());
                input.run = true;
            }
            if (k === 'j') tryThrow(performance.now());
            if (k === 'w' || k === 'arrowup' || k === ' ') {
                if (!input.jumpHeld) lastJumpPressedAt = performance.now();
                input.jumpHeld = true;
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', function (e) {
            const k = e.key.toLowerCase();
            if (k === 'a' || k === 'arrowleft') input.left = false;
            if (k === 'd' || k === 'arrowright') input.right = false;
            if (k === 's' || k === 'arrowdown') input.down = false;
            if (k === 'shift') input.run = false;
            if (k === 'w' || k === 'arrowup' || k === ' ') input.jumpHeld = false;
        });
        document.querySelectorAll('[data-hold]').forEach(function (button) {
            const dir = button.dataset.hold;
            const set = function (v) {
                if (dir === 'left') input.left = v;
                if (dir === 'right') input.right = v;
                if (dir === 'down') input.down = v;
                if (dir === 'run') {
                    if (v && !input.run) tryThrow(performance.now());
                    input.run = v;
                }
            };
            button.addEventListener('pointerdown', function (e) { set(true); button.setPointerCapture(e.pointerId); });
            button.addEventListener('pointerup', function () { set(false); });
            button.addEventListener('pointercancel', function () { set(false); });
        });
        document.querySelectorAll('[data-action="jump"]').forEach(function (jumpBtn) {
            jumpBtn.addEventListener('pointerdown', function (e) {
                lastJumpPressedAt = performance.now();
                input.jumpHeld = true;
                jumpBtn.setPointerCapture(e.pointerId);
            });
            jumpBtn.addEventListener('pointerup', function () { input.jumpHeld = false; });
            jumpBtn.addEventListener('pointercancel', function () { input.jumpHeld = false; });
        });
        document.getElementById('restart-btn').addEventListener('click', function () {
            if (won) enterLevel(levelId);
            else resetRun();
        });
        const restRedeem = document.getElementById('rest-redeem-btn');
        if (restRedeem) {
            restRedeem.addEventListener('click', function () {
                if (!bridge.grantPlayPass) return;
                const r = bridge.grantPlayPass(GAME_ID, { source: 'redeem' });
                if (!r.ok) {
                    toast(r.reason === '阳光不够' ? '阳光还不够，先去做任务攒一点' : '今天先休息，明天再冲');
                    showRest(r.pass);
                    return;
                }
                toast('阳光兑换成功，可以再冲一次');
                hideRest();
                refreshWallet();
                renderMap();
            });
        }
        const restWorkbench = document.getElementById('rest-workbench-btn');
        if (restWorkbench) {
            restWorkbench.addEventListener('click', function () {
                location.href = bridge.backHref('platform-quest');
            });
        }
        document.getElementById('back-map-btn').addEventListener('click', showMap);
        document.getElementById('map-btn').addEventListener('click', showMap);
        document.getElementById('fullscreen-btn').addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        const settleClose = document.getElementById('settle-close-btn');
        if (settleClose) settleClose.addEventListener('click', hideSettleLayer);
        document.getElementById('back-link').href = bridge.backHref('platform-quest');
    }

    loadProgress();
    refreshPlayMods();
    updateModBadge();
    bind();
    if (qaEnabled) {
        window.__pqQa = {
            state: function () {
                return {
                    x: Math.round(player.x),
                    y: Math.round(player.y),
                    vx: Math.round(player.vx),
                    vy: Math.round(player.vy),
                    scene: scene,
                    hearts: hearts,
                    coins: coins,
                    won: won,
                    playing: playing,
                    pose: player.pose
                };
            },
            hold: function (name, on) {
                if (name === 'jump') {
                    input.jumpHeld = !!on;
                    if (on) lastJumpPressedAt = performance.now();
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(input, name)) input[name] = !!on;
            }
        };
    }
    loadAssets().then(function () {
        showMap();
        // ?level=N 直达关卡(验收后段关卡用;不写进度解锁)
        const direct = parseInt(new URLSearchParams(location.search).get('level'), 10);
        if (Number.isInteger(direct) && direct >= 1 && direct <= levelsApi.count) {
            enterLevel(direct);
        }
        requestAnimationFrame(loop);
    });
})();
