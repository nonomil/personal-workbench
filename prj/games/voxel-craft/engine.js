/**
 * voxel-craft · 渲染与物理引擎（T20260815-voxel-remake S2）
 * MC 16×16 贴图最近邻放大 + destroy_stage 挖掘裂纹 + AABB 网格碰撞。
 * 数值见任务包 steps.md 附录 A（C++ 比例幼儿化）。
 */
(function (global) {
    'use strict';

    const TILE = 32;
    const ENEMIES = global.VoxelCraftEnemies || { list: [] };
    const PHYS = {
        G: 0.42, JUMP: -7.6, MOVE: 3.2, RUN: 5.1,
        WATER_G: 0.16, WATER_MOVE: 1.9, SWIM: -3.0, MAX_FALL: 11,
        STEP_HOP: -6.2 // 台阶自动蹬：走路撞 1 格台阶时的小跳（≈1.4 格升幅）
    };
    const REACH_TILES = 5.5;

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
        torch: 'blocks/torch.png',
        portal: 'blocks/furnace-on.png'
    };
    const DESTROY_STAGES = [0, 2, 4, 6, 8, 9].map(function (n) {
        return 'blocks/destroy_stage_' + n + '.png';
    });
    const FALLBACK = {
        grass: '#5db54a', dirt: '#8a5a2b', stone: '#8d9198', wood: '#7a4a22',
        leaf: '#2f9a3c', plank: '#c48a4a', sand: '#e6d08a', water: '#3f76e4',
        coal: '#3a3a40', crystal: '#9b7cff', bedrock: '#3b3b40', torch: '#ffcc66',
        portal: '#5b3fd4'
    };
    const HERO = {
        steve: './assets/hero/player.png', // 参考项目主角（8×7 帧表），改名避开商标命名门禁
        idle: './assets/hero/explorer-idle.png',
        walkA: './assets/hero/explorer-walk-a.png',
        walkB: './assets/hero/explorer-walk-b.png',
        jump: './assets/hero/explorer-jump.png',
        mine: './assets/hero/explorer-mine.png'
    };
    /** steve.png 是 8×7 帧、每帧 24×24 的精灵表（C++ animated_texture Vector2i(8,7)）：
        行0=待机 行1=走路8帧 行2=跳/落（列0升 列1降） */
    const STEVE = { FW: 24, COLS: 8, ROW_IDLE: 0, ROW_WALK: 1, ROW_AIR: 2 };

    function loadImage(key, src, store) {
        return new Promise(function (resolve) {
            const img = new Image();
            img.onload = function () { store[key] = img; resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = src;
        });
    }

    function loadAllImages() {
        const store = {};
        const jobs = [
            loadImage('skyDay', './assets/bg/sky-day.png', store),
            loadImage('skyDusk', './assets/bg/sky-dusk.png', store),
            loadImage('skyForest', './assets/bg/sky-forest.png', store),
            loadImage('skyDesert', './assets/bg/sky-desert.png', store),
            loadImage('skyNether', './assets/bg/sky-nether.png', store),
            loadImage('decoBush', './assets/deco/deco-bush.png', store),
            loadImage('decoCactus', './assets/deco/deco-cactus.png', store),
            loadImage('decoEmber', './assets/deco/deco-ember.png', store),
            loadImage('hero_steve', HERO.steve, store)
        ].concat(Object.keys(HERO).filter(function (k) { return k !== 'steve'; }).map(function (pose) {
            return loadImage('hero_' + pose, HERO[pose], store);
        })).concat(Object.keys(MC_TEXTURES).map(function (kind) {
            return loadImage('tex_' + kind, MC_DIR + MC_TEXTURES[kind], store);
        })).concat(DESTROY_STAGES.map(function (src, i) {
            return loadImage('destroy' + i, MC_DIR + src, store);
        })).concat((ENEMIES.list || []).map(function (enemy) {
            return loadImage('enemy_' + enemy.id, enemy.sprite, store);
        }));
        return Promise.all(jobs).then(function () { return store; });
    }

    /** AABB 网格碰撞：solidAt(tx,ty) → bool */
    function rectHitsSolid(solidAt, x, y, w, h) {
        const left = Math.floor(x / TILE);
        const right = Math.floor((x + w - 1) / TILE);
        const top = Math.floor(y / TILE);
        const bottom = Math.floor((y + h - 1) / TILE);
        for (let ty = top; ty <= bottom; ty += 1) {
            for (let tx = left; tx <= right; tx += 1) {
                if (solidAt(tx, ty)) return true;
            }
        }
        return false;
    }

    function rectsOverlap(a, b) {
        return !!(a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
    }

    /** 敌人逐帧移动：返回新对象，便于 Node 直测，也避免渲染循环半更新状态。 */
    function updateEnemy(enemy, player, solidAt, dt) {
        const next = Object.assign({}, enemy);
        const stepScale = Math.max(0.25, Number(dt) || 1);
        if (!enemy || enemy.remove || enemy.hp <= 0) return next;
        const behavior = enemy.behavior || 'walker';
        const toward = player && Math.abs((player.x || 0) - enemy.x) < TILE * 12;
        let dir = toward ? ((player.x + (player.w || 0) / 2) >= enemy.x ? 1 : -1) : (enemy.patrolDir || -1);
        if (!dir) dir = 1;
        next.facing = dir;
        next.phase = (Number(enemy.phase) || 0) + stepScale;
        const speed = Math.max(0.2, Number(enemy.speed) || 0.5) * stepScale;

        if (behavior === 'flyer') {
            next.x += dir * speed;
            if (player) {
                const dy = (player.y + (player.h || 0) / 2) - (enemy.y + enemy.h / 2);
                next.y += Math.max(-1.8, Math.min(1.8, dy * 0.02)) * stepScale;
            }
            return next;
        }

        const nx = enemy.x + dir * speed;
        if (!rectHitsSolid(solidAt, nx, enemy.y, enemy.w, enemy.h)) {
            next.x = nx;
        } else {
            next.patrolDir = -dir;
            next.facing = -dir;
        }
        next.vy = Math.min(10, (Number(enemy.vy) || 0) + 0.32 * stepScale);
        const ny = enemy.y + next.vy;
        if (!rectHitsSolid(solidAt, next.x, ny, enemy.w, enemy.h)) {
            next.y = ny;
            next.onGround = false;
        } else {
            next.onGround = next.vy >= 0;
            next.vy = 0;
        }
        if (behavior === 'jumper' && next.onGround && player && Math.abs(player.x - next.x) < TILE * 8) {
            next.vy = -5.2;
            next.onGround = false;
        }
        return next;
    }

    function enemyDamage(enemy, player, now) {
        if (!enemy || enemy.remove || !rectsOverlap(enemy, player)) return 0;
        const current = Number(now) || 0;
        if (current < (Number(enemy.hitReadyAt) || 0)) return 0;
        return Math.max(1, Number(enemy.damage) || 1);
    }

    function attackEnemy(enemy, player, amount) {
        if (!enemy || enemy.remove || !player) return { ok: false, defeated: false, damage: 0 };
        const facing = player.facing < 0 ? -1 : 1;
        const reach = {
            x: facing < 0 ? player.x - TILE : player.x + player.w,
            y: player.y + 8,
            w: TILE,
            h: Math.max(18, player.h - 16)
        };
        if (!rectsOverlap(reach, enemy)) return { ok: false, defeated: false, damage: 0 };
        const damage = Math.max(1, Number(amount) || 1);
        enemy.hp = Math.max(0, (Number(enemy.hp) || 0) - damage);
        enemy.hitFlashUntil = Date.now() + 140;
        enemy.facing = facing;
        enemy.x += facing * 10;
        if (enemy.hp <= 0) enemy.remove = true;
        return { ok: true, defeated: !!enemy.remove, damage: damage };
    }

    function touchesKind(kindAt, x, y, w, h, kind) {
        const left = Math.floor(x / TILE);
        const right = Math.floor((x + w - 1) / TILE);
        const top = Math.floor(y / TILE);
        const bottom = Math.floor((y + h - 1) / TILE);
        for (let ty = top; ty <= bottom; ty += 1) {
            for (let tx = left; tx <= right; tx += 1) {
                if (kindAt(tx, ty) === kind) return true;
            }
        }
        return false;
    }

    /** 侧视横版物理：走/跑/跳/重力/水中浮游（60fps 步长） */
    function updatePlayer(player, input, solidAt, kindAt) {
        const inWater = touchesKind(kindAt, player.x, player.y, player.w, player.h, 'water');
        player.inWater = inWater;
        const speed = inWater ? PHYS.WATER_MOVE : (input.run ? PHYS.RUN : PHYS.MOVE);
        player.vx = 0;
        if (input.left) player.vx = -speed;
        if (input.right) player.vx = speed;
        if (input.left && input.right) player.vx = 0;
        if (player.vx !== 0) player.facing = player.vx > 0 ? 1 : -1;

        player.vy += inWater ? PHYS.WATER_G : PHYS.G;
        if (player.vy > PHYS.MAX_FALL) player.vy = PHYS.MAX_FALL;
        if (input.jump && player.onGround) {
            player.vy = PHYS.JUMP;
            player.onGround = false;
        }
        if (input.jump && inWater) player.vy = PHYS.SWIM;

        // 分轴移动 + 碰撞；横向被 1 格台阶挡住且头顶有余量时自动小蹬（幼儿手感）
        const nx = player.x + player.vx;
        if (!rectHitsSolid(solidAt, nx, player.y, player.w, player.h)) player.x = nx;
        else if (player.onGround && player.vx !== 0 &&
            !rectHitsSolid(solidAt, nx, player.y - TILE, player.w, player.h)) {
            player.vy = PHYS.STEP_HOP;
            player.onGround = false;
        }
        else player.vx = 0;
        const ny = player.y + player.vy;
        player.onGround = false;
        if (!rectHitsSolid(solidAt, player.x, ny, player.w, player.h)) player.y = ny;
        else {
            if (player.vy > 0) player.onGround = true;
            player.vy = 0;
        }
        // 掉出世界底部：回到出生点（无致死压力）
        if (player.y > 40 * TILE) {
            return 'void';
        }
        return 'ok';
    }

    function screenToCell(canvas, camera, clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor(((clientX - rect.left) * scaleX + camera.x) / TILE);
        const y = Math.floor(((clientY - rect.top) * scaleY + camera.y) / TILE);
        return { x: x, y: y };
    }

    function inReach(player, cellX, cellY) {
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const dx = (cellX + 0.5) * TILE - px;
        const dy = (cellY + 0.5) * TILE - py;
        return Math.sqrt(dx * dx + dy * dy) <= REACH_TILES * TILE;
    }

    function clampCamera(camera, world, viewW, viewH) {
        const worldW = world.cols * TILE;
        const worldH = world.rows * TILE;
        camera.x = Math.round(Math.max(0, Math.min(worldW - viewW, camera.x)));
        camera.y = Math.round(Math.max(0, Math.min(worldH - viewH, camera.y)));
    }

    function followCamera(camera, player, viewW, viewH) {
        camera.x = Math.round(player.x + player.w / 2 - viewW / 2);
        camera.y = Math.round(player.y + player.h / 2 - viewH / 2);
    }

    const SKY_KEY = {
        meadow: 'skyDay', grassland: 'skyDay',
        forest: 'skyForest', cherry_grove: 'skyForest',
        desert: 'skyDesert',
        nether: 'skyNether', volcano: 'skyNether',
        cave: null, deep_dark: null, end: null
    };

    function skyKey(biome) {
        if (Object.prototype.hasOwnProperty.call(SKY_KEY, biome)) return SKY_KEY[biome];
        return 'skyDay';
    }

    function drawSky(ctx, images, viewW, viewH, camera, worldH, biome) {
        if (skyKey(biome) === null || biome === 'cave' || biome === 'deep_dark' || biome === 'end') {
            const grad = ctx.createLinearGradient(0, 0, 0, viewH);
            const top = biome === 'end' ? '#160d2c' : (biome === 'deep_dark' ? '#071f2b' : '#0b1630');
            const bottom = biome === 'end' ? '#3b1f58' : (biome === 'deep_dark' ? '#12313b' : '#152044');
            grad.addColorStop(0, top);
            grad.addColorStop(1, bottom);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, viewW, viewH);
            ctx.fillStyle = 'rgba(180, 210, 255, 0.38)';
            for (let i = 0; i < 20; i += 1) {
                const sx = ((i * 97 + camera.x * 0.08) % (viewW + 40)) - 20;
                const sy = ((i * 53 + camera.y * 0.05) % (viewH + 40)) - 20;
                ctx.fillRect(sx, sy, 2, 2);
            }
            const caveBottom = worldH - camera.y;
            if (caveBottom < viewH) {
                ctx.fillStyle = '#0a1020';
                ctx.fillRect(0, Math.max(0, caveBottom), viewW, viewH - caveBottom);
            }
            return;
        }
        const sky = images[skyKey(biome)] || images.skyDay;
        if (sky) {
            ctx.drawImage(sky, 0, 0, sky.width, sky.height, -camera.x * 0.15, -camera.y * 0.1, viewW + 200, viewH + 120);
        } else {
            const grad = ctx.createLinearGradient(0, 0, 0, viewH);
            grad.addColorStop(0, '#79b7e8');
            grad.addColorStop(1, '#cde9f5');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, viewW, viewH);
        }
        // 世界底部以下填深色
        const bottom = worldH - camera.y;
        if (bottom < viewH) {
            ctx.fillStyle = '#241f1c';
            ctx.fillRect(0, Math.max(0, bottom), viewW, viewH - bottom);
        }
        const veil = {
            forest: 'rgba(35, 120, 55, .16)', cherry: 'rgba(255, 155, 190, .14)',
            snow: 'rgba(220, 245, 255, .3)', desert: 'rgba(255, 190, 75, .2)',
            mushroom: 'rgba(176, 105, 210, .18)', mountain: 'rgba(90, 90, 120, .16)',
            ocean: 'rgba(45, 145, 220, .18)', volcano: 'rgba(230, 60, 25, .2)',
            nether: 'rgba(120, 10, 10, .25)', sky: 'rgba(120, 205, 255, .12)',
            sky_dimension: 'rgba(255, 205, 45, .16)'
        }[biome];
        if (veil) {
            ctx.fillStyle = veil;
            ctx.fillRect(0, 0, viewW, viewH);
        }
    }

    function drawBlock(ctx, images, kind, x, y) {
        const tex = images['tex_' + kind];
        if (tex) {
            ctx.drawImage(tex, x, y, TILE, TILE);
            if (kind === 'water') {
                ctx.fillStyle = 'rgba(63, 118, 228, 0.55)';
                ctx.fillRect(x, y, TILE, TILE);
            }
            return;
        }
        ctx.fillStyle = FALLBACK[kind] || '#ccc';
        ctx.fillRect(x, y, TILE, TILE);
        if (kind === 'water') {
            ctx.fillStyle = 'rgba(63, 118, 228, 0.4)';
            ctx.fillRect(x, y, TILE, TILE);
        }
    }

    /** 挖掘裂纹：progress ∈ [0,1] → destroy_stage 六帧 */
    function drawCrack(ctx, images, progress, x, y) {
        const idx = Math.min(DESTROY_STAGES.length - 1, Math.floor(progress * DESTROY_STAGES.length));
        const stage = images['destroy' + idx];
        if (stage) ctx.drawImage(stage, x, y, TILE, TILE);
    }

    function heroPose(player, mining, now) {
        if (mining) return (now % 320 < 160) ? 'hero_mine' : 'hero_idle';
        if (!player.onGround && !player.inWater) return 'hero_jump';
        if (Math.abs(player.vx) > 0.35) return (Math.floor(now / 200) % 2 === 0) ? 'hero_walkA' : 'hero_walkB';
        return 'hero_idle';
    }

    function drawPlayer(ctx, images, player, camera, mining, now) {
        const PW = 40;   // 收窄贴图（用户反馈「主角太胖」）：40×54，横向比碰撞盒宽 22px 居中
        const PH = 54;
        const dx = Math.round(player.x - camera.x - 11);
        const dy = Math.round(player.y - camera.y);
        if (player.inWater) {
            ctx.fillStyle = 'rgba(63, 118, 228, 0.22)';
            ctx.fillRect(dx + 5, dy + 20, PW - 10, player.h - 20);
        }
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const sheet = images.hero_steve;
        if (sheet) {
            // 选帧：挖/走→行1 循环8帧；空中→行2（升0/降1）；待机→行0列0
            let row = STEVE.ROW_IDLE;
            let col = 0;
            if (mining) { row = STEVE.ROW_WALK; col = Math.floor(now / 110) % STEVE.COLS; }
            else if (!player.onGround && !player.inWater) { row = STEVE.ROW_AIR; col = player.vy > 0 ? 1 : 0; }
            else if (player.inWater) { row = STEVE.ROW_WALK; col = Math.floor(now / 260) % STEVE.COLS; }
            else if (Math.abs(player.vx) > 0.35) { row = STEVE.ROW_WALK; col = Math.floor(now / 110) % STEVE.COLS; }
            const sx = col * STEVE.FW;
            const sy = row * STEVE.FW;
            if (player.facing < 0) {
                ctx.translate(dx + PW, dy);
                ctx.scale(-1, 1);
                ctx.drawImage(sheet, sx, sy, STEVE.FW, STEVE.FW, 0, 0, PW, PH);
            } else {
                ctx.drawImage(sheet, sx, sy, STEVE.FW, STEVE.FW, dx, dy, PW, PH);
            }
        } else {
            const pose = heroPose(player, mining, now);
            const img = images[pose];
            if (player.facing < 0) {
                ctx.translate(dx + PW, dy);
                ctx.scale(-1, 1);
                if (img) ctx.drawImage(img, 0, 0, PW, PH);
            } else if (img) {
                ctx.drawImage(img, dx, dy, PW, PH);
            }
        }
        ctx.restore();
    }

    function drawEnemy(ctx, images, enemy, camera, now) {
        if (!enemy || enemy.remove) return;
        const dx = Math.round(enemy.x - camera.x);
        const dy = Math.round(enemy.y - camera.y + Math.sin((Number(now) || 0) / 180 + (enemy.phase || 0)) * (enemy.behavior === 'flyer' ? 3 : 1));
        const img = images['enemy_' + enemy.id];
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (enemy.facing < 0) {
            ctx.translate(dx + enemy.w, dy);
            ctx.scale(-1, 1);
            if (img) ctx.drawImage(img, 0, 0, enemy.w, enemy.h);
        } else if (img) {
            ctx.drawImage(img, dx, dy, enemy.w, enemy.h);
        } else {
            ctx.fillStyle = enemy.color || '#8b6cff';
            ctx.fillRect(dx, dy, enemy.w, enemy.h);
            ctx.fillStyle = '#fff8d6';
            ctx.fillRect(dx + Math.max(3, enemy.w * 0.2), dy + Math.max(4, enemy.h * 0.25), 4, 4);
            ctx.fillRect(dx + Math.max(10, enemy.w * 0.62), dy + Math.max(4, enemy.h * 0.25), 4, 4);
        }
        ctx.restore();
        if (enemy.hp < enemy.maxHp) {
            const ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
            ctx.fillStyle = 'rgba(25, 15, 15, .75)';
            ctx.fillRect(dx, dy - 6, enemy.w, 4);
            ctx.fillStyle = '#ffcc66';
            ctx.fillRect(dx, dy - 6, enemy.w * ratio, 4);
        }
    }

    function spawnChips(chips, cellX, cellY, kind) {
        const cx = cellX * TILE + TILE / 2;
        const cy = cellY * TILE + TILE / 2;
        const color = FALLBACK[kind] || '#bbb';
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

    function drawDecorations(ctx, images, decorations, camera) {
        const keys = { bush: 'decoBush', cactus: 'decoCactus', ember: 'decoEmber', crystal_glow: 'decoEmber' };
        const sizes = { bush: [36, 28], cactus: [22, 48], ember: [24, 24], crystal_glow: [22, 22] };
        const colors = { bush: '#3d8a3a', cactus: '#2f9a3c', ember: '#ff7a18', crystal_glow: '#9b7cff' };
        (decorations || []).forEach(function (row) {
            const size = sizes[row.type] || [32, 32];
            const x = row.x * TILE - camera.x + (TILE - size[0]) / 2;
            const y = row.y * TILE - camera.y - size[1] + 6;
            const img = images[keys[row.type]];
            if (img) {
                ctx.drawImage(img, x, y, size[0], size[1]);
                return;
            }
            ctx.fillStyle = colors[row.type] || '#888';
            ctx.fillRect(x, y, size[0], size[1]);
        });
    }

    function drawChips(ctx, chips, camera) {
        for (let i = chips.length - 1; i >= 0; i -= 1) {
            const p = chips[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.28;
            p.life -= 1;
            if (p.life <= 0) { chips.splice(i, 1); continue; }
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x - camera.x), Math.round(p.y - camera.y), 4, 4);
        }
    }

    global.VoxelCraftEngine = {
        TILE: TILE, PHYS: PHYS, REACH_TILES: REACH_TILES,
        MC_TEXTURES: MC_TEXTURES, DESTROY_STAGES: DESTROY_STAGES,
        loadAllImages: loadAllImages,
        updatePlayer: updatePlayer, rectHitsSolid: rectHitsSolid, touchesKind: touchesKind,
        screenToCell: screenToCell, inReach: inReach,
        followCamera: followCamera, clampCamera: clampCamera,
        skyKey: skyKey,
        drawSky: drawSky, drawDecorations: drawDecorations, drawBlock: drawBlock, drawCrack: drawCrack,
        drawPlayer: drawPlayer, drawEnemy: drawEnemy, spawnChips: spawnChips, drawChips: drawChips,
        rectsOverlap: rectsOverlap, updateEnemy: updateEnemy, enemyDamage: enemyDamage, attackEnemy: attackEnemy
    };
}(typeof window !== 'undefined' ? window : globalThis));
