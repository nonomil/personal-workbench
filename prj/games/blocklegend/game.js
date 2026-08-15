/**
 * blocklegend · 装配层（T20260815-blocklegend-3d S2–S5）
 * 战斗 / 词卡暴击 / Boss 破防 / 结算解锁 / 商人 / 帮助
 */
(function () {
    'use strict';

    const GAME_ID = 'blocklegend';
    const LOOT_PRICE = {
        'slime-gel': 3, 'cube-shard': 5, 'husk-bone': 7,
        'oak-log': 2, 'stick': 1, 'dirt': 1, 'cobble': 2
    };
    const DROP_COLOR = {
        'oak-log': 0x6b4a28, 'stick': 0x8a6234, 'dirt': 0x8a6a3c, 'cobble': 0x7a7a80
    };
    const CHAPTERS = [
        '',
        '第一层 · 初生神域 · Genesis',
        '第二层 · 翠绿林地 · Verdant',
        '第三层 · 石丘矿脉 · Quarry',
        '第四层 · 暮色河谷 · Duskvale',
        '第五层 · 晶簇森林 · Crystal',
        '第六层 · 星辉高地 · Astral'
    ];
    const bridge = window.WorkbenchGameBridge;
    const ENG = window.BlockLegendEngine;
    const C = window.BlockLegendCombat;
    const W = window.BlockLegendWords;
    const L = window.BlockLegendLevels;
    const MOBS = window.BlockLegendMobs;
    const T = window.BlockLegendTools;
    const S = window.BlockLegendShop;
    const sfx = window.WorkbenchGameSfx;
    const THREE = window.THREE;

    let engine = null;
    let viewModel = null;
    let progress = emptyProgress();
    let bank = [];
    let pool = [];
    const session = {
        level: 1,
        coins: 0,
        bag: {},
        combo: 0,
        lastMeleeAt: 0,
        lastBoltAt: 0,
        lastHitAt: 0,
        lastDamage: 0,
        lastCrit: false,
        monsters: [],
        bolts: [],
        pickups: [],
        fx: [],
        wave: 0,
        wavesLeft: 0,
        boss: null,
        bossMob: null,
        merchant: null,
        nearMerchant: false,
        paused: false,
        pending: null,
        quiz: null,
        quizEndsAt: 0,
        tool: 'sword',
        mining: false,
        mine: null,
        lookKey: '',
        lookSince: 0,
        lookSpoken: false,
        placeLoot: 'dirt'
    };

    function emptyProgress() {
        return {
            unlockedLevel: 1,
            coined: 0,
            learnedIds: [],
            rightCount: 0,
            wrongCount: 0,
            clearedLevels: [],
            bag: {},
            gear: {}
        };
    }

    function boot() {
        window.__blErr = '';
        window.onerror = function (msg) {
            window.__blErr = String(msg).slice(0, 300);
            toast('出错了：' + window.__blErr);
            return false;
        };
        if (!window.THREE || !ENG || !C || !W || !L || !MOBS || !T || !S) {
            toast('引擎加载失败，请刷新重试');
            return;
        }
        loadProgress();
        const canvas = document.getElementById('world-canvas');
        engine = ENG.create(canvas, { seed: 7, climate: 'plains' });
        // 第一人称手臂+剑：挂到相机上（相机需入场景，子对象才会渲染）
        viewModel = MOBS.createViewModel();
        engine.scene.add(engine.camera);
        engine.camera.add(viewModel.group);
        const back = document.getElementById('back-link');
        if (back && bridge && bridge.backHref) back.href = bridge.backHref('voxel-adventure');
        bindChrome();
        bindCombatInput(canvas);
        spawnMerchant();
        engine.onTick(tick);
        if (bridge && bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
        W.loadCatalog(function (err, list) {
            if (err || !list || !list.length) {
                toast('词库加载失败，请刷新重试');
                return;
            }
            bank = list;
            startLevel(progress.unlockedLevel || 1);
        });
        window.__blDebug = {
            player: engine.player,
            look: engine.look,
            world: function () { return engine.world; },
            fps: engine.fps,
            session: session,
            progress: progress,
            monsters: function () { return session.monsters; },
            coins: function () { return session.coins; },
            tool: function () { return session.tool; }
        };
        selectTool(0);
        engine.startLoop();
        toast('1剑 2斧 3镐 4铲 · 按住左键用工具 · 右键魔法');
    }

    function loadProgress() {
        if (bridge && bridge.getProgress) {
            const got = bridge.getProgress(GAME_ID);
            progress = Object.assign(emptyProgress(), (got && got.progress) || {});
        }
        if (!Array.isArray(progress.learnedIds)) progress.learnedIds = [];
        if (!Array.isArray(progress.clearedLevels)) progress.clearedLevels = [];
        if (!progress.gear || typeof progress.gear !== 'object') progress.gear = {};
        session.coins = Number(progress.coined) || 0;
        session.bag = Object.assign({}, progress.bag || C.emptyBag());
    }

    function persist() {
        progress.coined = session.coins;
        progress.bag = session.bag;
        progress.gear = progress.gear || {};
        if (bridge && bridge.saveProgress) bridge.saveProgress(GAME_ID, progress);
        syncHud();
    }

    function bindChrome() {
        const fullBtn = document.getElementById('fullscreen-btn');
        if (fullBtn) fullBtn.addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        document.getElementById('help-btn').addEventListener('click', function () { toggleLayer('help-layer', true); });
        document.getElementById('help-close').addEventListener('click', function () { toggleLayer('help-layer', false); });
        document.getElementById('trade-close').addEventListener('click', function () { toggleLayer('trade-layer', false); });
        document.getElementById('trade-sell').addEventListener('click', sellAll);
        function replayQuizWord() {
            if (session.quiz) speakWord(session.quiz.word);
        }
        document.getElementById('quiz-speak').addEventListener('click', replayQuizWord);
        document.getElementById('quiz-en').addEventListener('click', replayQuizWord);
        const lookSpeak = document.getElementById('look-speak');
        if (lookSpeak) lookSpeak.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const en = document.getElementById('look-en');
            if (en) speakWord({ text: en.textContent });
        });
        document.getElementById('unlock-btn').addEventListener('click', unlockNext);
        document.getElementById('replay-btn').addEventListener('click', function () {
            toggleLayer('settle-layer', false);
            startLevel(session.level);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'f' || e.key === 'F') {
                if (session.nearMerchant) openTrade();
            }
            if (e.key >= '1' && e.key <= '4') selectTool(Number(e.key) - 1);
            if (e.key === '5') selectPlace();
            if (e.key === 'Escape') {
                toggleLayer('help-layer', false);
                toggleLayer('trade-layer', false);
            }
        });
    }

    function nowMs() { return Date.now(); }

    function overlayOpen() {
        return ['quiz-layer', 'settle-layer', 'trade-layer', 'help-layer'].some(function (id) {
            const el = document.getElementById(id);
            return el && !el.classList.contains('is-hidden');
        });
    }

    function toggleLayer(id, on) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('is-hidden', !on);
        session.paused = overlayOpen();
    }

    function bindCombatInput(canvas) {
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        document.addEventListener('mousedown', function (e) {
            if (e.target && e.target.closest && e.target.closest('.bl-layer, button, a')) return;
            if (session.paused) return;
            if (e.button === 0) {
                if (session.tool === 'place') {
                    tryPlace();
                    return;
                }
                session.mining = true;
                if (meleeTarget()) tryMelee();
            }
            if (e.button === 2) {
                e.preventDefault();
                tryBolt();
            }
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button === 0) stopMining();
        });
        document.querySelectorAll('.bl-slot[data-place]').forEach(function (el) {
            el.addEventListener('click', function () { selectPlace(); });
        });
        document.querySelectorAll('.bl-slot[data-tool]').forEach(function (el) {
            el.addEventListener('click', function () {
                const idx = T.SLOT_IDS.indexOf(el.getAttribute('data-tool'));
                if (idx >= 0) selectTool(idx);
            });
        });
    }

    function startLevel(level) {
        clearEntities();
        session.level = Math.max(1, Number(level) || 1);
        session.combo = 0;
        session.wave = 0;
        session.boss = null;
        session.bossMob = null;
        session.pending = null;
        const cfg = L.levelOf(session.level);
        session.wavesLeft = cfg.waves;
        pool = W.poolForLevel(bank, session.level);
        if (engine && engine.reloadWorld) {
            engine.reloadWorld(ENG.createWorld(cfg.worldSeed || (7 + session.level * 13), {
                climate: cfg.climate || 'plains',
                level: session.level
            }));
            if (session.merchant && session.merchant.mesh) engine.scene.remove(session.merchant.mesh);
            spawnMerchant();
        }
        if (engine) engine.player.hp = engine.player.hpMax;
        session.lastHitAt = 0;
        spawnWave();
        paintSayStrip();
        syncHud();
    }

    function clearEntities() {
        session.monsters.forEach(function (m) { if (m.mesh) engine.scene.remove(m.mesh); });
        session.bolts.forEach(function (b) { if (b.mesh) engine.scene.remove(b.mesh); });
        session.pickups.forEach(function (p) { if (p.mesh) engine.scene.remove(p.mesh); });
        session.fx.forEach(function (e) { engine.scene.remove(e.obj); });
        session.monsters = [];
        session.bolts = [];
        session.pickups = [];
        session.fx = [];
        const hud = document.getElementById('boss-hud');
        if (hud) hud.classList.add('is-hidden');
    }

    function spawnMonster(kind, x, z, extra) {
        const spec = C.monsterOf(kind);
        const isBoss = !!(extra && extra.boss);
        const model = MOBS.create(isBoss ? 'boss' : spec.kind, { boss: isBoss });
        const mesh = model.group;
        const y = engine.world.surfaceAt(Math.floor(x), Math.floor(z));
        mesh.position.set(x, y, z);
        engine.scene.add(mesh);
        const mob = {
            id: 'm' + nowMs() + '-' + session.monsters.length,
            kind: spec.kind,
            hp: spec.hp,
            maxHp: spec.hp,
            coins: spec.coins,
            contact: spec.contact,
            speed: spec.speed,
            loot: spec.loot,
            x: x, z: z, y: y,
            mesh: mesh,
            model: model,
            asked: false,
            isBoss: isBoss
        };
        if (mob.isBoss) {
            mob.hp = session.boss.hp;
            mob.maxHp = session.boss.maxHp;
            mob.coins = 20;
            model.setHp(1, true);
        }
        session.monsters.push(mob);
        return mob;
    }

    function spawnWave() {
        session.wave += 1;
        session.wavesLeft = Math.max(0, session.wavesLeft - 1);
        const p = engine.player;
        const spots = [
            { kind: 'slime', dx: -6.2, dz: -6.2 },
            { kind: 'cube', dx: -8.4, dz: 4.8 },
            { kind: 'slime', dx: 7.2, dz: -5.6 }
        ];
        if (session.wave > 1) spots.push({ kind: 'husk', dx: -11, dz: -6 });
        spots.forEach(function (s) { spawnMonster(s.kind, p.x + s.dx, p.z + s.dz); });
    }

    function spawnBoss() {
        session.boss = L.createBoss(session.level);
        const p = engine.player;
        session.bossMob = spawnMonster('husk', p.x + 8, p.z + 1, { boss: true });
        const hud = document.getElementById('boss-hud');
        if (hud) hud.classList.remove('is-hidden');
        toast('Boss 来了！答对单词破蓝罩。');
        syncBossHud();
    }

    function spawnMerchant() {
        const mid = Math.floor(engine.world.size / 2);
        const x = mid + 4.5, z = mid - 6.5;
        const y = engine.world.surfaceAt(Math.floor(x), Math.floor(z));
        const model = MOBS.create('merchant');
        const g = model.group;
        g.position.set(x, y, z);
        g.rotation.y = Math.atan2((mid + 0.5) - x, (mid + 0.5) - z);
        engine.scene.add(g);
        session.merchant = { x: x, z: z, mesh: g, model: model };
    }

    function meleeTarget() {
        return session.monsters.find(function (m) {
            return m.hp > 0 && C.inMeleeArc(engine.player, engine.look.yaw, m);
        }) || null;
    }

    function tryMelee() {
        if (!C.canAttack({ kind: 'melee', lastAt: session.lastMeleeAt, now: nowMs() })) return;
        session.lastMeleeAt = nowMs();
        if (viewModel) viewModel.triggerSwing();
        const hits = session.monsters.filter(function (m) {
            return m.hp > 0 && C.inMeleeArc(engine.player, engine.look.yaw, m);
        });
        hits.forEach(function (m) { requestHit(m, 'melee'); });
        if (sfx && sfx.checkpoint) sfx.checkpoint();
    }

    function selectTool(index) {
        const id = T.SLOT_IDS[index];
        if (!id) return;
        session.tool = id;
        if (session.mine) session.mine.acc = 0;
        setHotbar(index + 1);
        if (viewModel && viewModel.setTool) viewModel.setTool(id);
    }

    function selectPlace() {
        session.tool = 'place';
        setHotbar(5);
    }

    function nextPlaceLoot() {
        const order = [session.placeLoot, 'dirt', 'cobble', 'oak-log'];
        for (let i = 0; i < order.length; i += 1) {
            const loot = order[i];
            if (loot && (Number(session.bag[loot]) || 0) > 0) return loot;
        }
        return null;
    }

    function tryPlace() {
        const loot = nextPlaceLoot();
        if (!loot) {
            toast('背包里没有可放的方块。先挖土或砍树。');
            return;
        }
        const hit = lookHit();
        if (!hit.hit || !hit.prev) {
            toast('对着方块的邻面才能放。');
            return;
        }
        const kind = T.placeKindOf(loot);
        const res = ENG.placeVoxel(engine.world, hit.prev.x, hit.prev.y, hit.prev.z, kind);
        if (!res || !res.ok) {
            toast('这里放不下。');
            return;
        }
        session.bag = C.addLoot(session.bag, loot, -1);
        if ((Number(session.bag[loot]) || 0) < 0) session.bag[loot] = 0;
        session.placeLoot = loot;
        if (engine.remeshAt) engine.remeshAt(res.x, res.z);
        persist();
        if (viewModel) viewModel.triggerSwing();
    }

    function eyeOrigin() {
        return {
            x: engine.player.x,
            y: engine.player.y + ENG.EYE_HEIGHT,
            z: engine.player.z
        };
    }

    function lookHit() {
        const dir = T.lookDir(engine.look.yaw, engine.look.pitch);
        return T.voxelRay(eyeOrigin(), dir, 5.5, function (x, y, z) {
            return ENG.voxelAt(engine.world, x, y, z);
        });
    }

    function stopMining() {
        session.mining = false;
        session.mine = null;
        paintBreakBar(0, false);
        hideTarget();
        hideCrack();
    }

    function paintBreakBar(pct, on) {
        const bar = document.getElementById('break-bar');
        const fill = document.getElementById('break-fill');
        if (bar) bar.classList.toggle('is-hidden', !on);
        if (fill) fill.style.width = Math.max(0, Math.min(100, Math.round(pct))) + '%';
    }

    function ensureTarget() {
        if (session.targetBox) return session.targetBox;
        const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
        const box = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x111111 }));
        box.visible = false;
        engine.scene.add(box);
        session.targetBox = box;
        return box;
    }

    function hideTarget() {
        if (session.targetBox) session.targetBox.visible = false;
    }

    function applyTileUV(geo, index) {
        const corners = ENG.tileCornersUV(index);
        const uv = geo.getAttribute('uv');
        if (!uv) return;
        for (let face = 0; face < 6; face += 1) {
            const base = face * 4;
            uv.setXY(base + 0, corners[0][0], corners[0][1]);
            uv.setXY(base + 1, corners[3][0], corners[3][1]);
            uv.setXY(base + 2, corners[1][0], corners[1][1]);
            uv.setXY(base + 3, corners[2][0], corners[2][1]);
        }
        uv.needsUpdate = true;
    }

    function ensureCrack() {
        if (session.crackBox) return session.crackBox;
        const atlas = engine.atlas || (engine.chunkMeshes[0] && engine.chunkMeshes[0].material && engine.chunkMeshes[0].material.map);
        const mat = new THREE.MeshBasicMaterial({
            map: atlas || null,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            alphaTest: 0.15
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), mat);
        mesh.visible = false;
        mesh.renderOrder = 2;
        engine.scene.add(mesh);
        session.crackBox = mesh;
        session.crackStage = -1;
        return mesh;
    }

    function hideCrack() {
        if (session.crackBox) session.crackBox.visible = false;
        session.crackStage = -1;
    }

    function showCrack(x, y, z, frac) {
        const mesh = ensureCrack();
        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        mesh.visible = true;
        const stage = Math.max(0, Math.min(3, Math.floor(frac * 4)));
        if (stage !== session.crackStage) {
            session.crackStage = stage;
            applyTileUV(mesh.geometry, ENG.tileIndex('crack', stage));
        }
    }

    function showTarget(x, y, z) {
        const box = ensureTarget();
        box.position.set(x + 0.5, y + 0.5, z + 0.5);
        box.visible = true;
    }

    function stepMining(dt) {
        if (!session.mining || session.paused) {
            paintBreakBar(0, false);
            if (!session.mining) {
                hideTarget();
                hideCrack();
            }
            return;
        }
        if (meleeTarget()) {
            paintBreakBar(0, false);
            hideTarget();
            hideCrack();
            return;
        }
        const hit = lookHit();
        if (!hit.hit || hit.y <= 0) {
            session.mine = null;
            paintBreakBar(0, false);
            hideTarget();
            hideCrack();
            return;
        }
        showTarget(hit.x, hit.y, hit.z);
        if (!session.mine || session.mine.x !== hit.x || session.mine.y !== hit.y || session.mine.z !== hit.z) {
            session.mine = { x: hit.x, y: hit.y, z: hit.z, kind: hit.kind, acc: 0, swingAt: 0 };
            if (viewModel) viewModel.triggerSwing();
        }
        session.mine.acc += dt * 1000;
        session.mine.swingAt = (session.mine.swingAt || 0) + dt;
        if (session.mine.swingAt > 0.36) {
            session.mine.swingAt = 0;
            if (viewModel) viewModel.triggerSwing();
            MOBS.spawnBurst(engine.scene, session.fx, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0xc8b48a, 2);
        }
        const need = T.breakMs(session.tool, hit.kind);
        const frac = session.mine.acc / need;
        paintBreakBar(frac * 100, true);
        showCrack(hit.x, hit.y, hit.z, frac);
        if (session.mine.acc < need) return;
        finishBreak(hit);
        session.mine = null;
        paintBreakBar(0, false);
        hideCrack();
    }

    function finishBreak(hit) {
        const result = ENG.breakVoxel(engine.world, hit.x, hit.y, hit.z);
        if (!result || !result.ok) return;
        if (engine.remeshAt) engine.remeshAt(result.x != null ? result.x : hit.x, result.z != null ? result.z : hit.z);
        if (viewModel) viewModel.triggerSwing();
        if (T.placeKindOf(result.drop)) session.placeLoot = result.drop;
        spawnPickup(hit.x + 0.5, hit.z + 0.5, 0, result.drop);
        MOBS.spawnBurst(engine.scene, session.fx, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0xc8b48a, 6);
        if (sfx && sfx.checkpoint) sfx.checkpoint();
    }

    function nearestLookMob() {
        const origin = eyeOrigin();
        const dir = T.lookDir(engine.look.yaw, engine.look.pitch);
        let best = null, bestDot = 0.74, bestDist = 7;
        session.monsters.forEach(function (m) {
            if (m.hp <= 0) return;
            const dx = m.x - origin.x;
            const dy = (m.y + 0.85) - origin.y;
            const dz = m.z - origin.z;
            const dist = Math.hypot(dx, dy, dz) || 1;
            if (dist > 7) return;
            const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / dist;
            if (dot > bestDot && dist < bestDist) {
                best = m;
                bestDot = dot;
                bestDist = dist;
            }
        });
        return best;
    }

    function lookSubject() {
        const mob = nearestLookMob();
        if (mob) return { type: 'mob', kind: mob.isBoss ? 'boss' : mob.kind, mob: mob };
        if (session.merchant && session.nearMerchant) return { type: 'npc', kind: 'merchant' };
        const hit = lookHit();
        if (hit && hit.hit) return { type: 'block', kind: hit.kind, hit: hit };
        return null;
    }

    function ensureRing() {
        if (session.targetRing) return session.targetRing;
        const geo = new THREE.RingGeometry(0.52, 0.7, 28);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff3a2a, side: THREE.DoubleSide, transparent: true, opacity: 0.78
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = -Math.PI / 2;
        ring.visible = false;
        engine.scene.add(ring);
        session.targetRing = ring;
        return ring;
    }

    function paintSayStrip() {
        const el = document.getElementById('say-strip');
        if (el) el.textContent = W.sayStrip(pool, 8);
    }

    function updateLookCard(now) {
        const card = document.getElementById('look-card');
        if (!card) return;
        if (session.paused) {
            card.classList.add('is-hidden');
            if (session.targetRing) session.targetRing.visible = false;
            return;
        }
        const sub = lookSubject();
        if (!sub) {
            card.classList.add('is-hidden');
            session.lookKey = '';
            if (session.targetRing) session.targetRing.visible = false;
            return;
        }
        const label = W.labelFor(sub.kind, bank);
        const key = sub.type + ':' + sub.kind + (sub.mob ? ':' + sub.mob.x.toFixed(1) : '');
        document.getElementById('look-en').textContent = label.en;
        document.getElementById('look-zh').textContent = label.zh;
        const meta = document.getElementById('look-meta');
        if (sub.mob) {
            meta.textContent = Math.ceil(sub.mob.hp) + '/' + Math.ceil(sub.mob.maxHp || sub.mob.hp);
            const ring = ensureRing();
            ring.position.set(sub.mob.x, sub.mob.y + 0.04, sub.mob.z);
            ring.visible = true;
        } else {
            meta.textContent = sub.type === 'npc' ? 'Press F' : '';
            if (session.targetRing) session.targetRing.visible = false;
        }
        card.classList.remove('is-hidden');
        if (session.lookKey !== key) {
            session.lookKey = key;
            session.lookSince = now;
            session.lookSpoken = false;
        } else if (!session.lookSpoken && now - session.lookSince > 480) {
            session.lookSpoken = true;
            speakWord(label.word || { text: label.en });
        }
    }

    function tryBolt() {
        if (!C.canAttack({ kind: 'bolt', lastAt: session.lastBoltAt, now: nowMs() })) return;
        session.lastBoltAt = nowMs();
        if (viewModel) viewModel.triggerCast();
        const f = C.forwardXZ(engine.look.yaw);
        const mesh = MOBS.boltMesh();
        const y = engine.player.y + ENG.EYE_HEIGHT * 0.7;
        mesh.position.set(engine.player.x + f.x * 0.6, y, engine.player.z + f.z * 0.6);
        engine.scene.add(mesh);
        session.bolts.push({
            x: mesh.position.x, z: mesh.position.z, y: y,
            vx: f.x * C.BOLT_SPEED, vz: f.z * C.BOLT_SPEED,
            life: C.BOLT_LIFE, mesh: mesh, trailAt: 0
        });
    }

    function requestHit(mob, kind) {
        if (session.pending) return;
        const firstHit = !mob.asked;
        if (W.shouldAsk({ firstHit: firstHit, combo: session.combo })) {
            openQuiz(mob, kind);
            return;
        }
        applyResolvedHit(mob, kind, { answered: session.combo >= W.SKIP_COMBO, correct: session.combo >= W.SKIP_COMBO });
    }

    function openQuiz(mob, kind) {
        const word = W.nextWord(pool, progress.learnedIds) || pool[0];
        if (!word) {
            applyResolvedHit(mob, kind, { answered: false, correct: false });
            return;
        }
        const quiz = W.quizFor(word, bank);
        session.pending = { mob: mob, kind: kind };
        session.quiz = quiz;
        session.quizEndsAt = nowMs() + W.QUIZ_MS;
        session.paused = true;
        document.getElementById('quiz-en').textContent = word.text;
        const zhHint = document.getElementById('quiz-zh');
        if (zhHint) zhHint.textContent = '';
        const img = document.getElementById('quiz-img');
        if (img) {
            if (word.media && word.media.image) {
                img.src = word.media.image;
                img.alt = word.text;
                img.classList.remove('is-hidden');
            } else {
                img.removeAttribute('src');
                img.alt = '';
                img.classList.add('is-hidden');
            }
        }
        const box = document.getElementById('quiz-choices');
        box.innerHTML = '';
        quiz.choices.forEach(function (zh) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = zh;
            btn.addEventListener('click', function () { resolveQuiz(zh === quiz.answer); });
            box.appendChild(btn);
        });
        toggleLayer('quiz-layer', true);
        speakWord(word);
    }

    function resolveQuiz(correct) {
        if (!session.pending) return;
        const pending = session.pending;
        const word = session.quiz && session.quiz.word;
        session.pending = null;
        session.quiz = null;
        toggleLayer('quiz-layer', false);
        pending.mob.asked = true;
        if (correct) {
            progress.rightCount = (Number(progress.rightCount) || 0) + 1;
            if (word && word.id && progress.learnedIds.indexOf(word.id) === -1) progress.learnedIds.push(word.id);
            if (pending.mob.isBoss && session.boss) {
                session.boss = L.chipShield(session.boss, 1, { now: nowMs() }).boss;
            }
            if (sfx && sfx.celebrate) sfx.celebrate();
        } else {
            progress.wrongCount = (Number(progress.wrongCount) || 0) + 1;
        }
        if (word && word.text && global.WorkbenchGameBridge && global.WorkbenchGameBridge.recordWordAnswer) {
            global.WorkbenchGameBridge.recordWordAnswer(word.text, correct);
        }
        session.combo = C.nextCombo({ answered: true, correct: correct, combo: session.combo });
        persist();
        applyResolvedHit(pending.mob, pending.kind, { answered: true, correct: correct });
    }

    function applyResolvedHit(mob, kind, verdict) {
        let dmg = C.damage({
            kind: kind,
            answered: verdict.answered,
            correct: verdict.correct,
            combo: session.combo
        });
        if (kind === 'melee') {
            dmg = Math.max(1, Math.round(dmg * T.meleeScale(session.tool)));
            dmg += S.statsOf(progress.gear).atk;
        }
        const crit = !!(verdict.answered && verdict.correct);
        if (mob.isBoss && session.boss) {
            const r = L.applyBossDamage(session.boss, dmg, { now: nowMs() });
            session.boss = r.boss;
            session.lastDamage = r.dealt;
            session.lastCrit = crit;
            MOBS.spawnDamageText(engine.scene, session.fx, mob, r.dealt, crit);
            flashMesh(mob.mesh);
            if (mob.model) mob.model.setHp(session.boss.hp / (session.boss.maxHp || 1), true);
            paintBossShield();
            syncBossHud();
            if (session.boss.dead) killBoss(mob);
            return;
        }
        hurtMonster(mob, dmg, crit);
    }

    function paintBossShield() {
        if (!session.bossMob || !session.bossMob.mesh || !session.boss) return;
        session.bossMob.mesh.traverse(function (n) {
            if (n.name === 'boss-shield' && n.material) {
                n.material.color.setHex(session.boss.color === 'red' ? 0xff4a3a : 0x3d7dff);
                n.material.opacity = session.boss.state === 'broken' ? 0.16 : 0.32;
            }
        });
        const hud = document.getElementById('boss-hud');
        if (hud) hud.classList.toggle('is-broken', session.boss.state === 'broken');
    }

    function showSwing() {
        if (viewModel) viewModel.triggerSwing();
    }

    function hurtMonster(mob, dmg, crit) {
        const res = C.applyHit(mob.hp, dmg);
        mob.hp = res.hp;
        session.lastDamage = dmg;
        session.lastCrit = !!crit;
        MOBS.spawnDamageText(engine.scene, session.fx, mob, dmg, crit);
        flashMesh(mob.mesh);
        if (mob.model) mob.model.setHp(mob.hp / (mob.maxHp || 1), true);
        if (res.dead) killMonster(mob);
    }

    function killMonster(mob) {
        mob.hp = 0;
        const spec = C.monsterOf(mob.kind);
        MOBS.spawnBurst(engine.scene, session.fx, mob.x, mob.y, mob.z, spec.color, 12);
        if (mob.mesh) engine.scene.remove(mob.mesh);
        session.monsters = session.monsters.filter(function (m) { return m !== mob; });
        spawnPickup(mob.x, mob.z, mob.coins, mob.loot);
        if (!session.boss && session.monsters.length === 0) {
            if (session.wavesLeft > 0) spawnWave();
            else spawnBoss();
        }
    }

    function killBoss(mob) {
        MOBS.spawnBurst(engine.scene, session.fx, mob.x, mob.y, mob.z, 0x8a5ca0, 26);
        MOBS.spawnBurst(engine.scene, session.fx, mob.x, mob.y + 1, mob.z, 0xf0d890, 14);
        if (mob.mesh) engine.scene.remove(mob.mesh);
        session.monsters = session.monsters.filter(function (m) { return m !== mob; });
        spawnPickup(mob.x, mob.z, 20, 'cube-shard');
        finishLevel();
    }

    function finishLevel() {
        if (progress.clearedLevels.indexOf(session.level) === -1) progress.clearedLevels.push(session.level);
        let sun = L.SUN_PER_LEVEL;
        let capped = false;
        if (bridge && bridge.awardSunlight) {
            const res = bridge.awardSunlight({
                gameId: GAME_ID,
                eventKey: L.eventKey(session.level),
                amount: L.SUN_PER_LEVEL,
                reason: '方块传奇通关第' + session.level + '关'
            });
            sun = res && res.awarded === false ? 0 : (res && res.amount) || L.SUN_PER_LEVEL;
            capped = !!(res && res.awarded === false);
        }
        persist();
        const meta = bridge && bridge.getMetaSummary ? bridge.getMetaSummary() : {};
        const lines = L.buildSettlement({
            level: session.level,
            sunAwarded: sun,
            sunCapped: capped,
            meta: meta
        });
        document.getElementById('settle-gain').textContent = lines.gain;
        document.getElementById('settle-progress').textContent = lines.progressLabel;
        document.getElementById('settle-next').textContent = lines.nextGoal;
        const next = session.level + 1;
        const can = L.tryUnlock({ unlockedLevel: progress.unlockedLevel, coined: session.coins }, next);
        const unlockBtn = document.getElementById('unlock-btn');
        unlockBtn.style.display = next <= L.LEVEL_TOTAL ? '' : 'none';
        unlockBtn.disabled = !can.ok && next > progress.unlockedLevel;
        unlockBtn.textContent = next <= progress.unlockedLevel ? '进入下一关' : '解锁第 ' + next + ' 关（' + (L.UNLOCK_COST[next - 1] || 0) + ' 金币）';
        toggleLayer('settle-layer', true);
        if (sfx && sfx.clear) sfx.clear();
    }

    function unlockNext() {
        const next = session.level + 1;
        if (next > L.LEVEL_TOTAL) return;
        if (next > progress.unlockedLevel) {
            const res = L.tryUnlock({ unlockedLevel: progress.unlockedLevel, coined: session.coins }, next);
            if (!res.ok) {
                toast('金币不够，先打怪或去商人那儿卖战利品。');
                return;
            }
            progress.unlockedLevel = res.unlockedLevel;
            session.coins = res.coined;
            persist();
        }
        toggleLayer('settle-layer', false);
        startLevel(next);
    }

    function spawnPickup(x, z, coins, loot) {
        const y = engine.world.surfaceAt(Math.floor(x), Math.floor(z)) + 0.35;
        const mesh = DROP_COLOR[loot]
            ? new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 0.28, 0.28),
                new THREE.MeshLambertMaterial({ color: DROP_COLOR[loot] })
            )
            : MOBS.coinMesh();
        mesh.position.set(x, y, z);
        engine.scene.add(mesh);
        session.pickups.push({ x: x, z: z, y: y, coins: coins || 0, loot: loot, mesh: mesh, bob: Math.random() * 6.28 });
    }

    function flashMesh(mesh) {
        if (!mesh) return;
        mesh.traverse(function (n) {
            if (n.material && n.material.emissive) {
                n.material.emissive.setHex(0xffffff);
                setTimeout(function () { if (n.material) n.material.emissive.setHex(0x000000); }, 80);
            }
        });
    }

    function popDamage(amount, crit, mob) {
        if (mob) MOBS.spawnDamageText(engine.scene, session.fx, mob, amount, crit);
    }

    function speakWord(word) {
        if (!word) return;
        const src = word.media && word.media.audio;
        if (src) {
            const href = (/^(https?:|\/|\.)/.test(src)) ? src : '../../' + src;
            const audio = new Audio(href);
            const p = audio.play();
            if (p && p.catch) p.catch(function () { speakFallback(word.text); });
            return;
        }
        speakFallback(word.text);
    }

    function speakFallback(text) {
        try {
            if (!window.speechSynthesis) return;
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-US';
            window.speechSynthesis.speak(u);
        } catch (e) { /* 静音不阻塞 */ }
    }

    function tick(dt) {
        const t = nowMs();
        // 渲染诊断（只读调试，供 E2E 排查）
        if (engine && engine.renderer && window.__blDebug) {
            const ri = engine.renderer.info.render;
            window.__blDebug.info = {
                calls: ri.calls,
                triangles: ri.triangles,
                sceneChildren: engine.scene.children.length,
                sceneGroups: engine.scene.children.filter(function (n) { return n.type === 'Group'; }).length
            };
        }
        if (session.quiz && t >= session.quizEndsAt) resolveQuiz(false);
        if (session.quiz) {
            const left = Math.max(0, session.quizEndsAt - t);
            const bar = document.getElementById('quiz-timer');
            if (bar) bar.style.width = Math.round(left / W.QUIZ_MS * 100) + '%';
        }
        if (session.boss) {
            session.boss = L.tickBoss(session.boss, t);
            paintBossShield();
            syncBossHud();
        }
        if (!session.paused) {
            stepMining(dt);
            updateLookCard(t);
            moveMonsters(dt, t);
            moveBolts(dt);
            collectPickups();
            // 脱战 4 秒缓慢回血
            if (engine.player.hp < engine.player.hpMax && t - (session.lastHitAt || 0) > 4000) {
                engine.player.hp = Math.min(engine.player.hpMax, engine.player.hp + 0.25 * dt);
            }
        }
        MOBS.stepFx(engine.scene, session.fx, dt);
        if (session.merchant && session.merchant.model) {
            session.merchant.model.update(dt, false, t / 1000);
        }
        if (viewModel) {
            const inp = engine.input;
            const moving = !!(inp.fwd || inp.back || inp.left || inp.right);
            viewModel.update(dt, moving);
        }
        updateMerchantTip();
        syncHud();
        drawMinimap();
    }

    function setHotbar(n) {
        document.querySelectorAll('.bl-slot').forEach(function (el) {
            el.classList.toggle('is-on', el.getAttribute('data-key') === String(n));
        });
    }

    function drawMinimap() {
        const c = document.getElementById('mini-map');
        if (!c || !engine) return;
        const ctx = c.getContext('2d');
        const w = engine.world;
        const scale = c.width / w.size;
        ctx.fillStyle = '#3d8a38';
        ctx.fillRect(0, 0, c.width, c.height);
        for (let z = 0; z < w.size; z += 2) {
            for (let x = 0; x < w.size; x += 2) {
                const h = w.surfaceAt(x, z);
                ctx.fillStyle = 'rgb(' + (48 + h * 6) + ',' + (90 + h * 16) + ',' + (36 + h * 4) + ')';
                ctx.fillRect(x * scale, z * scale, scale * 2 + 0.4, scale * 2 + 0.4);
            }
        }
        (w.trees || []).forEach(function (t) {
            ctx.fillStyle = '#1c4a16';
            ctx.fillRect(t.x * scale, t.z * scale, 2.2, 2.2);
        });
        session.monsters.forEach(function (m) {
            if (m.hp <= 0) return;
            ctx.fillStyle = m.isBoss ? '#3d7dff' : '#e23ad0';
            ctx.fillRect(m.x * scale - 1.2, m.z * scale - 1.2, 3, 3);
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(engine.player.x * scale, engine.player.z * scale, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    function moveMonsters(dt, t) {
        const p = engine.player;
        const tSec = t / 1000;
        session.monsters.forEach(function (m) {
            if (m.hp <= 0) return;
            const dx = p.x - m.x;
            const dz = p.z - m.z;
            const dist = Math.hypot(dx, dz) || 1;
            let moving = false;
            if (dist > C.CONTACT_RANGE) {
                moving = true;
                const step = m.speed * dt;
                const nx = m.x + dx / dist * step;
                const nz = m.z + dz / dist * step;
                if (!engine.columnBlocked(nx, m.z, m.y)) m.x = nx;
                if (!engine.columnBlocked(m.x, nz, m.y)) m.z = nz;
            } else {
                const hit = C.applyContact({ hp: p.hp, lastHitAt: session.lastHitAt }, {
                    contact: S.mitigate(m.contact, S.statsOf(progress.gear).def)
                }, t);
                if (hit.hit) {
                    p.hp = hit.hp;
                    session.lastHitAt = hit.lastHitAt;
                    hurtFlash();
                    if (p.hp <= 0) {
                        respawn();
                    } else {
                        toast('被碰到了！HP ' + Math.ceil(p.hp));
                    }
                }
            }
            m.y = engine.world.surfaceAt(Math.floor(m.x), Math.floor(m.z));
            if (m.mesh) {
                m.mesh.position.set(m.x, m.y, m.z);
                m.mesh.rotation.y = Math.atan2(dx, dz); // 面朝玩家（模型脸在 +z）
            }
            if (m.model) {
                m.model.update(dt, moving, tSec);
                if (m.hp < m.maxHp) m.model.setHp(m.hp / m.maxHp, true);
                m.model.faceHpBarTo(engine.camera);
            }
        });
    }

    function moveBolts(dt) {
        const keep = [];
        session.bolts.forEach(function (b) {
            b.life -= dt;
            const target = C.nearestMonster(b, session.monsters);
            const steered = C.steerBolt(b, target, dt);
            b.x = steered.x; b.z = steered.z; b.vx = steered.vx; b.vz = steered.vz;
            if (b.mesh) {
                b.mesh.position.set(b.x, b.y, b.z);
                const spin = b.mesh.userData.spin;
                if (spin) {
                    spin.core.rotation.y += dt * 9;
                    spin.halo.rotation.y -= dt * 5;
                    spin.halo.scale.setScalar(1 + Math.sin(Date.now() / 90) * 0.14);
                }
                b.trailAt = (b.trailAt || 0) - dt;
                if (b.trailAt <= 0) {
                    b.trailAt = 0.07;
                    MOBS.spawnBurst(engine.scene, session.fx, b.x, b.y, b.z, 0x9a5ce8, 1);
                }
            }
            let hit = null;
            if (target && Math.hypot(target.x - b.x, target.z - b.z) < 0.55) hit = target;
            if (hit) {
                requestHit(hit, 'bolt');
                engine.scene.remove(b.mesh);
                return;
            }
            if (b.life <= 0) {
                engine.scene.remove(b.mesh);
                return;
            }
            keep.push(b);
        });
        session.bolts = keep;
    }

    function collectPickups() {
        const p = engine.player;
        const tSec = Date.now() / 1000;
        const keep = [];
        session.pickups.forEach(function (item) {
            if (Math.hypot(item.x - p.x, item.z - p.z) < 1.15) {
                if (item.coins) session.coins = C.pickupCoins(session.coins, item.coins);
                session.bag = C.addLoot(session.bag, item.loot, 1);
                engine.scene.remove(item.mesh);
                MOBS.spawnBurst(engine.scene, session.fx, item.x, item.y, item.z, 0xffd24a, 5);
                persist();
                toast(item.coins ? ('金币 +' + item.coins) : ('获得 ' + item.loot));
                if (sfx && sfx.checkpoint) sfx.checkpoint();
                return;
            }
            if (item.mesh) {
                item.mesh.rotation.y += 0.06;
                item.mesh.position.y = item.y + Math.sin(tSec * 3 + item.bob) * 0.08;
            }
            keep.push(item);
        });
        session.pickups = keep;
    }

    function updateMerchantTip() {
        if (!session.merchant) return;
        const d = Math.hypot(engine.player.x - session.merchant.x, engine.player.z - session.merchant.z);
        session.nearMerchant = d < 2.2;
        const tip = document.getElementById('trade-tip');
        if (tip) tip.classList.toggle('is-hidden', !session.nearMerchant || session.paused);
    }

    function openTrade() {
        const lines = Object.keys(session.bag).filter(function (k) { return session.bag[k] > 0; });
        const copy = document.getElementById('trade-copy');
        if (!lines.length) copy.textContent = 'Sell loot, or buy gear below. Coins: ' + session.coins;
        else copy.textContent = lines.map(function (k) {
            return k + ' ×' + session.bag[k] + ' = ' + ((LOOT_PRICE[k] || 2) * session.bag[k]) + ' coins';
        }).join(' · ') + ' · wallet ' + session.coins;
        const list = document.getElementById('shop-list');
        if (list) {
            list.innerHTML = '';
            S.ITEMS.forEach(function (it) {
                const worn = progress.gear && progress.gear[it.slot] === it.id;
                const row = document.createElement('button');
                row.type = 'button';
                row.className = 'bl-shop-row';
                row.textContent = it.en + ' · ' + it.zh + '  $' + it.cost + (worn ? '  (on)' : '');
                row.addEventListener('click', function () { buyItem(it.id); });
                list.appendChild(row);
            });
        }
        toggleLayer('trade-layer', true);
    }

    function buyItem(id) {
        const res = S.buy({ coined: session.coins, gear: progress.gear }, id);
        if (!res.ok) {
            toast(res.reason === 'poor' ? '金币不够。' : '买不了这个。');
            return;
        }
        session.coins = res.coined;
        progress.gear = res.gear;
        if (res.heal && engine) {
            engine.player.hp = Math.min(engine.player.hpMax, engine.player.hp + res.heal);
            toast('HP +' + res.heal);
        } else {
            toast('Bought ' + ((res.item && res.item.en) || id));
        }
        persist();
        openTrade();
    }

    function sellAll() {
        let gain = 0;
        Object.keys(session.bag).forEach(function (k) {
            const n = Number(session.bag[k]) || 0;
            gain += n * (LOOT_PRICE[k] || 2);
            session.bag[k] = 0;
        });
        session.coins = C.pickupCoins(session.coins, gain);
        persist();
        toast(gain ? ('卖出战利品，金币 +' + gain) : '没有可卖的东西');
        toggleLayer('trade-layer', false);
    }

    function syncBossHud() {
        if (!session.boss) return;
        const hp = document.getElementById('boss-hp');
        const fill = document.getElementById('boss-fill');
        if (hp) hp.textContent = Math.ceil(session.boss.hp) + '/' + session.boss.maxHp;
        if (fill) fill.style.width = Math.max(0, Math.round(session.boss.hp / session.boss.maxHp * 100)) + '%';
    }

    function syncHud() {
        const coin = document.getElementById('coin-label');
        if (coin) coin.textContent = String(session.coins);
        const lv = document.getElementById('level-label');
        if (lv) lv.textContent = String(session.level);
        const fill = document.getElementById('hp-fill');
        const hpNum = document.getElementById('hp-num');
        if (engine) {
            const pct = Math.max(0, Math.round((engine.player.hp / engine.player.hpMax) * 100));
            if (fill) fill.style.width = pct + '%';
            if (hpNum) hpNum.textContent = Math.max(0, Math.ceil(engine.player.hp)) + '/' + engine.player.hpMax;
        }
        const learned = document.getElementById('stat-learned');
        const total = document.getElementById('stat-total');
        const bankEl = document.getElementById('stat-bank');
        const unread = document.getElementById('stat-unread');
        const right = document.getElementById('stat-right');
        const wrong = document.getElementById('stat-wrong');
        const known = progress.learnedIds.filter(function (id) {
            return pool.some(function (w) { return w.id === id; });
        }).length;
        if (learned) learned.textContent = String(known);
        if (total) total.textContent = String(pool.length || 0);
        if (bankEl) bankEl.textContent = String(bank.length || pool.length || 0);
        if (unread) unread.textContent = String(Math.max(0, (pool.length || 0) - known));
        if (right) right.textContent = String(progress.rightCount || 0);
        if (wrong) wrong.textContent = String(progress.wrongCount || 0);
        const atk = document.getElementById('atk-label');
        const def = document.getElementById('def-label');
        const gear = S.statsOf(progress.gear);
        if (atk) atk.textContent = String(Math.max(1, Math.round(C.BASE_MELEE * T.meleeScale(session.tool))) + gear.atk);
        if (def) def.textContent = String(1 + session.level + gear.def);
        const xpFill = document.getElementById('xp-fill');
        const xpNum = document.getElementById('xp-num');
        const poolN = pool.length || 1;
        if (xpFill) xpFill.style.width = Math.round(known / poolN * 100) + '%';
        if (xpNum) xpNum.textContent = known + '/' + (pool.length || 0);
        const mpFill = document.getElementById('mp-fill');
        const mpNum = document.getElementById('mp-num');
        if (mpFill) mpFill.style.width = Math.min(100, session.combo * 25) + '%';
        if (mpNum) mpNum.textContent = 'combo ' + session.combo;
        const chapter = document.getElementById('chapter-label');
        if (chapter) chapter.textContent = CHAPTERS[session.level] || CHAPTERS[1];
    }

    function toast(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { el.classList.remove('is-on'); }, 2400);
    }

    /** 受击红闪（画面边缘） */
    function hurtFlash() {
        const el = document.getElementById('hurt-flash');
        if (!el) return;
        el.classList.add('is-on');
        clearTimeout(hurtFlash._t);
        hurtFlash._t = setTimeout(function () { el.classList.remove('is-on'); }, 130);
    }

    /** 倒地复活：回出生点、满血、连击清零 */
    function respawn() {
        const w = engine.world;
        const cx = Math.floor(w.size / 2), cz = Math.floor(w.size / 2);
        engine.player.x = cx + 0.5;
        engine.player.z = cz + 0.5;
        engine.player.y = w.surfaceAt(cx, cz);
        engine.player.vy = 0;
        engine.player.hp = engine.player.hpMax;
        session.combo = 0;
        session.lastHitAt = nowMs();
        MOBS.spawnBurst(engine.scene, session.fx, engine.player.x, engine.player.y + 1, engine.player.z, 0x54d43c, 14);
        toast('倒下啦，回出生点复活！连击清零');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
