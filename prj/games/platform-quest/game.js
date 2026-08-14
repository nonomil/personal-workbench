(function () {
    'use strict';

    const bridge = window.WorkbenchGameBridge;
    const levelsApi = window.PlatformLevels;
    const pixels = window.VoxelPixelTiles;
    const decor = window.PlatformPixelDecor;
    const GAME_ID = 'platform-quest';

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    const VIEW_W = 960;
    const VIEW_H = 480;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    // Paper-MC 家族贴图:水管工主角(world-rebuild 批次三帧) + 同批小怪,地砖由 pixel-tiles.js 代码绘制
    // 主角帧缺失时回退到跳跳侠 4 帧,再回退旧探险家帧,保证离线可玩
    const LOCAL = './assets/';
    const ASSET = {
        idle: LOCAL + 'hero/hero-idle.png',
        walkA: LOCAL + 'hero/hero-run.png',
        walkB: LOCAL + 'hero/hero-run.png',
        jump: LOCAL + 'hero/hero-jump.png',
        idleLegacy: LOCAL + 'hero/jumper-idle.png',
        walkALegacy: LOCAL + 'hero/jumper-walk-a.png',
        walkBLegacy: LOCAL + 'hero/jumper-walk-b.png',
        jumpLegacy: LOCAL + 'hero/jumper-jump.png',
        'sky-day': LOCAL + 'bg/sky-day.png?v=20260814-mario-sky-v1',
        'sky-sunset': LOCAL + 'bg/sky-sunset.png?v=20260814-mario-sky-v1',
        'sky-night': LOCAL + 'bg/sky-night.png?v=20260814-mario-sky-v1',
        'enemy-shroom': LOCAL + 'enemies/enemy-brownie.png',
        'enemy-slime': LOCAL + 'enemies/enemy-slime.png',
        'enemy-bat': LOCAL + 'enemies/bat-idle.png'
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
    let stompCombo = 0;
    let lastStompAt = -9999;

    const player = {
        x: 48, y: 320, w: 40, h: 52,
        vx: 0, vy: 0, onGround: false, facing: 1,
        pose: 'idle', runFrame: 0, runTimer: 0
    };
    const input = { left: false, right: false, jumpHeld: false, run: false };
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
            bump: function () { tone(170, 0.07, 'square', 0.09, 120); }
        };
    }());

    function loadAssets() {
        return Promise.all([
            loadImage('idle', ASSET.idle, ASSET.idleLegacy),
            loadImage('walkA', ASSET.walkA, ASSET.walkALegacy),
            loadImage('walkB', ASSET.walkB, ASSET.walkBLegacy),
            loadImage('jump', ASSET.jump, ASSET.jumpLegacy),
            loadImage('sky-day', ASSET['sky-day']),
            loadImage('sky-sunset', ASSET['sky-sunset']),
            loadImage('sky-night', ASSET['sky-night']),
            loadImage('enemy-shroom', ASSET['enemy-shroom']),
            loadImage('enemy-slime', ASSET['enemy-slime']),
            loadImage('enemy-bat', ASSET['enemy-bat'])
        ]);
    }

    function themeForLevel(id) {
        if (id >= 8) return { sky: 'sky-night', enemy: 'enemy-bat' };
        if (id >= 4) return { sky: 'sky-sunset', enemy: id % 2 === 0 ? 'enemy-slime' : 'enemy-shroom' };
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

    function refreshWallet() {
        const w = bridge.getWallet();
        document.getElementById('wallet-hud').innerHTML =
            `<span class="chip">阳光 <b>${w.sunlight}</b></span>` +
            `<span class="chip">星芒 Lv.<b>${w.petLevel}</b></span>` +
            `<span class="chip">生涯金币 <b>${progress.coinsTotal || 0}</b></span>`;
    }

    function starsText(id) {
        const n = Number(progress.stars[id] || 0);
        return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
    }

    const LEVEL_TIPS = {
        1: '1–4 关可在空中连跳两次',
        2: '先顶问号拿蘑菇，再碎砖块',
        3: '星星无敌时碰怪也会消失',
        5: '从这里起空中只能再跳一次',
        6: '中间亮块是检查点，掉坑会回到那里',
        7: '检查点在中段，别跳过',
        10: '收齐金币并限时冲旗，拿满三星'
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
                if (best) meta.textContent = best + 's 最佳';
                else meta.textContent = '≤' + lv.parTime + 's';
                btn.appendChild(meta);
            }
            if (!locked) btn.addEventListener('click', function () { enterLevel(lv.id); });
            map.appendChild(btn);
        });
        document.getElementById('progress-tip').textContent =
            progress.clearedLevels.length + ' / ' + levelsApi.count;
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

    function enterLevel(id) {
        levelId = id;
        level = levelsApi.get(id);
        const theme = themeForLevel(level.id);
        skyKey = theme.sky;
        enemyKey = theme.enemy;
        // normalize platforms array shape [x,y,w,h]
        level.platforms = (level.platforms || []).map(function (p) {
            if (Array.isArray(p)) return { x: p[0], y: p[1], w: p[2], h: p[3] };
            return p;
        });
        resetRun();
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
        coins = 0; won = false; awarding = false; cameraX = 0; cameraTarget = 0; pops = []; floats = [];
        stompCombo = 0;
        lastStompAt = -9999;
        lastGroundedAt = -9999;
        lastJumpPressedAt = -9999;
        jumpConsumedAt = -9999;
        lastHitAt = -9999;
        starUntil = -1;
        playerPowered = false;
        hearts = phy.START_HEARTS || 5;
        pickups = [];
        airJumpsUsed = 0;
        lastSafeX = 48;
        lastSafeY = 320;
        if (level) {
            level.coins.forEach(function (c) { c.taken = false; });
            const fresh = levelsApi.get(levelId);
            level.enemies = fresh.enemies;
            level.coins = fresh.coins;
            level.blocks = fresh.blocks || [];
            level.checkpoints = fresh.checkpoints || [];
        }
        document.getElementById('coin-count').textContent = '0 / ' + (level ? level.coins.length : 0);
        document.getElementById('run-status').textContent = '奔跑中';
        updateHeartsHud();
        updateTimerHud();
        updateStarGoalsHud();
        const poseEl = document.getElementById('pose-label');
        if (poseEl) poseEl.textContent = '站立';
    }

    function respawnAtCheckpoint(now) {
        player.x = lastSafeX;
        player.y = lastSafeY;
        player.vx = 0;
        player.vy = 0;
        player.ride = null;
        lastHitAt = now || performance.now();
        airJumpsUsed = 0;
        sfx.fall();
        toast('掉下去了，回到刚才的地方');
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function solids() {
        const ground = { x: 0, y: level.groundY, w: level.width, h: 100 };
        const pipe = level.pipe || { x: 0, y: 9999, w: 0, h: 0 };
        const blocks = (level.blocks || []).filter(function (b) { return !b.broken; });
        return [ground, pipe].concat(level.platforms).concat(blocks);
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
            lastSafeX = cp.x + 8;
            lastSafeY = cp.y - player.h;
            if (lastSafeY > level.groundY - player.h) lastSafeY = level.groundY - player.h;
            toast('记录检查点');
        });
    }

    function bumpBlock(block, now) {
        const canBreak = playerPowered || now < starUntil;
        sfx.bump();
        if (block.type === 'brick') {
            if (canBreak && !block.broken) {
                block.broken = true;
                if (block.item === 'coin') {
                    addCoin(now, 1);
                    spawnPop(block.x + 8, block.y - 12);
                }
                toast('砖块碎啦');
            } else if (!block.broken) {
                toast(playerPowered ? '顶砖块' : '变大或星星才能碎砖');
            }
            return;
        }
        if (block.hit) return;
        block.hit = true;
        if (block.item === 'coin') {
            addCoin(now, 1);
            spawnPop(block.x + 8, block.y - 12);
            toast('惊喜块 · +1 金币');
            return;
        }
        spawnPickup(block.x + 4, block.y - 28, block.item);
        toast(block.item === 'star' ? '星星飞出来啦！' : '蘑菇飞出来啦！');
    }

    function spawnPickup(x, y, kind) {
        pickups.push({
            kind: kind,
            x: x,
            y: y,
            w: 28,
            h: 28,
            vx: 46,
            vy: -120,
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
        }
    }

    function updatePickups(dt) {
        pickups.forEach(function (pickup) {
            if (pickup.taken) return;
            pickup.vy += phy.GRAVITY * dt;
            if (pickup.vy > phy.MAX_FALL) pickup.vy = phy.MAX_FALL;
            pickup.x += pickup.vx * dt;
            pickup.y += pickup.vy * dt;
            solids().forEach(function (platform) {
                if (!rectsOverlap(pickup, platform)) return;
                if (pickup.vy >= 0 && pickup.y + pickup.h - platform.y < 16) {
                    pickup.y = platform.y - pickup.h;
                    pickup.vy = 0;
                }
            });
            if (rectsOverlap(player, pickup)) applyPickup(pickup);
        });
    }

    function updatePose(dt) {
        if (!player.onGround) player.pose = 'jump';
        else if (Math.abs(player.vx) > 20) {
            player.pose = 'run';
            player.runTimer += dt;
            if (player.runTimer > 0.12) {
                player.runTimer = 0;
                player.runFrame = (player.runFrame + 1) % 2;
            }
        }         else player.pose = 'idle';
        const poseEl = document.getElementById('pose-label');
        if (poseEl) {
            let label = player.pose === 'jump' ? '跳跃' : player.pose === 'run' ? '奔跑' : '站立';
            if (playerPowered) label += '·大';
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
        return base * (1 + Math.min(0.5, (id - 1) * 0.06));
    }

    function update(dt) {
        if (!playing || !level || won) return;
        const now = performance.now();
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
        if (phy.tryJump(now, lastGroundedAt, lastJumpPressedAt, phy.COYOTE_MS, phy.JUMP_BUFFER_MS)
            && now - jumpConsumedAt > 80) {
            player.vy = phy.JUMP_VY;
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
            if (player.vx > 0) player.x = platform.x - player.w;
            else if (player.vx < 0) player.x = platform.x + platform.w;
        });
        player.y += player.vy * dt;
        player.onGround = false;
        solids().forEach(function (platform) {
            if (!rectsOverlap(player, platform)) return;
            if (player.vy >= 0 && player.y + player.h - platform.y < Math.max(18, player.vy * dt + 8)) {
                player.y = platform.y - player.h;
                player.vy = 0;
                player.onGround = true;
                player.ride = platform.mv ? platform : null;
            } else if (player.vy < 0) {
                player.y = platform.y + platform.h;
                player.vy = 0;
                if (platform.type === 'question' || platform.type === 'brick') bumpBlock(platform, now);
            }
        });
        if (!player.onGround) player.ride = null;
        if (player.onGround) {
            lastGroundedAt = now;
            airJumpsUsed = 0;
            if (player.x > lastSafeX + 40) {
                lastSafeX = player.x;
                lastSafeY = player.y;
            }
            trySaveCheckpoint();
        }
        player.x = Math.max(0, Math.min(level.width - player.w, player.x));
        if (player.y > VIEW_H + 80) respawnAtCheckpoint(now);

        const starActive = now < starUntil;
        const shielded = starActive || phy.isInvincible(now, lastHitAt, phy.INVINCIBLE_MS);
        level.enemies.forEach(function (enemy) {
            enemy.x += enemy.dir * enemySpeed() * dt;
            if (enemy.x < enemy.minX || enemy.x > enemy.maxX) enemy.dir *= -1;
            if (enemy.x < -100) return;
            if (!rectsOverlap(player, enemy)) return;
            if (player.vy > 0 && player.y + player.h - enemy.y < 20) {
                enemy.x = -9999;
                player.vy = -340;
                if (now - lastStompAt < 2000) stompCombo += 1;
                else stompCombo = 1;
                lastStompAt = now;
                sfx.stomp();
                spawnFloat(enemy.x, enemy.y - 6, stompCombo > 1 ? ('连踩 x' + stompCombo) : '踩!', '#7ee07a');
                return;
            }
            if (shielded) {
                if (starActive) {
                    enemy.x = -9999;
                    sfx.stomp();
                    spawnFloat(enemy.x, enemy.y - 6, '砰!', '#ffe566');
                }
                return;
            }
            lastHitAt = now;
            if (playerPowered) {
                playerPowered = false;
                player.vx = player.facing * -140;
                player.vy = -180;
                sfx.hurt();
                toast('变大保护挡了一下');
                return;
            }
            hearts -= 1;
            updateHeartsHud();
            sfx.hurt();
            player.vx = player.facing * -180;
            player.x += player.facing * -28;
            player.vy = -220;
            if (hearts <= 0) {
                hearts = 3;
                updateHeartsHud();
                respawnAtCheckpoint(now);
                toast('没心了，回到刚才的地方');
            } else {
                toast('碰到了，闪几下再跑');
            }
        });

        level.coins.forEach(function (coin) {
            if (coin.taken) return;
            if (rectsOverlap(player, { x: coin.x, y: coin.y, w: 22, h: 22 })) {
                coin.taken = true;
                addCoin(now, 1);
                spawnPop(coin.x, coin.y);
                spawnFloat(coin.x, coin.y - 8, '+1', '#ffd02f');
            }
        });
        updatePickups(dt);
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

        if (rectsOverlap(player, level.flag)) onClear();
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
        if (!prevBest || rounded < prevBest) progress.bestTime[level.id] = rounded;

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
        setTimeout(showMap, 1600);
    }

    function drawSprite(img, x, y, maxW, maxH, flipX) {
        if (!img) return false;
        const ratio = img.naturalWidth / img.naturalHeight;
        let dw = maxW;
        let dh = dw / ratio;
        if (dh > maxH) { dh = maxH; dw = dh * ratio; }
        const dx = x + (maxW - dw) / 2;
        const dy = y + (maxH - dh);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (flipX) {
            ctx.translate(dx + dw, dy);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, dw, dh);
        } else ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        return true;
    }

    function heroImage() {
        // 本地主角三件套:idle/run/jump 连贯动作帧;run 时 run/idle 交替成走路节奏
        if (player.pose === 'jump') return images.jump || images.walkA || images.idle;
        if (player.pose === 'run') {
            return (player.runFrame === 0 ? images.walkA : images.walkB) || images.idle;
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
        const TILE = 32;
        const x0 = Math.floor(cameraX / TILE) * TILE;
        const x1 = cameraX + VIEW_W + TILE;
        if (pixels) {
            for (let x = x0; x < x1; x += TILE) pixels.drawTile(ctx, 'grass', x, level.groundY, TILE);
            for (let y = level.groundY + TILE; y < VIEW_H; y += TILE) {
                for (let x = x0; x < x1; x += TILE) pixels.drawTile(ctx, 'dirt', x, y, TILE);
            }
            return;
        }
        ctx.fillStyle = '#4fbf3a';
        ctx.fillRect(cameraX, level.groundY, VIEW_W + TILE, 18);
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(cameraX, level.groundY + 18, VIEW_W + TILE, VIEW_H - level.groundY - 18);
    }

    function draw() {
        if (!level || document.getElementById('panel-play').classList.contains('is-hidden')) return;
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
        ctx.imageSmoothingEnabled = false;
        const now = Date.now();
        ctx.save();
        ctx.translate(-cameraX, 0);
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
        drawParallaxBack(now);
        drawGround();

        level.platforms.forEach(function (p) {
            if (decor) {
                decor.platformSlice(ctx, p.x, p.y - 2, p.w, p.h + 6);
            } else {
                ctx.fillStyle = '#e08a28';
                ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        });
        (level.blocks || []).forEach(function (block) {
            if (block.broken) return;
            const kind = block.type === 'brick' ? 'block-brick' : 'block-question';
            if (decor) {
                if (kind === 'block-brick') decor.drawBrick(ctx, block.x, block.y, block.w);
                else decor.drawQuestion(ctx, block.x, block.y, block.w, block.hit);
            } else {
                ctx.fillStyle = kind === 'block-brick' ? '#c65a22' : '#f0b020';
                ctx.fillRect(block.x, block.y, block.w, block.h);
            }
        });
        pickups.forEach(function (pickup) {
            if (pickup.taken) return;
            if (!decor) return;
            if (pickup.kind === 'star') {
                decor.drawStar(ctx, pickup.x, pickup.y, pickup.w + 4, Math.floor(now / 180) % 2);
            } else if (pickup.kind === 'mushroom') {
                decor.drawShroom(ctx, pickup.x, pickup.y, pickup.w);
            }
        });
        (level.checkpoints || []).forEach(function (cp) {
            ctx.fillStyle = cp.saved ? 'rgba(255, 208, 47, .30)' : 'rgba(255, 255, 255, .18)';
            ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
            ctx.strokeStyle = 'rgba(62, 44, 65, .25)';
            ctx.strokeRect(cp.x + 0.5, cp.y + 0.5, cp.w - 1, cp.h - 1);
            if (decor) decor.checkpoint(ctx, cp.x, cp.y, cp.w, cp.h, cp.saved);
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
        if (decor && level.pipe) decor.pipe(ctx, level.pipe.x, level.pipe.y, level.pipe.w, level.pipe.h);
        level.coins.forEach(function (coin, i) {
            if (coin.taken) return;
            const bounce = Math.sin(now / 220 + i) * 3;
            if (decor) decor.drawCoin(ctx, coin.x, coin.y + bounce, 24, Math.floor(now / 140 + i) % 4);
        });
        level.enemies.forEach(function (enemy) {
            if (enemy.x < -100) return;
            const eImg = images[enemyKey] || images['enemy-shroom'] || images['enemy-slime'];
            if (!eImg) return;
            const bob = enemyKey === 'enemy-bat' ? Math.sin(now / 260 + enemy.x) * 4 - 8 : 0;
            drawSprite(eImg, enemy.x, enemy.y + bob, enemy.w, enemy.h + 6, enemy.dir < 0);
        });
        if (decor) decor.flag(ctx, level.flag.x, level.flag.y, level.flag.w, level.flag.h, Math.floor(now / 400) % 2);
        const blink = (phy.isInvincible(performance.now(), lastHitAt, phy.INVINCIBLE_MS)
            || performance.now() < starUntil)
            && Math.floor(performance.now() / 80) % 2 === 0;
        const drawW = playerPowered ? player.w + 6 : player.w;
        const drawH = playerPowered ? player.h + 8 : player.h;
        const drawY = playerPowered ? player.y - 8 : player.y;
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
        if (playerPowered) {
            ctx.strokeStyle = 'rgba(255, 208, 47, .45)';
            ctx.lineWidth = 2;
            ctx.strokeRect(player.x - 2, drawY - 2, drawW + 4, drawH + 4);
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
        update(dt);
        draw();
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
            if (k === 'shift') input.run = true;
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
            if (k === 'shift') input.run = false;
            if (k === 'w' || k === 'arrowup' || k === ' ') input.jumpHeld = false;
        });
        document.querySelectorAll('[data-hold]').forEach(function (button) {
            const dir = button.dataset.hold;
            const set = function (v) {
                if (dir === 'left') input.left = v;
                if (dir === 'right') input.right = v;
                if (dir === 'run') input.run = v;
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
        document.getElementById('restart-btn').addEventListener('click', resetRun);
        document.getElementById('back-map-btn').addEventListener('click', showMap);
        document.getElementById('map-btn').addEventListener('click', showMap);
        document.getElementById('fullscreen-btn').addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        document.getElementById('back-link').href = bridge.backHref('platform-quest');
    }

    loadProgress();
    if (typeof bridge.recordPlaySession === 'function') {
        const play = bridge.recordPlaySession(GAME_ID);
        if (play && play.awards && play.awards.length) {
            setTimeout(function () {
                toast(play.awards.map(function (a) { return a.title; }).join(' · '));
            }, 400);
        }
    }
    bind();
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
