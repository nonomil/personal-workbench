(function () {
    'use strict';

    const bridge = window.WorkbenchGameBridge;
    const levelsApi = window.PlatformLevels;
    const GAME_ID = 'platform-quest';

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    const VIEW_W = 960;
    const VIEW_H = 480;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    const PUB = '../../assets/generated/preschool-theme-assets/platform-v1/published/';
    const LOCAL = './assets/';
    const ASSET = {
        idle: PUB + 'platform-explorer.png',
        run: LOCAL + 'hero/explorer-run.png',
        jump: LOCAL + 'hero/explorer-jump.png',
        idleFallback: PUB + 'platform-explorer.png',
        coin: PUB + 'platform-coin.png',
        platform: PUB + 'platform-grass-platform.png',
        flag: PUB + 'platform-flag.png',
        pipe: PUB + 'platform-pipe.png',
        enemy: PUB + 'platform-star-badge.png',
        'block-question': PUB + 'platform-mystery-block.png',
        'block-brick': PUB + 'platform-brick.png',
        ground: LOCAL + 'ground/ground-strip.png',
        dirt: LOCAL + 'ground/dirt-tile.png',
        'sky-day': LOCAL + 'bg/sky-day.png',
        'sky-sunset': LOCAL + 'bg/sky-sunset.png',
        'sky-night': LOCAL + 'bg/sky-night.png',
        'enemy-brownie': LOCAL + 'enemies/enemy-brownie.png',
        'enemy-slime': LOCAL + 'enemies/enemy-slime.png'
    };

    const images = {};
    let progress = null;
    let level = null;
    let levelId = 1;
    let skyKey = 'sky-day';
    let enemyKey = 'enemy';
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

    function loadAssets() {
        return Promise.all([
            loadImage('idle', ASSET.idle, ASSET.idleFallback),
            loadImage('run', ASSET.run, ASSET.idleFallback),
            loadImage('jump', ASSET.jump, ASSET.idleFallback),
            loadImage('coin', ASSET.coin),
            loadImage('platform', ASSET.platform),
            loadImage('flag', ASSET.flag),
            loadImage('pipe', ASSET.pipe),
            loadImage('enemy', ASSET.enemy),
            loadImage('sky-day', ASSET['sky-day']),
            loadImage('sky-sunset', ASSET['sky-sunset']),
            loadImage('sky-night', ASSET['sky-night']),
            loadImage('enemy-brownie', ASSET['enemy-brownie'], ASSET.enemy),
            loadImage('enemy-slime', ASSET['enemy-slime'], ASSET.enemy),
            loadImage('block-question', ASSET['block-question']),
            loadImage('block-brick', ASSET['block-brick']),
            loadImage('ground', ASSET.ground),
            loadImage('dirt', ASSET.dirt)
        ]);
    }

    function themeForLevel(id) {
        if (id >= 8) return { sky: 'sky-night', enemy: 'enemy-slime' };
        if (id >= 4) return { sky: 'sky-sunset', enemy: id % 2 === 0 ? 'enemy-slime' : 'enemy-brownie' };
        return { sky: 'sky-day', enemy: 'enemy-brownie' };
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
        player.onGround = false; player.facing = 1; player.pose = 'idle';
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
        lastHitAt = now || performance.now();
        airJumpsUsed = 0;
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

    function update(dt) {
        if (!playing || !level || won) return;
        const now = performance.now();
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
            lastGroundedAt = -9999;
            lastJumpPressedAt = -9999;
            jumpConsumedAt = now;
            airJumpsUsed = 0;
        } else if (!player.onGround
            && phy.canAirJump(airJumpsUsed, maxAirJumpsForLevel())
            && lastJumpPressedAt > jumpConsumedAt
            && now - lastJumpPressedAt <= (phy.AIR_JUMP_BUFFER_MS || phy.JUMP_BUFFER_MS || 120)) {
            player.vy = phy.AIR_JUMP_VY || -520;
            lastJumpPressedAt = -9999;
            jumpConsumedAt = now;
            airJumpsUsed += 1;
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
            } else if (player.vy < 0) {
                player.y = platform.y + platform.h;
                player.vy = 0;
                if (platform.type === 'question' || platform.type === 'brick') bumpBlock(platform, now);
            }
        });
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
            enemy.x += enemy.dir * (phy.ENEMY_SPEED || 34) * dt;
            if (enemy.x < enemy.minX || enemy.x > enemy.maxX) enemy.dir *= -1;
            if (enemy.x < -100) return;
            if (!rectsOverlap(player, enemy)) return;
            if (player.vy > 0 && player.y + player.h - enemy.y < 20) {
                enemy.x = -9999;
                player.vy = -340;
                if (now - lastStompAt < 2000) stompCombo += 1;
                else stompCombo = 1;
                lastStompAt = now;
                spawnFloat(enemy.x, enemy.y - 6, stompCombo > 1 ? ('连踩 x' + stompCombo) : '踩!', '#7ee07a');
                return;
            }
            if (shielded) {
                if (starActive) {
                    enemy.x = -9999;
                    spawnFloat(enemy.x, enemy.y - 6, '砰!', '#ffe566');
                }
                return;
            }
            lastHitAt = now;
            if (playerPowered) {
                playerPowered = false;
                player.vx = player.facing * -140;
                player.vy = -180;
                toast('变大保护挡了一下');
                return;
            }
            hearts -= 1;
            updateHeartsHud();
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
        if (flipX) {
            ctx.translate(dx + dw, dy);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, dw, dh);
        } else ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        return true;
    }

    function heroImage() {
        if (player.pose === 'jump' && images.jump) return images.jump;
        if (player.pose === 'run') return (player.runFrame === 0 && images.run) ? images.run : (images.idle || images.run);
        return images.idle || images.run || images.jump;
    }

    function draw() {
        if (!level || document.getElementById('panel-play').classList.contains('is-hidden')) return;
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
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
        // 地面：单层草皮 + 渐变泥土（避免横截面图平铺出“重复山丘”）
        const gy = level.groundY;
        const grassH = 18;
        const dirtGrad = ctx.createLinearGradient(0, gy + grassH, 0, gy + 140);
        dirtGrad.addColorStop(0, '#a06838');
        dirtGrad.addColorStop(0.45, '#8b5a2b');
        dirtGrad.addColorStop(1, '#6b4423');
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(0, gy + grassH, level.width, VIEW_H - gy + 80);

        if (images.platform) {
            const slice = 64;
            for (let x = 0; x < level.width; x += slice) {
                const w = Math.min(slice, level.width - x);
                ctx.drawImage(images.platform, x, gy - 8, w, grassH + 14);
            }
        } else {
            ctx.fillStyle = '#5db845';
            ctx.fillRect(0, gy, level.width, grassH);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, .28)';
        ctx.fillRect(0, gy, level.width, 3);
        ctx.fillStyle = 'rgba(40, 28, 18, .28)';
        ctx.fillRect(0, gy + grassH - 1, level.width, 4);

        level.platforms.forEach(function (p) {
            if (images.platform) {
                const slice = 48;
                for (let x = p.x; x < p.x + p.w; x += slice) {
                    const w = Math.min(slice, p.x + p.w - x);
                    ctx.drawImage(images.platform, x, p.y - 8, w, p.h + 18);
                }
            } else {
                ctx.fillStyle = '#e08a28';
                ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        });
        (level.blocks || []).forEach(function (block) {
            if (block.broken) return;
            const imgKey = block.type === 'brick'
                ? (block.hit ? 'block-brick' : 'block-brick')
                : (block.hit ? 'block-brick' : 'block-question');
            const img = images[imgKey] || images['block-question'];
            if (img) ctx.drawImage(img, block.x, block.y, block.w, block.h);
            else {
                ctx.fillStyle = block.type === 'brick' ? '#c65a22' : '#f0b020';
                ctx.fillRect(block.x, block.y, block.w, block.h);
            }
        });
        pickups.forEach(function (pickup) {
            if (pickup.taken) return;
            if (pickup.kind === 'star' && images.enemy) {
                ctx.drawImage(images.enemy, pickup.x, pickup.y, pickup.w, pickup.h);
            } else if (images.coin) {
                ctx.drawImage(images.coin, pickup.x, pickup.y, pickup.w, pickup.h);
            }
        });
        (level.checkpoints || []).forEach(function (cp) {
            ctx.fillStyle = cp.saved ? 'rgba(255, 208, 47, .55)' : 'rgba(255, 255, 255, .35)';
            ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
            ctx.strokeStyle = 'rgba(62, 44, 65, .25)';
            ctx.strokeRect(cp.x + 0.5, cp.y + 0.5, cp.w - 1, cp.h - 1);
        });
        pops.forEach(function (pop) {
            ctx.globalAlpha = Math.max(0, pop.life / 0.45);
            if (images.coin) ctx.drawImage(images.coin, pop.x, pop.y, 18, 18);
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
        if (images.pipe && level.pipe) ctx.drawImage(images.pipe, level.pipe.x, level.pipe.y, level.pipe.w, level.pipe.h);
        level.coins.forEach(function (coin, i) {
            if (coin.taken) return;
            const bounce = Math.sin(Date.now() / 220 + i) * 3;
            if (images.coin) ctx.drawImage(images.coin, coin.x, coin.y + bounce, 24, 24);
        });
        level.enemies.forEach(function (enemy, ei) {
            if (enemy.x < -100) return;
            const eImg = images[enemyKey] || images.enemy || images['enemy-brownie'];
            if (eImg) {
                // 交替两种怪增加变化
                const alt = (ei % 2 === 0) ? eImg : (images['enemy-slime'] || images['enemy-brownie'] || eImg);
                ctx.drawImage(alt, enemy.x, enemy.y, enemy.w, enemy.h);
            }
        });
        if (images.flag) ctx.drawImage(images.flag, level.flag.x, level.flag.y, 48, level.flag.h);
        const blink = (phy.isInvincible(performance.now(), lastHitAt, phy.INVINCIBLE_MS)
            || performance.now() < starUntil)
            && Math.floor(performance.now() / 80) % 2 === 0;
        const drawW = playerPowered ? player.w + 6 : player.w;
        const drawH = playerPowered ? player.h + 8 : player.h;
        const drawY = playerPowered ? player.y - 8 : player.y;
        if (!blink && !drawSprite(heroImage(), player.x, drawY, drawW, drawH, player.facing < 0)) {
            ctx.fillStyle = playerPowered ? '#ff6b52' : '#e54139';
            ctx.fillRect(player.x, drawY + 14, drawW, drawH - 14);
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
        requestAnimationFrame(loop);
    });
})();
