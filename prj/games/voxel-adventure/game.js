(function () {
    'use strict';

    /**
     * 方块世界 · 史蒂夫横版过关（可打怪）
     * 不再使用等距沙盒
     */
    const bridge = window.WorkbenchGameBridge;
    const levelsApi = window.VoxelLevels;
    const GAME_ID = 'voxel-adventure';
    const VIEW_W = 960;
    const VIEW_H = 480;

    const canvas = document.getElementById('world-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;

    const LOCAL = './assets/';
    const THEME = '../../assets/generated/preschool-theme-assets/voxel-v1/published/';
    const ASSET = {
        idle: LOCAL + 'hero/steve-idle.png',
        run: LOCAL + 'hero/steve-run.png',
        enemy: LOCAL + 'enemies/creeper.png',
        crystal: THEME + 'voxel-purple-crystal.png',
        grass: THEME + 'voxel-grass-block.png',
        sky: LOCAL + 'bg/sky-day.png',
        flag: '../../assets/generated/preschool-theme-assets/platform-v1/published/platform-flag.png'
    };

    const images = {};
    let progress = null;
    let level = null;
    let levelId = 1;
    let playing = false;
    let won = false;
    let crystals = 0;
    let cameraX = 0;
    let last = 0;

    const player = {
        x: 48, y: 320, w: 40, h: 52,
        vx: 0, vy: 0, onGround: false, facing: 1, runFrame: 0, runTimer: 0
    };
    const input = { left: false, right: false, jump: false };

    function toast(msg) {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { el.classList.remove('is-on'); }, 2400);
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
            loadImage('idle', ASSET.idle, THEME + 'voxel-companion.png'),
            loadImage('run', ASSET.run, ASSET.idle),
            loadImage('enemy', ASSET.enemy),
            loadImage('crystal', ASSET.crystal),
            loadImage('grass', ASSET.grass),
            loadImage('sky', ASSET.sky),
            loadImage('flag', ASSET.flag)
        ]);
    }

    function loadProgress() {
        progress = bridge.getProgress(GAME_ID).progress;
        if (!progress.unlockedLevel) progress.unlockedLevel = 1;
        if (!Array.isArray(progress.clearedLevels)) progress.clearedLevels = [];
        // 兼容旧任务字段
        if (!Array.isArray(progress.questsDone)) progress.questsDone = [];
        if (!Number.isFinite(progress.crystalsTotal)) progress.crystalsTotal = 0;
        bridge.saveProgress(GAME_ID, progress);
    }

    function refreshWallet() {
        const w = bridge.getWallet();
        document.getElementById('wallet-hud').innerHTML =
            `<span class="chip">阳光 <b>${w.sunlight}</b></span>` +
            `<span class="chip">晶体 <b>${progress.crystalsTotal || 0}</b></span>` +
            `<span class="chip">星芒 Lv.<b>${w.petLevel}</b></span>`;
    }

    function renderMap() {
        const map = document.getElementById('level-map');
        map.innerHTML = '';
        levelsApi.list.forEach(function (lv) {
            const locked = lv.id > progress.unlockedLevel;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'stage-card' + (locked ? ' is-locked' : '');
            btn.disabled = locked;
            const cleared = progress.clearedLevels.indexOf(lv.id) !== -1;
            btn.innerHTML = `<div>第 ${lv.id} 关 · ${lv.title}</div>` +
                `<small>${cleared ? '已通关' : locked ? '未解锁' : '可挑战'} · 奖 ${lv.rewardSun} 阳光</small>`;
            if (!locked) btn.addEventListener('click', function () { enterLevel(lv.id); });
            map.appendChild(btn);
        });
        document.getElementById('progress-tip').textContent =
            `解锁第 ${progress.unlockedLevel} 关 · 通关 ${progress.clearedLevels.length} · 晶体 ${progress.crystalsTotal}`;
        refreshWallet();
    }

    function showMap() {
        playing = false;
        document.getElementById('panel-map').classList.remove('is-hidden');
        document.getElementById('panel-play').classList.add('is-hidden');
        renderMap();
    }

    function enterLevel(id) {
        levelId = id;
        level = levelsApi.get(id);
        resetRun();
        document.getElementById('level-title').textContent = `第 ${level.id} 关 · ${level.title}`;
        document.getElementById('panel-map').classList.add('is-hidden');
        document.getElementById('panel-play').classList.remove('is-hidden');
        playing = true;
        won = false;
    }

    function resetRun() {
        player.x = 48; player.y = 320; player.vx = 0; player.vy = 0;
        player.onGround = false; player.facing = 1;
        crystals = 0; cameraX = 0; won = false;
        if (level) {
            level = levelsApi.get(levelId);
        }
        document.getElementById('crystal-count').textContent = '0';
        document.getElementById('run-status').textContent = '奔跑中';
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function solids() {
        return [{ x: 0, y: level.groundY, w: level.width, h: 100 }].concat(level.platforms);
    }

    function update(dt) {
        if (!playing || !level || won) return;
        const speed = 240;
        player.vx = 0;
        if (input.left) { player.vx -= speed; player.facing = -1; }
        if (input.right) { player.vx += speed; player.facing = 1; }
        if (Math.abs(player.vx) > 20) {
            player.runTimer += dt;
            if (player.runTimer > 0.12) {
                player.runTimer = 0;
                player.runFrame = 1 - player.runFrame;
            }
        }
        player.vy += 1500 * dt;
        if (input.jump && player.onGround) {
            player.vy = -560;
            player.onGround = false;
            input.jump = false;
        }
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        player.onGround = false;
        solids().forEach(function (p) {
            if (!rectsOverlap(player, p)) return;
            const prevBottom = player.y + player.h - player.vy * dt;
            if (player.vy >= 0 && prevBottom <= p.y + 10) {
                player.y = p.y - player.h;
                player.vy = 0;
                player.onGround = true;
            } else if (player.vy < 0) {
                player.y = p.y + p.h;
                player.vy = 0;
            } else if (player.vx > 0) player.x = p.x - player.w;
            else if (player.vx < 0) player.x = p.x + p.w;
        });
        player.x = Math.max(0, Math.min(level.width - player.w, player.x));
        if (player.y > VIEW_H + 80) resetRun();

        level.enemies.forEach(function (enemy) {
            enemy.x += enemy.dir * 80 * dt;
            if (enemy.x < enemy.minX || enemy.x > enemy.maxX) enemy.dir *= -1;
            if (enemy.x < -100) return;
            if (rectsOverlap(player, enemy)) {
                if (player.vy > 0 && player.y + player.h - enemy.y < 22) {
                    enemy.x = -9999;
                    player.vy = -340;
                } else resetRun();
            }
        });

        const bonus = ((bridge.getMetaBonuses && bridge.getMetaBonuses()) || {}).voxelCrystalBonus || 0;
        level.crystals.forEach(function (c) {
            if (c.taken) return;
            if (rectsOverlap(player, { x: c.x, y: c.y, w: 24, h: 24 })) {
                c.taken = true;
                crystals += 1 + bonus;
                document.getElementById('crystal-count').textContent = String(crystals);
            }
        });

        if (rectsOverlap(player, level.flag)) onClear();
        cameraX = Math.max(0, Math.min(level.width - VIEW_W, player.x - VIEW_W * 0.35));
    }

    function onClear() {
        if (won) return;
        won = true;
        playing = false;
        document.getElementById('run-status').textContent = '通关！';
        if (progress.clearedLevels.indexOf(level.id) === -1) progress.clearedLevels.push(level.id);
        // 同步任务进度：用通关数映射 questsDone 数量，兼容首页统计
        while (progress.questsDone.length < progress.clearedLevels.length) {
            progress.questsDone.push('level-' + (progress.questsDone.length + 1));
        }
        progress.crystalsTotal = (progress.crystalsTotal || 0) + crystals;
        if (progress.unlockedLevel < level.id + 1 && level.id < levelsApi.count) {
            progress.unlockedLevel = level.id + 1;
        }
        progress.rank = Math.min(5, 1 + Math.floor(progress.clearedLevels.length / 2));
        bridge.saveProgress(GAME_ID, progress);
        const award = bridge.awardSunlight({
            gameId: GAME_ID,
            eventKey: 'level-' + level.id + '-clear',
            amount: level.rewardSun,
            reason: '史蒂夫通关第' + level.id + '关'
        });
        if (bridge.grantProgressPoints) bridge.grantProgressPoints(GAME_ID, 4, 'clear-' + level.id);
        if (bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
        toast(award.awarded ? `通关！晶体 ${crystals} · +${award.amount} 阳光` : `通关！${award.reason}`);
        refreshWallet();
        setTimeout(showMap, 1400);
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

    function draw() {
        if (!level || document.getElementById('panel-play').classList.contains('is-hidden')) return;
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
        ctx.save();
        ctx.translate(-cameraX, 0);

        if (images.sky) {
            for (let x = Math.floor(cameraX / VIEW_W) * VIEW_W; x < cameraX + VIEW_W + VIEW_W; x += VIEW_W) {
                ctx.drawImage(images.sky, x, 0, VIEW_W, level.groundY);
            }
        } else {
            ctx.fillStyle = '#6ec8f5';
            ctx.fillRect(cameraX, 0, VIEW_W, level.groundY);
        }

        // 地面：方块铺设
        const tile = 48;
        for (let x = 0; x < level.width; x += tile) {
            if (images.grass) ctx.drawImage(images.grass, x, level.groundY - 8, tile, tile);
            else {
                ctx.fillStyle = '#6ec34f';
                ctx.fillRect(x, level.groundY, tile, 20);
            }
        }
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(0, level.groundY + 36, level.width, VIEW_H - level.groundY);

        level.platforms.forEach(function (p) {
            if (images.grass) {
                for (let x = p.x; x < p.x + p.w; x += 40) {
                    ctx.drawImage(images.grass, x, p.y - 10, Math.min(40, p.x + p.w - x), 36);
                }
            } else {
                ctx.fillStyle = '#7fca55';
                ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        });

        level.crystals.forEach(function (c) {
            if (c.taken) return;
            const bounce = Math.sin(Date.now() / 200 + c.x) * 3;
            if (images.crystal) ctx.drawImage(images.crystal, c.x, c.y + bounce, 28, 28);
            else {
                ctx.fillStyle = '#b59bff';
                ctx.fillRect(c.x, c.y + bounce, 20, 20);
            }
        });

        level.enemies.forEach(function (enemy) {
            if (enemy.x < -100) return;
            if (images.enemy) ctx.drawImage(images.enemy, enemy.x, enemy.y, enemy.w, enemy.h);
            else {
                ctx.fillStyle = '#3d8b40';
                ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
            }
        });

        if (images.flag) ctx.drawImage(images.flag, level.flag.x, level.flag.y, 48, level.flag.h);
        else {
            ctx.fillStyle = '#e54139';
            ctx.fillRect(level.flag.x, level.flag.y, 30, 24);
        }

        const pose = !player.onGround ? 'idle' : (Math.abs(player.vx) > 20 ? 'run' : 'idle');
        const himg = pose === 'run' && player.runFrame === 0 && images.run ? images.run : (images.idle || images.run);
        if (!drawSprite(himg, player.x, player.y, player.w, player.h, player.facing < 0)) {
            ctx.fillStyle = '#3e8cde';
            ctx.fillRect(player.x, player.y + 12, player.w, player.h - 12);
        }

        ctx.restore();
        if (won) {
            ctx.fillStyle = 'rgba(30,40,60,.45)';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 26px sans-serif';
            ctx.fillText('通关！晶体 ' + crystals, VIEW_W / 2 - 80, VIEW_H / 2);
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
            if (k === 'w' || k === 'arrowup' || k === ' ') { input.jump = true; e.preventDefault(); }
        });
        window.addEventListener('keyup', function (e) {
            const k = e.key.toLowerCase();
            if (k === 'a' || k === 'arrowleft') input.left = false;
            if (k === 'd' || k === 'arrowright') input.right = false;
        });
        document.querySelectorAll('[data-hold]').forEach(function (button) {
            const dir = button.dataset.hold;
            const set = function (v) {
                if (dir === 'left') input.left = v;
                if (dir === 'right') input.right = v;
            };
            button.addEventListener('pointerdown', function (e) { set(true); button.setPointerCapture(e.pointerId); });
            button.addEventListener('pointerup', function () { set(false); });
            button.addEventListener('pointercancel', function () { set(false); });
        });
        document.querySelector('[data-action="jump"]').addEventListener('click', function () { input.jump = true; });
        document.getElementById('restart-btn').addEventListener('click', resetRun);
        document.getElementById('back-map-btn').addEventListener('click', showMap);
        document.getElementById('map-btn').addEventListener('click', showMap);
        document.getElementById('fullscreen-btn').addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        document.getElementById('back-link').href = bridge.backHref('voxel-adventure');
    }

    // 兼容旧 CSS 类名
    if (!document.querySelector('.stage-map') && document.getElementById('level-map')) {
        document.getElementById('level-map').classList.add('stage-map');
    }

    loadProgress();
    if (bridge.recordPlaySession) {
        const play = bridge.recordPlaySession(GAME_ID);
        if (play && play.awards && play.awards.length) {
            setTimeout(function () { toast(play.awards.map(function (a) { return a.title; }).join(' · ')); }, 400);
        }
    }
    bind();
    loadAssets().then(function () {
        showMap();
        requestAnimationFrame(loop);
    });
})();
