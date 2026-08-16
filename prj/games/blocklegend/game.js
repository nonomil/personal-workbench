/**
 * blocklegend · 装配层（T20260815-blocklegend-3d S2–S5）
 * 战斗 / 词卡暴击 / Boss 破防 / 结算解锁 / 商人 / 帮助
 */
(function () {
    'use strict';

    const GAME_ID = 'blocklegend';
    const LOOT_PRICE = {
        'slime-gel': 3, 'cube-shard': 5, 'husk-bone': 7,
        'oak-log': 2, 'stick': 1, 'dirt': 1, 'cobble': 2, 'plank': 2, 'table': 4,
        'fox-fur': 3, 'magma-cream': 4,
        'blaze-rod': 5, 'ghast-tear': 6, 'warden-horn': 8,
        gunpowder: 4, 'rotten-flesh': 3, bone: 4, string: 3,
        wood_sword: 6, wood_pick: 6, wood_axe: 6,
        wood_bow: 7, wood_shield: 7, arrow: 1, iron_sword: 10,
        wood_shovel: 5, stone_sword: 8, stone_pick: 8, stone_axe: 8, stone_shovel: 7,
        iron_pick: 10, iron_axe: 10, torch: 1, chest: 8, furnace: 8,
        door: 6, fence: 3, ladder: 3, bowl: 2, boat: 7, shears: 5, bucket: 5, fishing_rod: 7,
        'ender-pearl': 8, 'gold-nugget': 6, 'glow-dust': 5
    };
    const DROP_COLOR = {
        'oak-log': 0x6b4a28, 'stick': 0x8a6234, 'dirt': 0x8a6a3c, 'cobble': 0x7a7a80, 'plank': 0xe0b46a
    };
    const CHAPTERS = [
        '',
        '第一层 · 初生神域 · Genesis',
        '第二层 · 樱花林地 · Cherry',
        '第三层 · 沙海荒原 · Desert',
        '第四层 · 暮色河谷 · Duskvale',
        '第五层 · 晶簇森林 · Crystal',
        '第六层 · 下界熔岩 · Nether'
    ];
    const bridge = window.WorkbenchGameBridge;
    const ENG = window.BlockLegendEngine;
    const C = window.BlockLegendCombat;
    const W = window.BlockLegendWords;
    const L = window.BlockLegendLevels;
    const MOBS = window.BlockLegendMobs;
    const T = window.BlockLegendTools;
    const CR = window.BlockLegendCraft;
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
        casting: false,
        castBuf: '',
        tool: 'sword',
        mining: false,
        mine: null,
        lookKey: '',
        lookSince: 0,
        lookSpoken: false,
        placeLoot: 'dirt',
        atTable: false,
        craftCells: [null, null, null, null, null, null, null, null, null],
        craftSize: 2
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
        const craftClose = document.getElementById('craft-close');
        if (craftClose) craftClose.addEventListener('click', function () { toggleCraft(false); });
        const craftLayer = document.getElementById('craft-layer');
        if (craftLayer) {
            craftLayer.addEventListener('click', function (e) {
                const craftBtn = e.target.closest('[data-craft]');
                if (craftBtn) { doCraft(craftBtn.getAttribute('data-craft')); return; }
                const cell = e.target.closest('[data-cell]');
                if (cell) { takeCraftCell(Number(cell.getAttribute('data-cell'))); return; }
                const inv = e.target.closest('[data-inv]');
                if (inv) { putCraftItem(inv.getAttribute('data-inv')); return; }
                if (e.target.closest('#craft-out')) takeCraftResult();
            });
            craftLayer.addEventListener('contextmenu', function (e) {
                const inv = e.target.closest('[data-inv]');
                if (!inv) return;
                e.preventDefault();
                putCraftItem(inv.getAttribute('data-inv'));
            });
        }
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
        const quizForm = document.getElementById('quiz-type');
        if (quizForm) {
            quizForm.addEventListener('submit', function (e) {
                e.preventDefault();
                submitTypedQuiz();
            });
        }
        document.addEventListener('keydown', function (e) {
            if (session.quiz) {
                if (session.quiz.typed) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitTypedQuiz();
                    }
                    return;
                }
                if (e.key >= '1' && e.key <= '4') {
                    e.preventDefault();
                    pickQuizChoice(Number(e.key) - 1);
                }
                return;
            }
            if (e.key === 't' || e.key === 'T') {
                if (!overlayOpen() || session.casting) {
                    e.preventDefault();
                    setCasting(!session.casting);
                    return;
                }
            }
            if (session.casting) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setCasting(false);
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    tryCastSubmit();
                    return;
                }
                if (e.key === 'Backspace') {
                    e.preventDefault();
                    session.castBuf = session.castBuf.slice(0, -1);
                    paintCastHud();
                    return;
                }
                if (e.key.length === 1 && /[a-zA-Z'\-]/.test(e.key)) {
                    e.preventDefault();
                    appendCast(e.key);
                }
                return;
            }
            if (e.key === 'f' || e.key === 'F') {
                if (session.nearMerchant) openTrade();
            }
            if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                toggleCraft();
                return;
            }
            if (session.paused) return;
            if (e.key >= '1' && e.key <= '9') selectSlot(Number(e.key));
            if (e.key === 'q' || e.key === 'Q') tryBolt();
            if (e.key === 'Escape') {
                toggleLayer('help-layer', false);
                toggleLayer('trade-layer', false);
                toggleCraft(false);
            }
        });
    }

    function nowMs() { return Date.now(); }

    function overlayOpen() {
        return ['quiz-layer', 'settle-layer', 'trade-layer', 'help-layer', 'craft-layer'].some(function (id) {
            const el = document.getElementById(id);
            return el && !el.classList.contains('is-hidden');
        });
    }

    function toggleLayer(id, on) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('is-hidden', !on);
        session.paused = overlayOpen();
        if (engine && engine.setUiMode) engine.setUiMode(session.paused);
        if (!on && id === 'quiz-layer' && !session.paused && engine && engine.resumeLook) {
            engine.resumeLook();
        }
    }

    function nearTable() {
        if (!engine || !ENG.voxelAt) return false;
        const hit = lookHit();
        if (hit && hit.hit && hit.kind === 'table') return true;
        const p = engine.player;
        const y0 = Math.floor(p.y);
        for (let dz = -2; dz <= 2; dz += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
                const x = Math.floor(p.x) + dx;
                const z = Math.floor(p.z) + dz;
                if (ENG.voxelAt(engine.world, x, y0, z) === 'table') return true;
                if (ENG.voxelAt(engine.world, x, y0 + 1, z) === 'table') return true;
            }
        }
        return false;
    }

    function toggleCraft(forceOn, atTable) {
        const el = document.getElementById('craft-layer');
        if (!el) return;
        const on = forceOn == null ? el.classList.contains('is-hidden') : !!forceOn;
        session.atTable = atTable == null ? nearTable() : !!atTable;
        const nextSize = session.atTable ? 3 : 2;
        if (!on || session.craftSize !== nextSize) {
            session.bag = CR.dumpGrid(session.bag, session.craftCells);
            session.craftCells = CR.emptyGrid(nextSize);
        }
        session.craftSize = nextSize;
        if (on) paintCraft();
        toggleLayer('craft-layer', on);
        if (!on) {
            session.bag = CR.dumpGrid(session.bag, session.craftCells);
            session.craftCells = CR.emptyGrid(session.craftSize);
            persist();
        }
    }

    function itemLabel(id) {
        return (CR && CR.itemName) ? CR.itemName(id) : id;
    }

    function paintCraft() {
        const tip = document.getElementById('craft-tip');
        if (tip) tip.textContent = session.atTable
            ? '合成台 3×3：左边点配方一键做，或把材料摆进格子再点右边产物。'
            : '随身 2×2：只能做木板、木棍、合成台、火把。对着合成台右键打开 3×3。';
        paintCraftGrid();
        paintCraftBook();
        paintCraftInv();
        paintBagCounts();
    }

    function paintCraftGrid() {
        const grid = document.getElementById('craft-grid');
        const out = document.getElementById('craft-out');
        if (!grid || !CR) return;
        const size = session.craftSize;
        grid.className = 'bl-mc-grid size' + size;
        let html = '';
        for (let i = 0; i < size * size; i += 1) {
            const k = session.craftCells[i];
            html += '<button type="button" class="bl-mc-slot" data-cell="' + i + '">' +
                (k ? '<b>' + itemLabel(k) + '</b>' : '') + '</button>';
        }
        grid.innerHTML = html;
        const hit = CR.matchGrid(session.craftCells, size);
        if (out) {
            if (hit) {
                const outId = Object.keys(hit.recipe.outputs)[0];
                const n = hit.recipe.outputs[outId];
                out.innerHTML = '<b>' + itemLabel(outId) + '</b><em>×' + n + '</em>';
                out.disabled = false;
                out.setAttribute('data-ready', '1');
            } else {
                out.innerHTML = '';
                out.disabled = true;
                out.removeAttribute('data-ready');
            }
        }
    }

    function paintCraftBook() {
        const box = document.getElementById('craft-book');
        if (!box || !CR) return;
        const list = CR.recipesFor({ atTable: session.atTable });
        box.innerHTML = list.map(function (r) {
            const ready = CR.canCraft(session.bag, r.id, { atTable: session.atTable });
            return '<button type="button" class="bl-craft-btn' + (ready ? '' : ' is-off') + '" data-craft="' + r.id + '">' +
                '<b>' + r.name + '</b><span>' + r.zh + '</span></button>';
        }).join('');
    }

    function paintCraftInv() {
        const box = document.getElementById('craft-inv');
        if (!box) return;
        const keys = Object.keys(session.bag).filter(function (k) { return (Number(session.bag[k]) || 0) > 0; });
        box.innerHTML = keys.map(function (k) {
            return '<button type="button" class="bl-mc-slot" data-inv="' + k + '"><b>' + itemLabel(k) + '</b><em>×' + session.bag[k] + '</em></button>';
        }).join('') || '<span class="bl-mc-empty">背包是空的，先砍树挖石头</span>';
    }

    function putCraftItem(kind) {
        if (!kind || (Number(session.bag[kind]) || 0) <= 0) return;
        const n = session.craftSize * session.craftSize;
        for (let i = 0; i < n; i += 1) {
            if (!session.craftCells[i]) {
                session.craftCells[i] = kind;
                session.bag = C.addLoot(session.bag, kind, -1);
                if ((Number(session.bag[kind]) || 0) < 0) session.bag[kind] = 0;
                paintCraft();
                return;
            }
        }
    }

    function takeCraftCell(i) {
        const k = session.craftCells[i];
        if (!k) return;
        session.craftCells[i] = null;
        session.bag = C.addLoot(session.bag, k, 1);
        paintCraft();
    }

    function takeCraftResult() {
        if (!CR) return;
        const hit = CR.matchGrid(session.craftCells, session.craftSize);
        if (!hit) return;
        session.craftCells = CR.consumeGrid(session.craftCells, session.craftSize, hit);
        Object.keys(hit.recipe.outputs).forEach(function (k) {
            session.bag = C.addLoot(session.bag, k, hit.recipe.outputs[k]);
        });
        persist();
        paintCraft();
        toast('合成了 ' + hit.recipe.name);
    }

    function doCraft(id) {
        if (!CR) return;
        const r = CR.craft(session.bag, id, { atTable: session.atTable });
        if (!r.ok) {
            toast(r.reason || '材料不够');
            return;
        }
        session.bag = r.bag;
        persist();
        paintCraft();
        toast('合成了 ' + ((r.recipe && r.recipe.name) || id));
    }

    function bindCombatInput(canvas) {
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        document.addEventListener('mousedown', function (e) {
            if (e.target && e.target.closest && e.target.closest('.bl-layer, button, a')) return;
            if (session.paused) return;
            if (e.button === 0) {
                session.mining = true;
                if (meleeTarget()) tryMelee();
            }
            if (e.button === 2) {
                e.preventDefault();
                const hit = lookHit();
                if (hit && hit.hit && hit.kind === 'table') {
                    toggleCraft(true, true);
                    return;
                }
                tryPlace();
            }
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button === 0) stopMining();
        });
        document.querySelectorAll('.bl-slot[data-key]').forEach(function (el) {
            el.addEventListener('click', function () {
                const n = Number(el.getAttribute('data-key'));
                if (n >= 1 && n <= 9) selectSlot(n);
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
        session.gateAsked = null;
        session.quizTurn = 0;
        setCasting(false);
        const cfg = L.levelOf(session.level);
        session.wavesLeft = cfg.waves;
        pool = W.poolForLevel(bank, session.level);
        if (engine && engine.reloadWorld) {
            engine.reloadWorld(ENG.createWorld(cfg.worldSeed || (7 + session.level * 13), {
                climate: cfg.climate || 'plains',
                level: session.level,
                words: (pool || []).slice(0, 8)
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
        paintCastHud();
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
            isBoss: isBoss,
            height: model.height || 1.6,
            hitRadius: isBoss ? 1.2 : (spec.hitRadius || 0.45),
            bossHits: 0
        };
        bindMobWord(mob);
        if (mob.isBoss) {
            mob.hp = session.boss.hp;
            mob.maxHp = session.boss.maxHp;
            mob.coins = 20;
            model.setHp(1, true);
        }
        session.monsters.push(mob);
        paintCastHud();
        return mob;
    }

    function openMobSpot(px, pz) {
        const w = engine.world;
        const mid = Math.floor(w.size / 2);
        for (let r = 0; r < 8; r += 1) {
            for (let a = 0; a < 8; a += 1) {
                const x = px + Math.cos(a * Math.PI / 4) * r;
                const z = pz + Math.sin(a * Math.PI / 4) * r;
                const ix = Math.floor(x), iz = Math.floor(z);
                if (ix < 2 || iz < 2 || ix >= w.size - 2 || iz >= w.size - 2) continue;
                if (Math.abs(ix - mid) < 2 && Math.abs(iz - mid) < 2) continue;
                if (w.ponds && w.ponds[ix + ',' + iz]) continue;
                if (w.treeAt && w.treeAt(ix, iz)) continue;
                if (ENG.inHouse && ENG.inHouse(w, ix, iz)) continue;
                const y = w.surfaceAt(ix, iz);
                if (engine.columnBlocked && engine.columnBlocked(ix + 0.5, iz + 0.5, y)) continue;
                return { x: ix + 0.5, z: iz + 0.5 };
            }
        }
        return { x: px, z: pz };
    }

    function spawnWave() {
        session.wave += 1;
        session.wavesLeft = Math.max(0, session.wavesLeft - 1);
        const p = engine.player;
        const cfg = L.levelOf(session.level);
        const kinds = (cfg && cfg.waveKinds) || ['slime', 'cube', 'slime'];
        const spots = [
            { kind: kinds[0] || 'slime', dx: -6.2, dz: -6.2 },
            { kind: kinds[1] || 'cube', dx: -8.4, dz: 4.8 },
            { kind: kinds[2] || 'slime', dx: 7.2, dz: -5.6 }
        ];
        if (session.wave > 1) spots.push({ kind: kinds[2] || 'husk', dx: -11, dz: -6 });
        if (kinds[3]) spots.push({ kind: kinds[3], dx: 8.6, dz: 7.1 });
        spots.forEach(function (s) {
            const open = openMobSpot(p.x + s.dx, p.z + s.dz);
            spawnMonster(s.kind, open.x, open.z);
        });
    }

    function spawnBoss() {
        session.boss = L.createBoss(session.level);
        const p = engine.player;
        const open = openMobSpot(p.x + 8, p.z + 1);
        session.bossMob = spawnMonster('husk', open.x, open.z, { boss: true });
        const hud = document.getElementById('boss-hud');
        if (hud) hud.classList.remove('is-hidden');
        toast('凋零来了！砍它会掉血，答对单词破蓝罩。');
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

    function meleeHits() {
        const arc = session.monsters.filter(function (m) {
            return m.hp > 0 && C.inMeleeArc(engine.player, engine.look.yaw, m);
        });
        if (arc.length) return arc;
        const look = nearestLookMob();
        if (look && Math.hypot(look.x - engine.player.x, look.z - engine.player.z) <= C.MELEE_RANGE + (look.hitRadius || 0)) {
            return [look];
        }
        return [];
    }

    function meleeTarget() {
        return meleeHits()[0] || null;
    }

    function tryMelee() {
        if (!C.canAttack({ kind: 'melee', lastAt: session.lastMeleeAt, now: nowMs() })) return;
        session.lastMeleeAt = nowMs();
        if (viewModel) viewModel.triggerSwing();
        const hits = meleeHits();
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

    function selectPlace(loot) {
        session.tool = 'place';
        if (loot) session.placeLoot = loot;
        setHotbar(loot === 'cobble' ? 6 : loot === 'oak-log' ? 7 : loot === 'plank' ? 8 : loot === 'table' ? 9 : 5);
        if (viewModel && viewModel.setTool) viewModel.setTool('place');
    }

    function selectSlot(n) {
        const slot = Math.max(1, Math.min(9, Number(n) || 1));
        if (slot <= 4) {
            selectTool(slot - 1);
            return;
        }
        if (slot === 5) selectPlace('dirt');
        else if (slot === 6) selectPlace('cobble');
        else if (slot === 7) selectPlace('oak-log');
        else if (slot === 8) selectPlace('plank');
        else if (slot === 9) selectPlace('table');
        else setHotbar(slot);
    }

    function paintHearts() {
        const box = document.getElementById('hearts');
        if (!box || !engine) return;
        const max = Number(engine.player.hpMax) || 10;
        const hp = Math.max(0, Number(engine.player.hp) || 0);
        const per = max / 10;
        let html = '';
        for (let i = 0; i < 10; i += 1) {
            const v = hp - i * per;
            const cls = v >= per - 0.01 ? 'is-full' : v >= per * 0.45 ? 'is-half' : 'is-empty';
            html += '<i class="bl-heart ' + cls + '"></i>';
        }
        const stamp = String(Math.round(hp * 10) / 10) + '/' + max;
        if (box.dataset.hp === stamp) return;
        box.dataset.hp = stamp;
        box.innerHTML = html;
    }

    function paintFood() {
        const box = document.getElementById('food-pips');
        if (!box) return;
        if (box.childElementCount === 10) return;
        let html = '';
        for (let i = 0; i < 10; i += 1) html += '<i class="bl-pip is-full"></i>';
        box.innerHTML = html;
    }

    function paintBagCounts() {
        document.querySelectorAll('.bl-slot[data-place]').forEach(function (el) {
            const loot = el.getAttribute('data-place');
            let count = el.querySelector('.bl-count');
            if (!count) {
                count = document.createElement('b');
                count.className = 'bl-count';
                el.appendChild(count);
            }
            const n = Number(session.bag[loot]) || 0;
            count.textContent = n > 0 ? String(n) : '';
        });
    }

    function nextPlaceLoot() {
        const order = [session.placeLoot, 'dirt', 'cobble', 'oak-log', 'plank', 'table'];
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
        const hit = lookHit();
        const lookMob = nearestLookMob();
        const lookDist = lookMob
            ? Math.hypot(lookMob.x - engine.player.x, lookMob.z - engine.player.z)
            : Infinity;
        const action = C.aimAction({
            mining: true,
            inMelee: !!meleeTarget(),
            lookMob: !!lookMob,
            lookDist: lookDist,
            meleeRange: C.MELEE_RANGE,
            hasBlock: !!(hit && hit.hit && hit.y > 0)
        });
        if (action === 'melee') {
            tryMelee();
            paintBreakBar(0, false);
            hideTarget();
            hideCrack();
            return;
        }
        if (action !== 'mine' || !hit.hit || hit.y <= 0) {
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
        const bonus = CR && CR.toolBonus ? CR.toolBonus(session.bag, session.tool) : { mine: 1 };
        const need = Math.max(80, Math.round(T.breakMs(session.tool, hit.kind) / (bonus.mine || 1)));
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
        if (hit.kind === 'word') {
            const key = hit.x + ',' + hit.y + ',' + hit.z;
            const cell = engine.world.wordCells && engine.world.wordCells[key];
            const r = W.collectWordBlock({
                coins: session.coins,
                hp: engine.player.hp,
                hpMax: engine.player.hpMax,
                learnedIds: progress.learnedIds
            }, cell || {});
            session.coins = r.coins;
            engine.player.hp = r.hp;
            progress.learnedIds = r.learnedIds;
            if (engine.world.wordCells) delete engine.world.wordCells[key];
            if (cell && cell.text && global.WorkbenchGameBridge && global.WorkbenchGameBridge.recordWordAnswer) {
                global.WorkbenchGameBridge.recordWordAnswer(cell.text, true);
            }
            persist();
            toast((cell && cell.text ? cell.text + ' · ' + (cell.zh || '') + '  ' : '') + '+' + r.coinsGain + '金币 +' + r.heal + 'HP');
            MOBS.spawnBurst(engine.scene, session.fx, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0xf0c84a, 8);
            if (sfx && sfx.celebrate) sfx.celebrate();
            return;
        }
        if (T.placeKindOf(result.drop)) session.placeLoot = result.drop;
        session.bag = C.addLoot(session.bag, result.drop, 1);
        persist();
        toast('获得 ' + result.drop);
        MOBS.spawnBurst(engine.scene, session.fx, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0xc8b48a, 6);
        if (sfx && sfx.checkpoint) sfx.checkpoint();
    }

    function nearestLookMob() {
        const origin = eyeOrigin();
        const dir = T.lookDir(engine.look.yaw, engine.look.pitch);
        let best = null, bestDot = 0.74, bestDist = 7;
        session.monsters.forEach(function (m) {
            if (m.hp <= 0) return;
            const aim = C.aimPoint(m);
            const dx = aim.x - origin.x;
            const dy = aim.y - origin.y;
            const dz = aim.z - origin.z;
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
        if (hit && hit.hit) {
            if (hit.kind === 'word' && engine.world.wordCells) {
                const cell = engine.world.wordCells[hit.x + ',' + hit.y + ',' + hit.z];
                if (cell) return { type: 'block', kind: 'word', word: cell, hit: hit };
            }
            if (hit.kind === 'gate') {
                const gate = nearestWordGate(2.8);
                return { type: 'block', kind: 'gate', word: gate && gate.word, hit: hit };
            }
            return { type: 'block', kind: hit.kind, hit: hit };
        }
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
        const label = sub.word
            ? { en: sub.word.text, zh: sub.word.zh || '', word: sub.word }
            : W.labelFor(sub.kind, bank);
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
            if (!W.shouldAutoSpeak(sub.kind, sub.type)) return;
            const last = session.lookSpokenAt || {};
            if (last[sub.kind] && now - last[sub.kind] < 16000) return;
            last[sub.kind] = now;
            session.lookSpokenAt = last;
            speakWord(label.word || { text: label.en });
        }
    }

    function tryBolt() {
        if (!C.canAttack({ kind: 'bolt', lastAt: session.lastBoltAt, now: nowMs() })) return;
        session.lastBoltAt = nowMs();
        if (viewModel) viewModel.triggerCast();
        const f = C.forwardXZ(engine.look.yaw);
        const hasBow = CR && (Number(session.bag.wood_bow) || 0) > 0;
        const hasArrow = (Number(session.bag.arrow) || 0) > 0;
        let mesh;
        if (hasBow && hasArrow && MOBS.arrowMesh) {
            session.bag = C.addLoot(session.bag, 'arrow', -1);
            if ((Number(session.bag.arrow) || 0) < 0) session.bag.arrow = 0;
            mesh = MOBS.arrowMesh();
        } else {
            mesh = MOBS.boltMesh();
        }
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
        if (mob.isBoss) mob.bossHits = (Number(mob.bossHits) || 0) + 1;
        if (W.shouldAsk({ firstHit: firstHit, combo: session.combo, boss: !!mob.isBoss, bossHits: mob.bossHits })) {
            openQuiz(mob, kind);
            return;
        }
        applyResolvedHit(mob, kind, { answered: session.combo >= W.SKIP_COMBO, correct: session.combo >= W.SKIP_COMBO });
    }

    function fillQuizCard(quiz, kicker) {
        const word = quiz.word || {};
        const mode = quiz.mode || 'choice';
        const kick = document.querySelector('.bl-quiz-kicker');
        if (kick) kick.textContent = kicker || quiz.prompt || '暴击咒语';
        const enBtn = document.getElementById('quiz-en');
        enBtn.textContent = quiz.hidePromptWord
            ? (mode === 'listen' ? '🎧 听单词' : mode === 'picture' ? '看图选词' : mode === 'phrase' ? '写出英文句子' : '____')
            : word.text;
        const zhHint = document.getElementById('quiz-zh');
        if (zhHint) zhHint.textContent = (mode === 'spell' || mode === 'fill') ? (word.zh || '') : '';
        const img = document.getElementById('quiz-img');
        if (img) {
            const showImg = !!(word.media && word.media.image) && (mode === 'picture' || mode === 'spell' || mode === 'choice');
            if (showImg) {
                img.src = word.media.image;
                img.alt = word.text;
                img.classList.remove('is-hidden');
            } else {
                img.removeAttribute('src');
                img.alt = '';
                img.classList.add('is-hidden');
            }
        }
        const phrase = document.getElementById('quiz-phrase');
        const phraseZh = document.getElementById('quiz-phrase-zh');
        const phraseText = mode === 'phrase' ? '' : (mode === 'fill' ? (quiz.blank || '') : (quiz.hidePromptWord ? (quiz.blank || '') : (quiz.phrase || '')));
        if (phrase) {
            phrase.textContent = phraseText;
            phrase.classList.toggle('is-hidden', !phraseText);
        }
        if (phraseZh) {
            phraseZh.textContent = quiz.phraseZh || '';
            phraseZh.classList.toggle('is-hidden', !quiz.phraseZh);
        }
        const box = document.getElementById('quiz-choices');
        const typeBox = document.getElementById('quiz-type');
        const input = document.getElementById('quiz-input');
        box.innerHTML = '';
        if (quiz.typed) {
            box.classList.add('is-hidden');
            if (typeBox) typeBox.classList.remove('is-hidden');
            if (input) {
                input.value = '';
                setTimeout(function () { input.focus(); }, 30);
            }
        } else {
            box.classList.remove('is-hidden');
            if (typeBox) typeBox.classList.add('is-hidden');
            (quiz.choices || []).forEach(function (choice, i) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.setAttribute('data-quiz-i', String(i));
                btn.textContent = (i + 1) + '  ' + choice;
                btn.addEventListener('click', function () { resolveQuiz(W.checkQuiz(quiz, choice)); });
                box.appendChild(btn);
            });
        }
        session.quiz = quiz;
        session.quizEndsAt = nowMs() + (quiz.limitMs || W.QUIZ_MS);
        session.paused = true;
        setCasting(false);
        toggleLayer('quiz-layer', true);
        if (mode === 'listen' || mode === 'choice' || mode === 'fill') speakWord(word);
    }

    function nextLearnQuiz(word, extra) {
        session.quizTurn = (Number(session.quizTurn) || 0) + 1;
        return W.makeQuiz(word, bank, Object.assign({ turn: session.quizTurn }, extra || {}));
    }

    function openQuiz(mob, kind) {
        const word = W.nextWord(pool, progress.learnedIds) || pool[0];
        if (!word) {
            applyResolvedHit(mob, kind, { answered: false, correct: false });
            return;
        }
        session.pending = { mob: mob, kind: kind };
        fillQuizCard(nextLearnQuiz(word), '暴击咒语 · ' + (word.zh || ''));
    }

    function openGateQuiz(gate) {
        const word = gate.word || W.nextWord(pool, progress.learnedIds) || pool[0];
        if (!word) {
            ENG.openWordGate(engine.world, gate);
            if (engine.remeshAt) engine.remeshAt(gate.x, gate.z);
            return;
        }
        session.pending = { gate: gate };
        fillQuizCard(nextLearnQuiz(word, { gate: true }), '单词闸门 · 答对才能通过');
    }

    function pickQuizChoice(index) {
        if (!session.quiz || session.quiz.typed) return;
        const choice = session.quiz.choices && session.quiz.choices[index];
        if (!choice) return;
        resolveQuiz(W.checkQuiz(session.quiz, choice));
    }

    function submitTypedQuiz() {
        if (!session.quiz || !session.quiz.typed) return;
        const input = document.getElementById('quiz-input');
        resolveQuiz(W.checkQuiz(session.quiz, input && input.value));
    }

    function liveCastTargets() {
        return session.monsters.filter(function (m) {
            return m && m.hp > 0 && m.word && m.word.text;
        });
    }

    function bindMobWord(mob) {
        if (!mob) return;
        const used = session.monsters.map(function (m) {
            return m !== mob && m.word ? (m.word.id || m.word.text) : '';
        }).filter(Boolean);
        mob.word = W.bindCastWord(pool, used);
    }

    function paintCastHud() {
        const hud = document.getElementById('cast-hud');
        const list = document.getElementById('cast-words');
        const input = document.getElementById('cast-input');
        const kick = document.getElementById('cast-kicker');
        const targets = liveCastTargets();
        if (!hud) return;
        hud.classList.toggle('is-hidden', !targets.length);
        hud.classList.toggle('is-casting', !!session.casting);
        if (kick) {
            kick.textContent = session.casting
                ? '吟唱中 · 拼中文对应的英文，怪物会走近'
                : '打字施法 · T 吟唱 · 看中文拼英文击杀';
        }
        if (list) {
            list.innerHTML = '';
            const typed = String(session.castBuf || '').trim().toLowerCase();
            targets.forEach(function (m) {
                const chip = document.createElement('span');
                chip.className = 'bl-cast-chip';
                const en = String((m.word && m.word.text) || '').toLowerCase();
                if (typed && en.indexOf(typed) === 0) chip.classList.add('is-hot');
                chip.textContent = (m.kind || 'mob') + ' · ' + ((m.word && m.word.zh) || (m.word && m.word.text) || '');
                list.appendChild(chip);
            });
        }
        if (input) {
            input.value = session.castBuf || '';
            input.placeholder = session.casting ? 'type the word' : 'T 开始拼写';
        }
        if (session.casting && !targets.length) setCasting(false);
    }

    function setCasting(on) {
        const want = !!on && liveCastTargets().length > 0;
        session.casting = want;
        if (!want) session.castBuf = '';
        if (engine && engine.setCastMode) engine.setCastMode(want);
        paintCastHud();
    }

    function appendCast(ch) {
        session.castBuf = String(session.castBuf || '') + ch;
        paintCastHud();
        const hit = W.matchCast(session.castBuf, liveCastTargets());
        if (hit) fireCast(hit);
    }

    function tryCastSubmit() {
        const hit = W.matchCast(session.castBuf, liveCastTargets());
        if (hit) {
            fireCast(hit);
            return;
        }
        if (String(session.castBuf || '').trim()) {
            progress.wrongCount = (Number(progress.wrongCount) || 0) + 1;
            persist();
            toast('再拼一次');
        }
        session.castBuf = '';
        paintCastHud();
    }

    function fireCast(mob) {
        const word = mob && mob.word;
        session.castBuf = '';
        if (word && word.id && progress.learnedIds.indexOf(word.id) === -1) progress.learnedIds.push(word.id);
        progress.rightCount = (Number(progress.rightCount) || 0) + 1;
        if (word && word.text && global.WorkbenchGameBridge && global.WorkbenchGameBridge.recordWordAnswer) {
            global.WorkbenchGameBridge.recordWordAnswer(word.text, true);
        }
        persist();
        if (sfx && sfx.celebrate) sfx.celebrate();
        if (viewModel) viewModel.triggerCast();
        session.combo = C.nextCombo({ answered: true, correct: true, combo: session.combo });
        if (mob.isBoss && session.boss) {
            session.boss = L.chipShield(session.boss, 1, { now: nowMs() }).boss;
        }
        mob.asked = true;
        applyResolvedHit(mob, 'bolt', { answered: true, correct: true });
        if (mob.hp > 0) bindMobWord(mob);
        paintCastHud();
        toast((word && word.text) || 'Hit!');
    }

    function resolveQuiz(correct) {
        if (!session.pending) return;
        const pending = session.pending;
        const word = session.quiz && session.quiz.word;
        session.pending = null;
        session.quiz = null;
        toggleLayer('quiz-layer', false);
        if (correct) {
            progress.rightCount = (Number(progress.rightCount) || 0) + 1;
            if (word && word.id && progress.learnedIds.indexOf(word.id) === -1) progress.learnedIds.push(word.id);
            if (sfx && sfx.celebrate) sfx.celebrate();
        } else {
            progress.wrongCount = (Number(progress.wrongCount) || 0) + 1;
        }
        if (word && word.text && global.WorkbenchGameBridge && global.WorkbenchGameBridge.recordWordAnswer) {
            global.WorkbenchGameBridge.recordWordAnswer(word.text, correct);
        }
        persist();
        if (pending.gate) {
            if (correct) {
                ENG.openWordGate(engine.world, pending.gate);
                if (engine.remeshAt) engine.remeshAt(pending.gate.x, pending.gate.z);
                toast('闸门开了！');
            } else {
                toast('再试试才能过门');
                session.gateAsked = null;
            }
            return;
        }
        pending.mob.asked = true;
        if (correct && pending.mob.isBoss && session.boss) {
            session.boss = L.chipShield(session.boss, 1, { now: nowMs() }).boss;
        }
        session.combo = C.nextCombo({ answered: true, correct: correct, combo: session.combo });
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
            const bonus = CR && CR.toolBonus ? CR.toolBonus(session.bag, session.tool) : { melee: 1 };
            dmg = Math.max(1, Math.round(dmg * T.meleeScale(session.tool) * (bonus.melee || 1)));
            dmg += S.statsOf(progress.gear).atk;
        } else if (kind === 'bolt') {
            const bonus = CR && CR.toolBonus ? CR.toolBonus(session.bag, session.tool) : {};
            dmg = Math.max(1, Math.round(dmg * (bonus.bolt || 1)));
        }
        const crit = !!(verdict.answered && verdict.correct);
        if (mob.isBoss && session.boss) {
            const r = L.applyBossDamage(session.boss, dmg, { now: nowMs() });
            session.boss = r.boss;
            mob.hp = session.boss.hp;
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
        paintCastHud();
    }

    function killMonster(mob) {
        mob.hp = 0;
        const spec = C.monsterOf(mob.kind);
        MOBS.spawnBurst(engine.scene, session.fx, mob.x, mob.y, mob.z, spec.color, 12);
        if (mob.mesh) engine.scene.remove(mob.mesh);
        session.monsters = session.monsters.filter(function (m) { return m !== mob; });
        spawnPickup(mob.x, mob.z, mob.coins, mob.loot);
        paintCastHud();
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
            window.speechSynthesis.cancel();
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
            if (bar) bar.style.width = Math.round(left / ((session.quiz && session.quiz.limitMs) || W.QUIZ_MS) * 100) + '%';
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
            if (viewModel.setOffhand) viewModel.setOffhand((Number(session.bag.wood_shield) || 0) > 0);
            if (viewModel.setBladeKind) {
                viewModel.setBladeKind((Number(session.bag.iron_sword) || 0) > 0 ? 'iron' : 'wood');
            }
            viewModel.update(dt, moving);
        }
        updateMerchantTip();
        updateWordGate();
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

    function mobBlocked(x, z, y, flyer) {
        if (ENG.inHouse && ENG.inHouse(engine.world, x, z)) return true;
        if (flyer) return false;
        const r = 0.32;
        return engine.columnBlocked(x, z, y)
            || engine.columnBlocked(x + r, z, y)
            || engine.columnBlocked(x - r, z, y)
            || engine.columnBlocked(x, z + r, y)
            || engine.columnBlocked(x, z - r, y);
    }

    function moveMonsters(dt, t) {
        const p = engine.player;
        const tSec = t / 1000;
        session.monsters.forEach(function (m) {
            if (m.hp <= 0) return;
            const dx = p.x - m.x;
            const dz = p.z - m.z;
            const dist = Math.hypot(dx, dz) || 1;
            const flyer = !!(m.isBoss || m.kind === 'ghast' || m.kind === 'blaze');
            let moving = false;
            const ox = m.x, oz = m.z;
            if (dist > C.CONTACT_RANGE) {
                moving = true;
                const step = Math.max(1.05, m.speed) * dt;
                const ux = dx / dist, uz = dz / dist;
                const nx = m.x + ux * step;
                const nz = m.z + uz * step;
                if (!mobBlocked(nx, m.z, m.y, flyer)) m.x = nx;
                if (!mobBlocked(m.x, nz, m.y, flyer)) m.z = nz;
                if (m.x === ox && m.z === oz) {
                    const lx = -uz * step, lz = ux * step;
                    if (!mobBlocked(m.x + lx, m.z + lz, m.y, flyer)) {
                        m.x += lx; m.z += lz;
                    } else if (!mobBlocked(m.x - lx, m.z - lz, m.y, flyer)) {
                        m.x -= lx; m.z -= lz;
                    } else {
                        for (let a = 0; a < 8; a += 1) {
                            const sx = m.x + Math.cos(a * Math.PI / 4) * 0.7;
                            const sz = m.z + Math.sin(a * Math.PI / 4) * 0.7;
                            if (!mobBlocked(sx, sz, m.y, flyer)) { m.x = sx; m.z = sz; break; }
                        }
                    }
                }
            } else {
                const wall = ENG.wallBetween
                    ? ENG.wallBetween(engine.world, m.x, m.y + 1.1, m.z, p.x, p.y + 1.1, p.z)
                    : false;
                const canHit = C.canTouch(p, m, {
                    playerSheltered: !!(ENG.inHouse && ENG.inHouse(engine.world, p.x, p.z)),
                    mobSheltered: !!(ENG.inHouse && ENG.inHouse(engine.world, m.x, m.z)),
                    wallBetween: wall
                });
                if (canHit) {
                    const gearDef = S.statsOf(progress.gear).def;
                    const shieldDef = CR && CR.toolBonus ? (CR.toolBonus(session.bag, session.tool).def || 0) : 0;
                    const hit = C.applyContact({ hp: p.hp, lastHitAt: session.lastHitAt }, {
                        contact: S.mitigate(m.contact, gearDef + shieldDef)
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
            }
            const ground = engine.world.surfaceAt(Math.floor(m.x), Math.floor(m.z));
            m.y = flyer ? ground + (m.isBoss ? 1.6 : m.kind === 'ghast' ? 2.3 : 1.35) : ground;
            if (m.mesh) {
                m.mesh.position.set(m.x, m.y, m.z);
                const movedX = m.x - ox, movedZ = m.z - oz;
                if (Math.hypot(movedX, movedZ) > 0.0008) {
                    m.mesh.rotation.y = Math.atan2(movedX, movedZ);
                } else {
                    m.mesh.rotation.y = Math.atan2(dx, dz);
                }
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

    function nearestWordGate(range) {
        const gates = engine.world && engine.world.wordGates;
        if (!gates || !gates.length) return null;
        const p = engine.player;
        const max = range == null ? 2.3 : range;
        let best = null, bestD = max;
        gates.forEach(function (g) {
            if (g.open) return;
            const d = Math.hypot(p.x - (g.x + 0.5), p.z - (g.z + 0.5));
            if (d < bestD) {
                best = g;
                bestD = d;
            }
        });
        return best;
    }

    function updateWordGate() {
        if (session.paused || session.quiz) return;
        const gate = nearestWordGate(2.3);
        if (!gate) {
            session.gateAsked = null;
            return;
        }
        if (session.gateAsked === gate) return;
        session.gateAsked = gate;
        openGateQuiz(gate);
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
        const shield = document.getElementById('boss-shield');
        if (shield) {
            shield.textContent = session.boss.state === 'broken'
                ? '破罩'
                : ('蓝罩 ' + (session.boss.shield || 0));
        }
    }

    function syncHud() {
        const coin = document.getElementById('coin-label');
        if (coin) coin.textContent = String(session.coins);
        const lv = document.getElementById('level-label');
        if (lv) lv.textContent = String(session.level);
        paintHearts();
        paintFood();
        paintBagCounts();
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
        const bonus = CR && CR.toolBonus ? CR.toolBonus(session.bag, session.tool) : { melee: 1 };
        if (atk) atk.textContent = String(Math.max(1, Math.round(C.BASE_MELEE * T.meleeScale(session.tool) * (bonus.melee || 1))) + gear.atk);
        const shieldDef = CR && CR.toolBonus ? (CR.toolBonus(session.bag, session.tool).def || 0) : 0;
        if (def) def.textContent = String(1 + session.level + gear.def + shieldDef);
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
