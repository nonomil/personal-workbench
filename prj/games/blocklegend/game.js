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
        iron_pick: 10, iron_axe: 10, iron_shovel: 9, iron_ore: 3, iron_ingot: 6, coal: 2, torch: 1, chest: 8, furnace: 8,
        gold: 5, gold_ingot: 8, diamond: 12,
        gold_sword: 9, gold_pick: 9, gold_axe: 9, gold_shovel: 8,
        diamond_sword: 14, diamond_pick: 14, diamond_axe: 14, diamond_shovel: 13,
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
    const SP = window.BlockLegendSpeech;
    const P = window.BlockLegendCompanion;
    const L = window.BlockLegendLevels;
    const Q = window.BlockLegendQuests;
    const MOBS = window.BlockLegendMobs;
    const T = window.BlockLegendTools;
    const CR = window.BlockLegendCraft;
    const S = window.BlockLegendShop;
    const sfx = window.WorkbenchGameSfx;
    const THEME_BGM = './assets/audio/minecraft-theme.mp3';
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
        voice: { state: 'idle', rec: null, lock: null, blocked: false, buddy: false },
        buddyAt: 0,
        buddyKey: '',
        buddyConfig: null,
        buddyPick: '',
        buddyTypeOnly: false,
        lastHeard: '',
        missByWord: {},
        tool: 'sword',
        mining: false,
        mine: null,
        lookKey: '',
        lookSince: 0,
        lookSpoken: false,
        placeLoot: 'dirt',
        hotbar: T && T.emptyHotbar ? T.emptyHotbar() : ['sword', 'axe', 'pickaxe', 'shovel', 'dirt', 'cobble', 'oak-log', 'plank', 'table'],
        hotIndex: 0,
        invPick: null,
        helpPage: 0,
        atTable: false,
        craftCells: [null, null, null, null, null, null, null, null, null],
        craftSize: 3,
        quest: null,
        quizRetry: false,
        wordCorrect: 0
    };

    function emptyProgress() {
        return {
            unlockedLevel: 1,
            coined: 0,
            learnedIds: [],
            shownWordIds: [],
            spokenWordIds: [],
            reviewWords: [],
            rightCount: 0,
            wrongCount: 0,
            clearedLevels: [],
            bag: {},
            gear: {},
            hotbar: null
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
        engine.onJump = function () { if (sfx && sfx.jump) sfx.jump(); };
        // 第一人称手臂+剑：挂到相机上（相机需入场景，子对象才会渲染）
        viewModel = MOBS.createViewModel();
        engine.scene.add(engine.camera);
        engine.camera.add(viewModel.group);
        const back = document.getElementById('back-link');
        if (back && bridge && bridge.backHref) back.href = bridge.backHref('blocklegend');
        session.buddyConfig = readBuddyConfig();
        bindChrome();
        bindCombatInput(canvas);
        spawnMerchant();
        engine.onTick(tick);
        maybeShowBuddyGate();
        startTheme();
        if (bridge && bridge.recordPlaySession) bridge.recordPlaySession(GAME_ID);
        bank = (W.FALLBACK_BANK || []).slice();
        startLevel(progress.unlockedLevel || 1);
        W.loadCatalog(function (err, list) {
            if (err || !list || !list.length) {
                toast('词库稍后补上 · 先打面前的怪');
                return;
            }
            bank = list;
            refreshPool();
            paintSayStrip();
            syncHud();
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
            tool: function () { return session.tool; },
            playtest: isPlaytest,
            spawnKind: function (kind, x, z) {
                const p = engine.player;
                return spawnMonster(kind, x != null ? x : p.x + 3, z != null ? z : p.z + 2);
            },
            spawnBossId: function (bossId, x, z) {
                const p = engine.player;
                return spawnMonster('husk', x != null ? x : p.x + 4, z != null ? z : p.z + 3, { boss: true, bossId: bossId || 'wither' });
            },
            placeProp: function (kind, x, y, z) {
                return engine.placeProp ? engine.placeProp(kind, x, y, z) : { ok: false };
            }
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
        if (!Array.isArray(progress.shownWordIds)) progress.shownWordIds = [];
        if (!Array.isArray(progress.spokenWordIds)) progress.spokenWordIds = [];
        if (!Array.isArray(progress.reviewWords)) progress.reviewWords = [];
        if (!Array.isArray(progress.clearedLevels)) progress.clearedLevels = [];
        if (!progress.gear || typeof progress.gear !== 'object') progress.gear = {};
        session.coins = Number(progress.coined) || 0;
        session.bag = Object.assign({}, progress.bag || C.emptyBag());
        session.hotbar = T.normalizeHotbar(progress.hotbar);
        session.hotIndex = 0;
        session.invPick = null;
    }

    function persist() {
        progress.coined = session.coins;
        progress.bag = session.bag;
        progress.hotbar = session.hotbar;
        progress.gear = progress.gear || {};
        if (bridge && bridge.saveProgress) bridge.saveProgress(GAME_ID, progress);
        syncHud();
    }

    function startTheme() {
        if (sfx && sfx.playBgm) sfx.playBgm(THEME_BGM);
    }

    function paintAudioBtn() {
        const audioBtn = document.getElementById('audio-btn');
        if (!audioBtn) return;
        const muted = !!(sfx && sfx.isMuted && sfx.isMuted());
        audioBtn.textContent = muted ? '静音' : '音乐';
        audioBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        audioBtn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
    }

    function bindChrome() {
        const fullBtn = document.getElementById('fullscreen-btn');
        if (fullBtn) fullBtn.addEventListener('click', function () {
            const r = document.documentElement;
            if (!document.fullscreenElement) (r.requestFullscreen || function () {}).call(r);
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        document.getElementById('help-btn').addEventListener('click', function () {
            showHelpPage(0);
            toggleLayer('help-layer', true);
        });
        document.getElementById('help-close').addEventListener('click', function () { toggleLayer('help-layer', false); });
        const helpPrev = document.getElementById('help-prev');
        const helpNext = document.getElementById('help-next');
        if (helpPrev) helpPrev.addEventListener('click', function () { showHelpPage(session.helpPage - 1); });
        if (helpNext) helpNext.addEventListener('click', function () { showHelpPage(session.helpPage + 1); });
        const audioBtn = document.getElementById('audio-btn');
        if (audioBtn) {
            audioBtn.addEventListener('click', function () {
                const muted = !!(sfx && sfx.isMuted && sfx.isMuted());
                if (sfx && sfx.setMuted) sfx.setMuted(!muted);
                startTheme();
                paintAudioBtn();
            });
        }
        document.addEventListener('pointerdown', startTheme, { once: true });
        document.addEventListener('keydown', startTheme, { once: true });
        paintAudioBtn();
        const buddyBtn = document.getElementById('buddy-btn');
        if (buddyBtn) buddyBtn.addEventListener('click', function () { openBuddySettings(); });
        const buddyClose = document.getElementById('buddy-close');
        if (buddyClose) buddyClose.addEventListener('click', function () { toggleLayer('buddy-layer', false); });
        const buddyClear = document.getElementById('buddy-clear');
        if (buddyClear) buddyClear.addEventListener('click', function () { clearBuddySettings(); });
        const buddyRepick = document.getElementById('buddy-repick');
        if (buddyRepick) buddyRepick.addEventListener('click', function () { showBuddyGate(); });
        const gate = document.getElementById('buddy-gate');
        if (gate) {
            gate.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-buddy-pick]');
                if (!btn) return;
                chooseBuddy(btn.getAttribute('data-buddy-pick'));
            });
        }
        const buddyForm = document.getElementById('buddy-form');
        if (buddyForm) {
            buddyForm.addEventListener('submit', function (e) {
                e.preventDefault();
                applyBuddySettings();
            });
        }
        document.getElementById('trade-close').addEventListener('click', function () { toggleLayer('trade-layer', false); });
        const craftClose = document.getElementById('craft-close');
        if (craftClose) craftClose.addEventListener('click', function () { toggleCraft(false); });
        const craftLayer = document.getElementById('craft-layer');
        if (craftLayer) {
            craftLayer.addEventListener('click', function (e) {
                const craftBtn = e.target.closest('[data-craft]');
                if (craftBtn) { doCraft(craftBtn.getAttribute('data-craft')); return; }
                const cell = e.target.closest('[data-cell]');
                if (cell) {
                    if (session.invPick && session.invPick.from === 'inv') {
                        putCraftItem(session.invPick.id);
                        session.invPick = null;
                        paintCraft();
                        return;
                    }
                    takeCraftCell(Number(cell.getAttribute('data-cell')));
                    return;
                }
                const hot = e.target.closest('[data-hot]');
                if (hot) { clickCraftHot(Number(hot.getAttribute('data-hot'))); return; }
                const inv = e.target.closest('[data-inv]');
                if (inv) { clickCraftInv(inv.getAttribute('data-inv')); return; }
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
        const quizMic = document.getElementById('quiz-mic');
        if (quizMic) quizMic.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            listenOnce();
        });
        const voiceBox = document.getElementById('voice-fallback-choices');
        if (voiceBox) {
            voiceBox.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-voice-choice]');
                if (!btn) return;
                e.preventDefault();
                resolveVoiceFallback(Number(btn.getAttribute('data-voice-choice')));
            });
        }
        const keys = document.getElementById('cast-keyboard');
        if (keys) {
            keys.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-key], [data-action]');
                if (!btn || !session.casting) return;
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                if (action === 'backspace') {
                    session.castBuf = String(session.castBuf || '').slice(0, -1);
                    paintCastHud();
                    return;
                }
                if (action === 'clear') {
                    session.castBuf = '';
                    paintCastHud();
                    return;
                }
                if (action === 'enter') {
                    tryCastSubmit();
                    return;
                }
                const ch = btn.getAttribute('data-key');
                if (ch) appendCast(ch);
            });
        }
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
                if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    listenOnce();
                    return;
                }
                const inType = e.target && e.target.id === 'quiz-input';
                if (session.quiz.typed || inType) {
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
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                const wrap = e.target.closest('form, .bl-layer, .bl-buddy-type');
                const buried = !!(wrap && wrap.classList.contains('is-hidden'));
                if (buried) {
                    e.target.blur();
                } else {
                    if (e.key === 'Escape') {
                        showBuddyType(false);
                        toggleLayer('buddy-layer', false);
                    }
                    return;
                }
            }
            if (e.key === 'v' || e.key === 'V') {
                e.preventDefault();
                session.voice.buddy = false;
                startVoiceChallenge();
                return;
            }
            if (e.key === 'g' || e.key === 'G') {
                if (e.repeat) return;
                if (session.voice && session.voice.state === 'listening' && session.voice.lock && !session.voice.buddy) return;
                e.preventDefault();
                startBuddyListen();
                return;
            }
            if (session.voice && session.voice.lock && e.key >= '1' && e.key <= '4') {
                const box = document.getElementById('voice-fallback');
                if (box && !box.classList.contains('is-hidden')) {
                    e.preventDefault();
                    resolveVoiceFallback(Number(e.key) - 1);
                    return;
                }
            }
            if ((e.key === 't' || e.key === 'T') && !session.casting) {
                if (!overlayOpen()) {
                    e.preventDefault();
                    setCasting(true);
                    if (!session.casting) toast('先对准怪物按 V；听不清两次后再按 T 打字');
                    else toast('Esc 取消 · 再按字母拼单词');
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
                const gateOpen = document.getElementById('buddy-gate');
                if (gateOpen && !gateOpen.classList.contains('is-hidden')) {
                    chooseBuddy('play');
                    return;
                }
                toggleLayer('help-layer', false);
                toggleLayer('trade-layer', false);
                toggleLayer('buddy-layer', false);
                toggleCraft(false);
                showBuddyType(false);
            }
        });
        document.addEventListener('keyup', function (e) {
            if (e.key === 'g' || e.key === 'G') {
                if (session.voice && session.voice.buddy) stopVoiceRec();
            }
        });
        const buddyTypeForm = document.getElementById('buddy-type');
        if (buddyTypeForm) {
            buddyTypeForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const input = document.getElementById('buddy-input');
                const heard = input ? String(input.value || '').trim() : '';
                if (input) input.value = '';
                showBuddyType(false);
                if (heard) handleBuddyHeard(heard, session.voice && session.voice.lock);
            });
        }
    }

    function nowMs() { return Date.now(); }

    function overlayOpen() {
        return ['quiz-layer', 'settle-layer', 'trade-layer', 'help-layer', 'craft-layer', 'buddy-layer', 'buddy-gate'].some(function (id) {
            const el = document.getElementById(id);
            return el && !el.classList.contains('is-hidden');
        });
    }

    function showHelpPage(n) {
        const pages = document.querySelectorAll('#help-pages .bl-help-page');
        const total = pages.length || 1;
        session.helpPage = ((Number(n) || 0) % total + total) % total;
        pages.forEach(function (page, idx) {
            page.classList.toggle('is-hidden', idx !== session.helpPage);
        });
        const lab = document.getElementById('help-page-label');
        if (lab) lab.textContent = (session.helpPage + 1) + ' / ' + total;
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
        session.atTable = true;
        const nextSize = 3;
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

    function itemIconHtml(id) {
        const key = (CR && CR.itemIcon) ? CR.itemIcon(id) : 'unknown';
        const src = CR && CR.itemArt ? CR.itemArt(id) : '';
        if (src) {
            return '<img class="bl-item bl-item-art bl-item-' + key + '" src="' + src + '" alt="">';
        }
        return '<i class="bl-item bl-item-iso bl-item-' + key + '" aria-hidden="true"></i>';
    }

    function slotInner(id, count) {
        if (!id) return '';
        const n = Number(count);
        const qty = Number.isFinite(n) && n > 1 ? '<em>×' + n + '</em>' : (Number.isFinite(n) && n === 1 ? '' : '');
        return itemIconHtml(id) + qty;
    }

    function paintCraft() {
        const tip = document.getElementById('craft-tip');
        if (tip) {
            tip.textContent = '左边点配方一键做。点背包再点合成格放材料；点背包再点下面物品栏，把合成的东西装到 1–9。';
        }
        paintCraftGrid();
        paintCraftBook();
        paintCraftInv();
        paintCraftHotbar();
        paintHotbar();
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
            html += '<button type="button" class="bl-mc-slot" data-cell="' + i + '"' +
                (k ? ' data-item="' + k + '" title="' + itemLabel(k) + '"' : '') + '>' +
                slotInner(k) + '</button>';
        }
        grid.innerHTML = html;
        const hit = CR.matchGrid(session.craftCells, size);
        if (out) {
            if (hit) {
                const outId = Object.keys(hit.recipe.outputs)[0];
                const n = hit.recipe.outputs[outId];
                out.innerHTML = slotInner(outId, n);
                out.setAttribute('data-item', outId);
                out.title = itemLabel(outId);
                out.disabled = false;
                out.setAttribute('data-ready', '1');
            } else {
                out.innerHTML = '';
                out.disabled = true;
                out.removeAttribute('data-ready');
                out.removeAttribute('data-item');
                out.removeAttribute('title');
            }
        }
    }

    function paintCraftBook() {
        const box = document.getElementById('craft-book');
        if (!box || !CR) return;
        const list = CR.recipesFor({ atTable: session.atTable });
        box.innerHTML = list.map(function (r) {
            const ready = CR.canCraft(session.bag, r.id, { atTable: session.atTable });
            const outId = Object.keys(r.outputs || {})[0] || r.id;
            const mats = Object.keys(r.inputs || {}).map(function (k) {
                return '<span class="bl-craft-mat" title="' + itemLabel(k) + '">' +
                    itemIconHtml(k) + '<em>' + r.inputs[k] + '</em></span>';
            }).join('');
            return '<button type="button" class="bl-craft-btn' + (ready ? '' : ' is-off') + '" data-craft="' + r.id + '">' +
                itemIconHtml(outId) +
                '<span class="bl-craft-copy"><b>' + r.name + '</b><span class="bl-craft-mats">' + mats + '</span></span></button>';
        }).join('');
    }

    const INV_SLOTS = 27;

    function paintCraftInv() {
        const box = document.getElementById('craft-inv');
        if (!box) return;
        const keys = Object.keys(session.bag).filter(function (k) { return (Number(session.bag[k]) || 0) > 0; });
        let html = '';
        for (let i = 0; i < INV_SLOTS; i += 1) {
            const k = keys[i];
            const pick = session.invPick && session.invPick.from === 'inv' && session.invPick.id === k;
            html += '<button type="button" class="bl-mc-slot' + (pick ? ' is-pick' : '') + '"' +
                (k ? ' data-inv="' + k + '" data-item="' + k + '" title="' + itemLabel(k) + '"' : '') + '>' +
                (k ? slotInner(k, session.bag[k]) : '') + '</button>';
        }
        box.innerHTML = html;
    }

    function paintCraftHotbar() {
        const box = document.getElementById('craft-hotbar');
        if (!box) return;
        const bar = session.hotbar || T.emptyHotbar();
        let html = '';
        for (let i = 0; i < 9; i += 1) {
            const id = bar[i];
            const pick = session.invPick && session.invPick.from === 'hot' && session.invPick.index === i;
            const n = id && !T.isHotTool(id) ? (Number(session.bag[id]) || 0) : 0;
            html += '<button type="button" class="bl-mc-slot' + (pick ? ' is-pick' : '') + (session.hotIndex === i ? ' is-on' : '') +
                '" data-hot="' + i + '"' + (id ? ' data-item="' + id + '" title="' + itemLabel(id) + '"' : '') + '>' +
                (id ? slotInner(id, n > 1 ? n : 0) : '') + '<em>' + (i + 1) + '</em></button>';
        }
        box.innerHTML = html;
    }

    function clickCraftInv(id) {
        if (!id) return;
        if (session.invPick && session.invPick.from === 'hot') {
            session.hotbar = T.assignHotbar(session.hotbar, session.invPick.index, id);
            session.invPick = null;
            persist();
            paintCraft();
            toast('已装到物品栏。按 ' + ((session.hotIndex || 0) + 1) + '–9 选用。');
            return;
        }
        if (session.invPick && session.invPick.from === 'inv' && session.invPick.id === id) {
            putCraftItem(id);
            return;
        }
        session.invPick = { from: 'inv', id: id };
        paintCraftInv();
        paintCraftHotbar();
        toast('再点下面物品栏格子装上去，或再点一次放进合成格。');
    }

    function clickCraftHot(index) {
        const i = Math.max(0, Math.min(8, Number(index) || 0));
        if (session.invPick && session.invPick.from === 'inv') {
            session.hotbar = T.assignHotbar(session.hotbar, i, session.invPick.id);
            session.invPick = null;
            persist();
            paintCraft();
            toast('已装到物品栏 ' + (i + 1) + '。关掉后按 ' + (i + 1) + ' 选用。');
            return;
        }
        if (session.invPick && session.invPick.from === 'hot') {
            session.hotbar = T.swapHotbar(session.hotbar, session.invPick.index, i);
            session.invPick = null;
            persist();
            paintCraft();
            return;
        }
        session.invPick = { from: 'hot', id: session.hotbar[i], index: i };
        paintCraftHotbar();
        toast('再点背包物品互换，或点另一个物品栏格子对调。');
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
        if (sfx && sfx.craft) sfx.craft();
        toast(craftDoneTip(hit.recipe));
        if (hit.recipe && hit.recipe.id) noteQuest({ type: 'craft', id: hit.recipe.id });
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
        if (sfx && sfx.craft) sfx.craft();
        toast(craftDoneTip(r.recipe || { id: id, name: id }));
        noteQuest({ type: 'craft', id: id });
    }

    function craftDoneTip(recipe) {
        const id = recipe && recipe.id;
        const name = (recipe && recipe.name) || id || '物品';
        if (id === 'table' || id === 'chest' || id === 'furnace' || id === 'torch') {
            session.placeLoot = id;
            return '合成了' + name + '。点背包里的它，再点下面物品栏格子装上去，然后按 1–9 选用、右键放置。';
        }
        return '合成了 ' + name + '。点背包再点下面物品栏，就能装到 1–9。';
    }

    function bindCombatInput(canvas) {
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        document.addEventListener('mousedown', function (e) {
            if (e.target && e.target.closest && e.target.closest('.bl-layer, button, a')) return;
            hideLookTip();
            if (session.paused) return;
            if (e.button === 0) {
                session.mining = true;
                if (meleeTarget()) tryMelee();
            }
            if (e.button === 2) {
                e.preventDefault();
                if (tryInteract()) return;
                const hit = lookHit();
                if (hit && hit.hit && hit.kind === 'table') {
                    toggleCraft(true, true);
                    return;
                }
                if (session.tool === 'place') tryPlace();
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
        session.quizRetry = false;
        session.wordCorrect = 0;
        setCasting(false);
        const cfg = L.levelOf(session.level);
        session.wavesLeft = cfg.waves;
        session.quest = Q ? Q.create(session.level) : null;
        refreshPool();
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
        if (isPlaytest()) spawnPlaytestRoster();
        else spawnWave();
        paintSayStrip();
        syncHud();
    }

    function todayStr() {
        const d = new Date();
        const m = String(d.getMonth() + 1);
        const day = String(d.getDate());
        return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
    }

    function sessionMissed() {
        return Object.keys(session.missByWord || {}).filter(function (k) {
            return (Number(session.missByWord[k]) || 0) > 0;
        });
    }

    function refreshPool() {
        const cfg = L.levelOf(session.level);
        const src = (bank && bank.length) ? bank : (W.FALLBACK_BANK || []);
        const focusN = Number(cfg && cfg.targetWords) || 0;
        pool = (focusN && W.focusPool)
            ? W.focusPool(src, session.level, {
                size: focusN,
                prefer: (cfg && cfg.focusWords) || [],
                reviewRatio: (cfg && cfg.reviewRatio) || 0,
                review: progress.reviewWords || [],
                missed: sessionMissed(),
                mastery: readMastery(),
                today: todayStr()
            })
            : W.poolForLevel(src, session.level);
        if (!pool.length) pool = src.slice();
    }

    function isPlaytest() {
        try {
            return /(?:\?|&)playtest=1(?:&|$)/.test(String(window.location.search || ''));
        } catch (err) {
            return false;
        }
    }

    function spawnPlaytestRoster() {
        session.playtest = true;
        session.wavesLeft = 0;
        const p = engine.player;
        C.MONSTER_KINDS.forEach(function (kind, i) {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const open = openMobSpot(p.x + 4 + col * 2.5, p.z + 3 + row * 3);
            const mob = spawnMonster(kind, open.x, open.z);
            mob.parked = true;
        });
        session.boss = L.createBoss(session.level);
        ['wither', 'dragon', 'storm'].forEach(function (bossId, i) {
            const open = openMobSpot(p.x - 16, p.z + 18 + i * 4);
            const mob = spawnMonster('husk', open.x, open.z, { boss: true, bossId: bossId });
            mob.parked = true;
        });
        if (engine.placeProp) {
            const gx = Math.floor(p.x);
            const gz = Math.floor(p.z);
            const gy = engine.world.surfaceAt(gx + 1, gz - 2);
            engine.placeProp('chest', gx + 1, gy, gz - 2);
            engine.placeProp('furnace', gx + 2, engine.world.surfaceAt(gx + 2, gz - 2), gz - 2);
            engine.placeProp('torch', gx + 3, engine.world.surfaceAt(gx + 3, gz - 2), gz - 2);
        }
        toast('审查场：看每个生物的动作，走近才会追你。右键开箱/点熔炉。');
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
        const bossId = (extra && extra.bossId) || 'wither';
        const behavior = C.behaviorOf ? C.behaviorOf(spec.kind) : 'chase';
        const modelKind = isBoss
            ? ((L.bossModelOf && L.bossModelOf(bossId)) || 'boss')
            : spec.kind;
        const model = MOBS.create(modelKind, {
            boss: isBoss,
            bossId: bossId
        });
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
            behavior: behavior,
            speed: spec.speed * (C.behaviorSpeedScale ? C.behaviorSpeedScale(behavior) : 1),
            loot: spec.loot,
            x: x, z: z, y: y,
            mesh: mesh,
            model: model,
            asked: false,
            isBoss: isBoss,
            bossId: isBoss ? ((extra && extra.bossId) || 'wither') : '',
            height: model.height || 1.6,
            hitRadius: isBoss ? 1.2 : (spec.hitRadius || 0.45),
            bossHits: 0
        };
        bindMobWord(mob);
        if (mob.isBoss) {
            if (session.boss) {
                mob.hp = session.boss.hp;
                mob.maxHp = session.boss.maxHp;
            }
            mob.coins = 20;
            if (model.setHp) model.setHp(1, true);
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
        const kinds = (session.wave === 1)
            ? ['slime', 'slime']
            : ((cfg && cfg.waveKinds) || ['slime', 'cube', 'slime']);
        const count = kinds.length + (session.wave > 1 ? 1 : 0);
        const offs = C.waveOffsets ? C.waveOffsets(engine.look.yaw, count) : [
            { dx: 0, dz: -4 }, { dx: -2.2, dz: -5.2 }, { dx: 2.2, dz: -5.2 }
        ];
        offs.forEach(function (s, i) {
            const kind = kinds[Math.min(i, kinds.length - 1)] || 'slime';
            const open = openMobSpot(p.x + s.dx, p.z + s.dz);
            spawnMonster(kind, open.x, open.z);
        });
        if (session.wave === 1) toast('漏字史莱姆在正前方，对准它再砍');
    }

    function spawnBoss() {
        session.boss = L.createBoss(session.level);
        const p = engine.player;
        const open = openMobSpot(p.x + 16, p.z + 4);
        const cfg = L.levelOf(session.level);
        const bossId = (cfg && cfg.bossId) || 'wither';
        session.bossMob = spawnMonster('husk', open.x, open.z, { boss: true, bossId: bossId });
        const hud = document.getElementById('boss-hud');
        if (hud) hud.classList.remove('is-hidden');
        const bossName = L.bossTitle ? L.bossTitle(bossId) : '字母石像';
        toast(bossName + '来了！砍它会掉血，答对单词破罩。');
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
        if (sfx && sfx.swing) sfx.swing();
    }

    function selectTool(index) {
        const id = T.SLOT_IDS[index];
        if (!id) return;
        session.tool = id;
        if (session.mine) session.mine.acc = 0;
        session.hotIndex = index;
        setHotbar(index + 1);
        if (viewModel && viewModel.setTool) viewModel.setTool(id);
        showUseTip();
    }

    function selectPlace(loot) {
        session.tool = 'place';
        if (loot) session.placeLoot = loot;
        setHotbar((session.hotIndex || 0) + 1);
        if (viewModel && viewModel.setTool) viewModel.setTool('place');
        if (viewModel && viewModel.setPlaceKind) viewModel.setPlaceKind(loot || session.placeLoot || 'dirt');
        showUseTip();
    }

    function selectSlot(n) {
        const slot = Math.max(1, Math.min(9, Number(n) || 1));
        session.hotIndex = slot - 1;
        const id = (session.hotbar && session.hotbar[slot - 1]) || null;
        setHotbar(slot);
        if (!id) {
            session.tool = 'place';
            showUseTip();
            return;
        }
        if (T.isHotTool(id)) {
            selectTool(T.SLOT_IDS.indexOf(id));
            session.hotIndex = slot - 1;
            setHotbar(slot);
            return;
        }
        selectPlace(id);
        session.hotIndex = slot - 1;
        setHotbar(slot);
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
        const combo = Math.max(0, Math.min(10, Number(session.combo) || 0));
        const stamp = String(combo);
        if (box.dataset.combo === stamp) return;
        box.dataset.combo = stamp;
        let html = '';
        for (let i = 0; i < 10; i += 1) {
            html += '<i class="bl-pip' + (i < combo ? ' is-full' : '') + '"></i>';
        }
        box.innerHTML = html;
    }

    function paintHotbar() {
        const bar = session.hotbar || (T.emptyHotbar && T.emptyHotbar()) || [];
        document.querySelectorAll('.bl-hotbar .bl-slot').forEach(function (el) {
            const n = Number(el.getAttribute('data-key')) || 0;
            const id = bar[n - 1] || '';
            if (id) {
                el.setAttribute('data-item', id);
                if (T.isHotTool(id)) {
                    el.setAttribute('data-tool', id);
                    el.removeAttribute('data-place');
                } else {
                    el.setAttribute('data-place', id);
                    el.removeAttribute('data-tool');
                }
            } else {
                el.removeAttribute('data-item');
                el.removeAttribute('data-tool');
                el.removeAttribute('data-place');
            }
            const nBag = id && !T.isHotTool(id) ? (Number(session.bag[id]) || 0) : 0;
            el.innerHTML = (id ? slotInner(id, nBag > 1 ? nBag : 0) : '') + '<em>' + n + '</em>' +
                (nBag > 0 ? '<b class="bl-count">' + nBag + '</b>' : '');
            el.classList.toggle('is-on', session.hotIndex === n - 1);
        });
    }

    function paintBagCounts() {
        paintHotbar();
    }

    function nextPlaceLoot() {
        const order = [session.placeLoot, 'dirt', 'cobble', 'oak-log', 'plank', 'table', 'chest', 'furnace', 'torch'];
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
        if (kind === 'chest' || kind === 'furnace' || kind === 'torch') {
            if (!engine.placeProp) {
                toast('这里放不下。');
                return;
            }
            const res = engine.placeProp(kind, hit.prev.x, hit.prev.y, hit.prev.z);
            if (!res || !res.ok) {
                toast('这里放不下。');
                return;
            }
            session.bag = C.addLoot(session.bag, loot, -1);
            if ((Number(session.bag[loot]) || 0) < 0) session.bag[loot] = 0;
            session.placeLoot = loot;
            persist();
            if (viewModel) viewModel.triggerSwing();
            if (sfx && sfx.place) sfx.place();
            return;
        }
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
        if (sfx && sfx.place) sfx.place();
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
            spawnMineChips(hit, 2);
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
            if (engine.world.wordCells) delete engine.world.wordCells[key];
            W.collectWordBlock({
                coins: session.coins,
                hp: engine.player.hp,
                hpMax: engine.player.hpMax,
                learnedIds: progress.learnedIds
            }, cell || {});
            MOBS.spawnBurst(engine.scene, session.fx, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0xf0c84a, 8);
            if (!cell || !cell.text) {
                toast('单词方块碎了');
                return;
            }
            session.pending = { wordBlock: { cell: cell, key: key } };
            fillQuizCard(nextLearnQuiz(cell), '单词方块 · 答对才算学会');
            return;
        }
        if (T.placeKindOf(result.drop)) session.placeLoot = result.drop;
        session.bag = C.addLoot(session.bag, result.drop, 1);
        persist();
        toast('获得 ' + result.drop);
        spawnMineChips(hit, 6);
    }

    function spawnMineChips(hit, n) {
        const FX = globalThis.BlockLegendFx;
        const color = FX && FX.debrisColor ? FX.debrisColor(hit.kind) : 0xc8b48a;
        const sfxKind = FX && FX.mineSfxKind ? FX.mineSfxKind(hit.kind) : 'dirt';
        MOBS.spawnBurst(engine.scene, session.fx, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, color, n);
        if (sfx && sfx.mine) sfx.mine(sfxKind);
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

    function lookAim(origin, dir, x, y, z, maxDist, minDot) {
        const dx = x - origin.x;
        const dy = y - origin.y;
        const dz = z - origin.z;
        const dist = Math.hypot(dx, dy, dz) || 1;
        if (dist > (maxDist || 7)) return null;
        const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / dist;
        if (dot < (minDot == null ? 0.74 : minDot)) return null;
        return { dist: dist, dot: dot };
    }

    function nearestLookLife() {
        const origin = eyeOrigin();
        const dir = T.lookDir(engine.look.yaw, engine.look.pitch);
        let best = null, bestDot = 0.7, bestDist = 6;
        function consider(row, type, kind, y) {
            const aim = lookAim(origin, dir, row.x, y, row.z, 6, 0.7);
            if (!aim) return;
            if (aim.dot > bestDot && aim.dist < bestDist) {
                best = { type: type, kind: kind, row: row };
                bestDot = aim.dot;
                bestDist = aim.dist;
            }
        }
        (engine.world.animals || []).forEach(function (a) {
            consider(a, 'animal', a.kind, engine.world.surfaceAt(Math.floor(a.x), Math.floor(a.z)) + 0.4);
        });
        (engine.world.villagers || []).forEach(function (v) {
            consider(v, 'npc', v.role === 'trader' ? 'trader' : 'villager', engine.world.surfaceAt(Math.floor(v.x), Math.floor(v.z)) + 1.1);
        });
        (engine.world.golems || []).forEach(function (g) {
            consider(g, 'animal', 'golem', engine.world.surfaceAt(Math.floor(g.x), Math.floor(g.z)) + 1.4);
        });
        (engine.world.placedProps || []).forEach(function (p) {
            const row = { x: p.x + 0.5, z: p.z + 0.5, y: p.y, prop: p };
            consider(row, 'prop', p.kind, p.y + 0.4);
        });
        if (best && best.row && best.row.prop) best.prop = best.row.prop;
        return best;
    }

    function tryInteract() {
        const sub = lookSubject();
        if (!sub) return false;
        if (sub.type === 'npc') {
            openTrade();
            return true;
        }
        if (sub.type === 'prop' && sub.prop && sub.prop.mesh && sub.prop.mesh.userData.toggle) {
            sub.prop.mesh.userData.toggle();
            toast(sub.kind === 'chest' ? (sub.prop.mesh.userData.open ? '箱子打开了' : '箱子关上了')
                : sub.kind === 'furnace' ? (sub.prop.mesh.userData.lit ? '熔炉点着了' : '熔炉熄了')
                    : '互动了');
            return true;
        }
        if (sub.type === 'animal') {
            toast((W.labelFor(sub.kind, bank).en || sub.kind) + ' · ' + (W.labelFor(sub.kind, bank).zh || ''));
            return true;
        }
        return false;
    }

    function lookSubject() {
        const mob = nearestLookMob();
        if (mob) {
            const bossKind = L.bossModelOf ? L.bossModelOf(mob.bossId) : 'boss';
            return { type: 'mob', kind: mob.isBoss ? bossKind : mob.kind, mob: mob, word: mob.word };
        }
        if (session.merchant && session.nearMerchant) return { type: 'npc', kind: 'merchant' };
        const life = nearestLookLife();
        if (life) return life;
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
        const mine = document.getElementById('my-english');
        if (mine) {
            const n = W.countFamiliar
                ? W.countFamiliar(progress.learnedIds, readMastery())
                : (progress.learnedIds || []).length;
            mine.textContent = 'My English: ' + n + ' words';
        }
    }

    function hideLookTip() {
        const tip = document.getElementById('look-tip');
        if (tip) tip.classList.add('is-hidden');
    }

    function showUseTip() {
        const tip = document.getElementById('look-tip');
        if (!tip) return;
        if (session.tool === 'place') {
            tip.textContent = '右键对准方块邻面放置 · 左键仍是徒手敲 · 格子上的数字是背包数量';
        } else {
            tip.textContent = '左键挖/打 · 右键只互动（箱子/熔炉/工作台）· 换 5–9 才能放方块';
        }
        tip.classList.remove('is-hidden');
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
        if (!sub || (W.shouldShowLookLabel && !W.shouldShowLookLabel(sub.kind, sub.type) && !sub.word)) {
            card.classList.add('is-hidden');
            session.lookKey = '';
            if (session.targetRing) session.targetRing.visible = false;
            hideVoiceFallback();
            return;
        }
        const label = sub.word
            ? { en: sub.word.text, zh: sub.word.zh || '', word: sub.word }
            : W.labelFor(sub.kind, bank);
        const key = sub.type + ':' + sub.kind + (sub.mob ? ':' + sub.mob.x.toFixed(1) : '');
        const revealZh = !W.shouldRevealLookZh || W.shouldRevealLookZh({
            type: sub.type,
            asked: !!(sub.mob && sub.mob.asked)
        });
        document.getElementById('look-en').textContent = label.en;
        document.getElementById('look-zh').textContent = revealZh ? (label.zh || '') : '？';
        const lookImg = document.getElementById('look-img');
        const pic = revealZh && label.word && label.word.media && label.word.media.image;
        if (lookImg) {
            if (pic) {
                lookImg.src = pic;
                lookImg.alt = label.en || '';
                lookImg.classList.remove('is-hidden');
            } else {
                lookImg.removeAttribute('src');
                lookImg.alt = '';
                lookImg.classList.add('is-hidden');
            }
        }
        const meta = document.getElementById('look-meta');
        const who = document.getElementById('look-who');
        const hpBar = document.getElementById('look-hp');
        const hpFillLook = document.getElementById('look-hp-fill');
        if (sub.mob) {
            const hp = Math.max(0, sub.mob.hp);
            const hpMax = Math.max(1, sub.mob.maxHp || sub.mob.hp);
            meta.textContent = Math.ceil(hp) + '/' + Math.ceil(hpMax);
            if (who) {
                who.textContent = sub.mob.isBoss
                    ? ('BOSS · ' + ((L.bossTitle && L.bossTitle(sub.mob.bossId)) || 'Boss'))
                    : ('The Monster: ' + label.en);
            }
            if (hpBar) hpBar.classList.remove('is-hidden');
            if (hpFillLook) hpFillLook.style.width = Math.round(hp / hpMax * 100) + '%';
            const ring = ensureRing();
            ring.position.set(sub.mob.x, sub.mob.y + 0.04, sub.mob.z);
            ring.visible = true;
        } else {
            if (who) who.textContent = sub.type === 'npc' ? 'Merchant Leo · 商人雷奥' : '';
            if (hpBar) hpBar.classList.add('is-hidden');
            meta.textContent = '';
            if (session.targetRing) session.targetRing.visible = false;
        }
        card.classList.remove('is-hidden');
        hideLookTip();
        if (session.lookKey !== key) {
            session.lookKey = key;
            session.lookSince = now;
            session.lookSpoken = false;
            if (sub.kind === 'log') noteQuest({ type: 'look', kind: 'log' });
            if (sub.mob && sub.mob.word) noteWordShown(sub.mob.word);
            if (session.voice && session.voice.lock && session.voice.lock.mob !== sub.mob) {
                hideVoiceFallback();
            }
            if (sub.type === 'mob') maybeBuddyCue({ doing: 'look' });
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

    function launchBoltToward(mob, opts) {
        const cosmetic = !!(opts && opts.cosmetic);
        session.lastBoltAt = nowMs();
        if (viewModel) viewModel.triggerCast();
        const f = C.forwardXZ(engine.look.yaw);
        let vx = f.x * C.BOLT_SPEED;
        let vz = f.z * C.BOLT_SPEED;
        if (mob) {
            const dx = mob.x - engine.player.x;
            const dz = mob.z - engine.player.z;
            const len = Math.hypot(dx, dz) || 1;
            vx = dx / len * C.BOLT_SPEED;
            vz = dz / len * C.BOLT_SPEED;
        }
        const hasBow = CR && (Number(session.bag.wood_bow) || 0) > 0;
        const hasArrow = (Number(session.bag.arrow) || 0) > 0;
        let mesh;
        if (hasBow && MOBS.arrowMesh && (hasArrow || cosmetic)) {
            if (!cosmetic && hasArrow) {
                session.bag = C.addLoot(session.bag, 'arrow', -1);
                if ((Number(session.bag.arrow) || 0) < 0) session.bag.arrow = 0;
            }
            mesh = MOBS.arrowMesh();
        } else {
            mesh = MOBS.boltMesh();
        }
        const y = engine.player.y + ENG.EYE_HEIGHT * 0.7;
        mesh.position.set(engine.player.x + f.x * 0.6, y, engine.player.z + f.z * 0.6);
        mesh.rotation.y = Math.atan2(vx, vz);
        engine.scene.add(mesh);
        session.bolts.push({
            x: mesh.position.x, z: mesh.position.z, y: y,
            vx: vx, vz: vz,
            life: C.BOLT_LIFE, mesh: mesh, trailAt: 0,
            cosmetic: cosmetic,
            home: mob || null
        });
        if (sfx && sfx.bolt) sfx.bolt();
    }

    function tryBolt() {
        if (!C.canAttack({ kind: 'bolt', lastAt: session.lastBoltAt, now: nowMs() })) return;
        launchBoltToward(nearestLookMob());
    }

    function requestHit(mob, kind) {
        if (session.pending) return;
        if (mob.isBoss) mob.bossHits = (Number(mob.bossHits) || 0) + 1;
        if (W.shouldAsk({
            firstHit: !mob.asked,
            lastQuizWrong: !!mob.lastQuizWrong,
            hitsSinceQuiz: Number(mob.hitsSinceQuiz) || 0,
            voiceFails: Number(mob.voiceFails) || 0
        })) {
            openQuiz(mob, kind);
            return;
        }
        const askedCount = Number(mob.nudgeCount) || 0;
        if (!mob.vHinted || (mob.isBoss && W.shouldNudgeSpeak && W.shouldNudgeSpeak({
            firstHit: false,
            boss: true,
            hp: mob.hp,
            maxHp: mob.maxHp,
            askedCount: askedCount
        }))) {
            mob.vHinted = true;
            if (mob.isBoss) mob.nudgeCount = askedCount + 1;
            const label = mob.word || W.labelFor(mob.kind, bank);
            const en = (label && (label.text || label.en)) || '';
            if (en) toast('按 V 说 ' + en + ' · 暴击并破除防护罩');
        }
        if (mob.lastQuizWrong) mob.hitsSinceQuiz = (Number(mob.hitsSinceQuiz) || 0) + 1;
        applyResolvedHit(mob, kind, { answered: false, correct: false });
    }

    function fillQuizCard(quiz, kicker) {
        const word = quiz.word || {};
        const mode = quiz.mode || 'choice';
        const kick = document.querySelector('.bl-quiz-kicker');
        if (kick) kick.textContent = kicker || quiz.prompt || '暴击咒语';
        const enBtn = document.getElementById('quiz-en');
        enBtn.textContent = quiz.hidePromptWord
            ? (mode === 'listen' ? '🎧 听单词'
                : mode === 'picture' ? '看图选词'
                    : mode === 'phrase' ? '写出英文句子'
                        : mode === 'enpick' ? (word.zh || '看中文，选英文')
                            : '____')
            : (mode === 'sentence' ? (quiz.phrase || word.text) : word.text);
        const zhHint = document.getElementById('quiz-zh');
        if (zhHint) {
            const ipa = word.phonetic ? (' /' + word.phonetic + '/') : '';
            if (mode === 'enpick') zhHint.textContent = ipa.trim();
            else if (mode === 'spell' || mode === 'fill') zhHint.textContent = (word.zh || '') + ipa;
            else if (mode === 'choice' || mode === 'listen' || mode === 'sentence') zhHint.textContent = ipa.trim();
            else zhHint.textContent = '';
        }
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
        const phraseText = mode === 'fill'
            ? (quiz.blank || '')
            : (mode === 'sentence' || mode === 'listen' ? '' : (quiz.phrase || word.phrase || ''));
        const phraseZhText = (mode === 'sentence' || mode === 'choice' || mode === 'listen')
            ? ''
            : (quiz.phraseZh || word.phraseZh || '');
        if (phrase) {
            phrase.textContent = phraseText;
            phrase.classList.toggle('is-hidden', !phraseText);
        }
        if (phraseZh) {
            phraseZh.textContent = phraseZhText;
            phraseZh.classList.toggle('is-hidden', !phraseZhText);
        }
        const box = document.getElementById('quiz-choices');
        const typeBox = document.getElementById('quiz-type');
        const input = document.getElementById('quiz-input');
        box.innerHTML = '';
        const bossType = !!(session.pending && session.pending.mob && session.pending.mob.isBoss);
        if (quiz.typed) {
            box.classList.add('is-hidden');
            if (typeBox) typeBox.classList.remove('is-hidden');
            if (input) {
                input.value = '';
                setTimeout(function () { input.focus(); }, 30);
            }
        } else {
            box.classList.remove('is-hidden');
            if (typeBox) typeBox.classList.toggle('is-hidden', !bossType);
            if (input && bossType) {
                input.value = '';
                input.placeholder = 'type the English word';
            }
            (quiz.choices || []).forEach(function (choice, i) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.setAttribute('data-quiz-i', String(i));
                btn.textContent = (i + 1) + '  ' + choice;
                btn.addEventListener('click', function () { attemptQuiz(choice); });
                box.appendChild(btn);
            });
        }
        session.quiz = quiz;
        session.quizRetry = false;
        session.quizEndsAt = nowMs() + (quiz.limitMs || W.QUIZ_MS);
        session.paused = true;
        setCasting(false);
        toggleLayer('quiz-layer', true);
        noteWordShown(word);
        persist();
        const mic = document.getElementById('quiz-mic');
        if (mic) mic.classList.toggle('is-hidden', !(SP && SP.canSpeak && SP.canSpeak()));
        if (mode !== 'picture') speakWord(word);
        if (kick && bossType) kick.textContent = '说出来或打英文打碎蓝罩 · 点中文也能过';
    }

    function histMisses(word) {
        const key = String((word && word.text) || '').toLowerCase();
        if (!key || !bridge || typeof bridge.readState !== 'function') return 0;
        try {
            const st = bridge.readState();
            const item = st && st.courseProgress && st.courseProgress.minecraft
                && st.courseProgress.minecraft.mastery && st.courseProgress.minecraft.mastery[key];
            return W.missCount(item);
        } catch (e) {
            return 0;
        }
    }

    function missStreakOf(word) {
        const key = String((word && word.text) || '').toLowerCase();
        if (!key) return 0;
        if (session.missByWord && session.missByWord[key] != null) return Number(session.missByWord[key]) || 0;
        const hist = histMisses(word);
        return hist >= W.HARD_MISS ? hist : 0;
    }

    function noteWordResult(word, correct) {
        const key = String((word && word.text) || '').toLowerCase();
        if (!key) return;
        if (!session.missByWord) session.missByWord = {};
        session.missByWord[key] = correct ? 0 : missStreakOf(word) + 1;
    }

    function nextLearnQuiz(word, extra) {
        session.quizTurn = (Number(session.quizTurn) || 0) + 1;
        const mastery = readMastery();
        const key = String((word && word.text) || '').toLowerCase();
        const rec = mastery[key] || mastery[(word && (word.id || word.text)) || ''] || {};
        return W.makeQuiz(word, bank, Object.assign({
            turn: session.quizTurn,
            missStreak: missStreakOf(word),
            stage: W.masteryStage ? W.masteryStage(rec, todayStr()) : 'new'
        }, extra || {}));
    }

    function openQuiz(mob, kind) {
        const word = (mob && mob.word) || W.nextWord(pool, progress.learnedIds) || pool[0];
        if (!word) {
            applyResolvedHit(mob, kind, { answered: false, correct: false });
            return;
        }
        session.pending = { mob: mob, kind: kind };
        const quiz = nextLearnQuiz(word);
        const hard = W.needsHardMode(word, { missStreak: missStreakOf(word) });
        const kick = quiz.mode === 'enpick'
            ? '看中文，选英文'
            : quiz.mode === 'sentence'
                ? '选出这句话的意思'
                : (hard ? '这个词错过几次了，拼出来' : (quiz.prompt || '先做题才能打'));
        fillQuizCard(quiz, kick);
    }

    function openGateQuiz(gate) {
        const word = gate.word || W.nextWord(pool, progress.learnedIds) || pool[0];
        if (!word) {
            ENG.openWordGate(engine.world, gate);
            if (engine.remeshAt) engine.remeshAt(gate.x, gate.z);
            return;
        }
        session.pending = { gate: gate };
        fillQuizCard(nextLearnQuiz(word, { gate: true }), W.needsHardMode(word, { missStreak: missStreakOf(word) }) ? '单词闸门 · 这个词错过几次了，拼出来' : '单词闸门 · 选出中文');
    }

    function pickQuizChoice(index) {
        if (!session.quiz || session.quiz.typed) return;
        const choice = session.quiz.choices && session.quiz.choices[index];
        if (!choice) return;
        attemptQuiz(choice);
    }

    function submitTypedQuiz() {
        if (!session.quiz || !session.quiz.typed) return;
        const input = document.getElementById('quiz-input');
        attemptQuiz(input && input.value);
    }

    function liveCastTargets() {
        return session.monsters.filter(function (m) {
            return m && m.hp > 0 && m.word && m.word.text
                && W.canTypeCast({
                    boss: !!m.isBoss,
                    word: m.word,
                    missStreak: missStreakOf(m.word)
                });
        });
    }

    function wordKey(word) {
        return String((word && (word.id || word.text)) || '');
    }

    function noteWordShown(word) {
        const id = wordKey(word);
        if (!id || !W.noteId) return;
        progress.shownWordIds = W.noteId(progress.shownWordIds, id);
    }

    function noteWordSpoken(word) {
        const id = wordKey(word);
        if (!id || !W.noteId) return;
        progress.spokenWordIds = W.noteId(progress.spokenWordIds, id);
    }

    function bindMobWord(mob) {
        if (!mob) return;
        const used = session.monsters.map(function (m) {
            return m !== mob && m.word ? (m.word.id || m.word.text) : '';
        }).filter(Boolean);
        const kind = mob.isBoss
            ? ((L.bossModelOf && L.bossModelOf(mob.bossId)) || 'boss')
            : mob.kind;
        const cfg = L.levelOf ? L.levelOf(session.level) : null;
        const src = (pool && pool.length) ? pool : bank;
        mob.word = W.bindCastWord(src, used, {
            kind: kind,
            focus: (cfg && cfg.focusWords) || [],
            prefer: mob.word && mob.word.text
        });
        if (!mob.word) {
            const label = W.labelFor(kind, bank);
            mob.word = label.word || { id: label.en, text: label.en, zh: label.zh };
        }
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
            const hasBoss = targets.some(function (m) { return m.isBoss; });
            kick.textContent = session.casting
                ? (hasBoss ? '拼出英文打碎蓝罩' : '这些词错过几次了 · 拼英文，怪物还会走近')
                : (hasBoss ? 'Boss · T 打字破罩' : '顽固词 · T 吟唱拼英文');
        }
        if (list) {
            list.innerHTML = '';
            const typed = String(session.castBuf || '').trim().toLowerCase();
            targets.forEach(function (m) {
                const chip = document.createElement('span');
                chip.className = 'bl-cast-chip';
                const en = String((m.word && m.word.text) || '').toLowerCase();
                if (typed && en.indexOf(typed) === 0) chip.classList.add('is-hot');
                chip.textContent = ((m.word && m.word.text) || '') + (m.word && m.word.zh ? ' · ' + m.word.zh : '');
                list.appendChild(chip);
            });
        }
        if (input) {
            input.value = session.castBuf || '';
            input.placeholder = session.casting ? 'type the word' : 'T 开始拼写';
        }
        const ghost = document.getElementById('cast-ghost');
        if (ghost) {
            const aim = targets[0] && targets[0].word ? String(targets[0].word.text || '') : '';
            const typed = String(session.castBuf || '');
            ghost.innerHTML = aim
                ? ('<b>' + typed + '</b><em>' + aim.slice(typed.length) + '</em>')
                : '';
        }
        paintCastKeyboard(targets);
        if (session.casting && !targets.length) setCasting(false);
    }

    function paintCastKeyboard(targets) {
        const box = document.getElementById('cast-keyboard');
        if (!box) return;
        box.classList.toggle('is-hidden', !session.casting);
        if (!session.casting) {
            box.innerHTML = '';
            return;
        }
        const aim = String((targets[0] && targets[0].word && targets[0].word.text) || '').toLowerCase();
        const typed = String(session.castBuf || '').toLowerCase();
        const next = aim.charAt(typed.length);
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        box.innerHTML = rows.map(function (row) {
            return '<div class="bl-keys">' + row.split('').map(function (ch) {
                const cls = ch === next ? ' is-next' : (typed.indexOf(ch) >= 0 ? ' is-done' : '');
                return '<button type="button" class="bl-key' + cls + '" data-key="' + ch + '">' + ch + '</button>';
            }).join('') + '</div>';
        }).join('') + '<div class="bl-keys bl-keys-actions">'
            + '<button type="button" class="bl-key is-action" data-action="backspace">⌫</button>'
            + '<button type="button" class="bl-key is-action" data-action="clear">清空</button>'
            + '<button type="button" class="bl-key is-action" data-action="enter">确认</button>'
            + '</div>';
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
        noteWordResult(word, true);
        if (word && word.text && global.WorkbenchGameBridge && global.WorkbenchGameBridge.recordWordAnswer) {
            global.WorkbenchGameBridge.recordWordAnswer(word.text, true);
        }
        persist();
        if (sfx && sfx.reward) sfx.reward();
        if (viewModel) viewModel.triggerCast();
        session.combo = C.nextCombo({ answered: true, correct: true, combo: session.combo });
        if (mob.isBoss && session.boss) {
            chipBossShield('spell', 1);
        }
        mob.asked = true;
        launchBoltToward(mob, { cosmetic: true });
        applyResolvedHit(mob, 'bolt', { answered: true, correct: true, channel: 'spell' });
        if (mob.hp > 0 && !mob.isBoss) bindMobWord(mob);
        paintCastHud();
        toast((word && word.text) || 'Hit!');
    }

    function attemptQuiz(input) {
        if (!session.quiz || !session.pending) return;
        const result = W.resolveAttempt
            ? W.resolveAttempt(session.quiz, input, { retried: !!session.quizRetry })
            : { correct: W.checkQuiz(session.quiz, input), retry: false, record: true, crit: true, comboKeep: true };
        if (result.retry) {
            session.quizRetry = true;
            toast('再听一次 · ' + (result.reveal || ''));
            if (session.quiz.word) speakWord(session.quiz.word);
            const box = document.getElementById('quiz-choices');
            if (box) {
                Array.prototype.forEach.call(box.children, function (btn) {
                    const text = String(btn.textContent || '').replace(/^\d+\s+/, '');
                    if (text === String(result.reveal)) btn.classList.add('is-reveal');
                });
            }
            return;
        }
        session.quizRetry = false;
        resolveQuiz(!!result.correct, Object.assign({}, result, {
            channel: W.channelOf ? W.channelOf(session.quiz, input) : (session.quiz && session.quiz.typed ? 'spell' : 'choice')
        }));
    }

    function resolveQuiz(correct, result) {
        if (!session.pending) return;
        const pending = session.pending;
        const word = session.quiz && session.quiz.word;
        const rec = result || { record: true, crit: correct, comboKeep: correct };
        session.pending = null;
        session.quiz = null;
        toggleLayer('quiz-layer', false);
        if (rec.record) {
            if (correct) {
                progress.rightCount = (Number(progress.rightCount) || 0) + 1;
                if (word && word.id && progress.learnedIds.indexOf(word.id) === -1) progress.learnedIds.push(word.id);
                session.wordCorrect = (Number(session.wordCorrect) || 0) + 1;
                noteQuest({ type: 'word-correct', count: session.wordCorrect });
                if (sfx && sfx.celebrate) sfx.celebrate();
            } else {
                progress.wrongCount = (Number(progress.wrongCount) || 0) + 1;
            }
            noteWordResult(word, correct);
            if (word && word.text && global.WorkbenchGameBridge && global.WorkbenchGameBridge.recordWordAnswer) {
                global.WorkbenchGameBridge.recordWordAnswer(word.text, correct);
            }
        }
        persist();
        paintCastHud();
        if (pending.wordBlock) {
            const cell = pending.wordBlock.cell || {};
            if (correct && W.commitWordBlock) {
                const r = W.commitWordBlock({
                    coins: session.coins,
                    hp: engine.player.hp,
                    hpMax: engine.player.hpMax,
                    learnedIds: progress.learnedIds
                }, cell);
                session.coins = r.coins;
                engine.player.hp = r.hp;
                progress.learnedIds = r.learnedIds;
                persist();
                toast((cell.text || '') + ' · ' + (cell.zh || '') + '  +' + r.coinsGain + '金币 +' + r.heal + 'HP');
            } else {
                toast('再挖一块金色词块试试');
            }
            return;
        }
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
        pending.mob.lastQuizWrong = !correct;
        pending.mob.hitsSinceQuiz = 0;
        if (correct && rec.channel === 'speak') noteWordSpoken(word);
        if (correct && pending.mob.isBoss && session.boss) {
            chipBossShield(rec.channel, rec.channel === 'speak' ? 2 : 1);
        }
        if (!(correct && rec.comboKeep === false)) {
            session.combo = C.nextCombo({ answered: true, correct: correct, combo: session.combo });
        }
        applyResolvedHit(pending.mob, pending.kind, {
            answered: true,
            correct: correct,
            channel: rec.channel
        });
    }

    function noteQuest(ev) {
        if (!Q || !session.quest) return;
        session.quest = Q.apply(session.quest, ev);
        paintQuest();
    }

    function paintQuest() {
        const goal = document.getElementById('quest-goal');
        const hint = document.getElementById('quest-hint');
        if (!Q || !session.quest) return;
        const cur = Q.current(session.quest);
        if (goal) goal.textContent = cur.title || '';
        if (hint) hint.textContent = cur.hint || '';
    }

    function applyResolvedHit(mob, kind, verdict) {
        let dmg = C.damage({
            kind: kind,
            answered: verdict.answered,
            correct: verdict.correct,
            combo: session.combo
        });
        if (verdict.correct && verdict.channel && C.channelMultiplier) {
            const channel = session.combo >= 3 ? 'combo' : verdict.channel;
            const base = kind === 'bolt' ? C.BASE_BOLT : C.BASE_MELEE;
            dmg = base * C.channelMultiplier(channel);
        }
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
            mob.hurtFlash = 0.1;
            if (mob.model) mob.model.setHp(session.boss.hp / (session.boss.maxHp || 1), true);
            paintBossShield();
            syncBossHud();
            if (session.boss.dead) killBoss(mob);
            playCombatHit(crit);
            return;
        }
        hurtMonster(mob, dmg, crit);
    }

    function playCombatHit(crit) {
        if (!sfx) return;
        if (crit && sfx.crit) sfx.crit();
        else if (sfx.hit) sfx.hit();
    }

    function chipBossShield(channel, fallbackChip) {
        if (!session.boss) return;
        const before = session.boss.state;
        const chip = L.shieldChipOf ? L.shieldChipOf(channel, session.boss.shield) : fallbackChip;
        session.boss = L.chipShield(session.boss, chip, { now: nowMs() }).boss;
        if (before !== 'broken' && session.boss.state === 'broken') {
            noteQuest({ type: 'boss-shield-break' });
            if (sfx && sfx.shieldBreak) sfx.shieldBreak();
        }
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
        mob.hurtFlash = 0.1;
        if (mob.model) mob.model.setHp(mob.hp / (mob.maxHp || 1), true);
        if (res.dead) killMonster(mob);
        playCombatHit(crit);
        paintCastHud();
    }

    function killMonster(mob) {
        mob.hp = 0;
        const spec = C.monsterOf(mob.kind);
        MOBS.spawnBurst(engine.scene, session.fx, mob.x, mob.y, mob.z, spec.color, 12);
        if (mob.mesh && MOBS.beginDeath) MOBS.beginDeath(engine.scene, session.fx, mob.mesh);
        else if (mob.mesh) engine.scene.remove(mob.mesh);
        session.monsters = session.monsters.filter(function (m) { return m !== mob; });
        spawnPickup(mob.x, mob.z, mob.coins, mob.loot);
        paintCastHud();
        noteQuest({ type: 'kill', kind: mob.kind, quizCorrect: !!mob.asked });
        if (!session.boss && session.monsters.length === 0) {
            if (session.wavesLeft > 0) spawnWave();
            else spawnBoss();
        }
    }

    function killBoss(mob) {
        MOBS.spawnBurst(engine.scene, session.fx, mob.x, mob.y, mob.z, 0x8a5ca0, 26);
        MOBS.spawnBurst(engine.scene, session.fx, mob.x, mob.y + 1, mob.z, 0xf0d890, 14);
        if (mob.mesh && MOBS.beginDeath) MOBS.beginDeath(engine.scene, session.fx, mob.mesh);
        else if (mob.mesh) engine.scene.remove(mob.mesh);
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
        const reviewWords = sessionMissed();
        progress.reviewWords = reviewWords;
        persist();
        const lines = L.buildSettlement({
            level: session.level,
            sunAwarded: sun,
            sunCapped: capped,
            newWords: session.wordCorrect || 0,
            reviewWords: reviewWords
        });
        document.getElementById('settle-gain').textContent = lines.gain;
        document.getElementById('settle-progress').textContent = lines.progressLabel;
        document.getElementById('settle-next').textContent = lines.nextGoal;
        const next = session.level + 1;
        const unlockState = { unlockedLevel: progress.unlockedLevel, coined: session.coins, recallWords: recallWordCount() };
        const can = L.tryUnlock(unlockState, next);
        const unlockBtn = document.getElementById('unlock-btn');
        unlockBtn.style.display = next <= L.LEVEL_TOTAL ? '' : 'none';
        unlockBtn.disabled = !can.ok && next > progress.unlockedLevel;
        const listPrice = L.UNLOCK_COST[next - 1] || 0;
        const paid = listPrice && can.ok ? (session.coins - can.coined) : listPrice;
        unlockBtn.textContent = next <= progress.unlockedLevel
            ? '进入下一关'
            : ('解锁第 ' + next + ' 关（' + paid + ' 金币）');
        toggleLayer('settle-layer', true);
        if (sfx && sfx.levelClear) sfx.levelClear();
        else if (sfx && sfx.clear) sfx.clear();
    }

    function unlockNext() {
        const next = session.level + 1;
        if (next > L.LEVEL_TOTAL) return;
        if (next > progress.unlockedLevel) {
            const res = L.tryUnlock({
                unlockedLevel: progress.unlockedLevel,
                coined: session.coins,
                recallWords: recallWordCount()
            }, next);
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

    function paintHeard(text) {
        const el = document.getElementById('heard-text');
        if (el) el.textContent = text ? ('"' + text + '"') : '""';
        if (text && text !== '…') session.lastHeard = text;
    }

    function readBuddyConfig() {
        if (!P || !P.resolveBuddyConfig) return { enabled: false };
        const q = {};
        try {
            const usp = new URLSearchParams(window.location.search);
            q.buddyEndpoint = usp.get('buddyEndpoint') || '';
            q.buddyModel = usp.get('buddyModel') || '';
            q.buddyTts = usp.get('buddyTts') || '';
            q.buddyStt = usp.get('buddyStt') || '';
        } catch (e) { /* ignore */ }
        return P.resolveBuddyConfig({ query: q, window: window });
    }

    function fieldVal(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function setField(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value == null ? '' : String(value);
    }

    function paintBuddyHint() {
        const el = document.getElementById('buddy-hint');
        if (!el) return;
        const rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const android = /Android/i.test(navigator.userAgent || '');
        const on = session.buddyConfig && session.buddyConfig.enabled;
        const bits = [
            on ? 'Model on this session.' : 'Template buddy. Paste a model URL to upgrade.',
            android
                ? 'Android WebView usually has no speech. Type with G. 127.0.0.1 is this phone.'
                : (rec ? 'Mic ready. Hold G to talk.' : 'No speech API. Type with G.')
        ];
        el.textContent = bits.join(' ');
    }

    function maybeShowBuddyGate() {
        const search = window.location.search || '';
        if (P && P.shouldSkipBuddyGate && P.shouldSkipBuddyGate(search)) {
            toggleLayer('buddy-gate', false);
            return;
        }
        toggleLayer('buddy-gate', true);
    }

    function showBuddyGate() {
        toggleLayer('buddy-layer', false);
        toggleLayer('buddy-gate', true);
    }

    function chooseBuddy(pick) {
        const plan = P && P.applyBuddyPick ? P.applyBuddyPick(pick) : {
            pick: 'play', typeOnly: false, openForm: false, clearModel: true
        };
        session.buddyPick = plan.pick;
        session.buddyTypeOnly = !!plan.typeOnly;
        if (plan.clearModel) {
            window.BLOCKLEGEND_BUDDY = {};
            session.buddyConfig = readBuddyConfig();
        }
        toggleLayer('buddy-gate', false);
        startTheme();
        if (plan.openForm) {
            openBuddySettings();
            return;
        }
        toast(plan.typeOnly ? '只打字 · Type only' : '先玩 · Template buddy');
    }

    function openBuddySettings() {
        const cfg = session.buddyConfig || readBuddyConfig();
        const pasted = (window.BLOCKLEGEND_BUDDY) || {};
        setField('buddy-endpoint', cfg.endpoint || '');
        setField('buddy-model', cfg.model || 'deepseek-v4-flash');
        setField('buddy-api-key', pasted.apiKey || cfg.apiKey || '');
        setField('buddy-tts', cfg.ttsUrl || '');
        setField('buddy-stt', cfg.sttUrl || '');
        paintBuddyHint();
        toggleLayer('buddy-layer', true);
    }

    function applyBuddySettings() {
        window.BLOCKLEGEND_BUDDY = {
            endpoint: fieldVal('buddy-endpoint'),
            model: fieldVal('buddy-model') || 'deepseek-v4-flash',
            apiKey: fieldVal('buddy-api-key'),
            ttsUrl: fieldVal('buddy-tts'),
            sttUrl: fieldVal('buddy-stt')
        };
        session.buddyPick = 'home';
        session.buddyTypeOnly = false;
        session.buddyConfig = readBuddyConfig();
        paintBuddyHint();
        toggleLayer('buddy-layer', false);
        startTheme();
        toast(session.buddyConfig.enabled ? '已连家里电脑' : '没填地址，先玩模板');
    }

    function clearBuddySettings() {
        window.BLOCKLEGEND_BUDDY = {};
        setField('buddy-endpoint', '');
        setField('buddy-api-key', '');
        setField('buddy-tts', '');
        setField('buddy-stt', '');
        setField('buddy-model', 'deepseek-v4-flash');
        session.buddyPick = 'play';
        session.buddyTypeOnly = false;
        session.buddyConfig = readBuddyConfig();
        paintBuddyHint();
        toggleLayer('buddy-layer', false);
        toast('先玩 · Template buddy');
    }

    function collectSnapshot() {
        const sub = lookSubject();
        const word = sub && (sub.word || (sub.mob && sub.mob.word));
        return {
            look: sub ? {
                type: sub.type,
                kind: sub.kind,
                word: word && (word.text || word.en || word)
            } : null,
            doing: session.casting ? 'type'
                : (session.voice && session.voice.buddy ? 'talk'
                    : (session.nearMerchant ? 'walk-merchant' : 'look')),
            heard: session.lastHeard || '',
            unread: W.unreadSpeakCount
                ? W.unreadSpeakCount(progress.shownWordIds || [], progress.spokenWordIds || [])
                : 0,
            shield: session.boss ? session.boss.state : '',
            nearMerchant: !!session.nearMerchant,
            lastCueAt: session.buddyAt || 0,
            now: nowMs()
        };
    }

    function maybeBuddyCue(extra) {
        if (!P || !P.decideCue) return;
        const snap = Object.assign(collectSnapshot(), extra || {});
        const key = [
            snap.look && snap.look.word,
            snap.doing,
            snap.heard,
            snap.shield,
            extra && extra.heardHit ? 'hit' : ''
        ].join('|');
        if (key === session.buddyKey && !(extra && extra.force)) return;
        session.buddyKey = key;
        const cue = P.decideCue(snap);
        if (!cue || cue.kind === 'silent') return;
        session.buddyAt = snap.now;
        showBuddy(cue.say);
    }

    function showBuddy(text) {
        const el = document.getElementById('buddy-say');
        if (el) {
            el.textContent = text || '';
            el.classList.toggle('is-on', !!text);
            clearTimeout(showBuddy._t);
            if (text) showBuddy._t = setTimeout(function () { el.classList.remove('is-on'); }, 3200);
        }
        speakBuddy(text);
    }

    function speakBuddy(text) {
        if (!P || !P.planSpeak || !text) return;
        const plan = P.planSpeak(text, {
            voices: window.speechSynthesis ? window.speechSynthesis.getVoices() : [],
            ttsUrl: session.buddyConfig && session.buddyConfig.ttsUrl
        });
        if (plan.method === 'edge-tts') {
            fetch(plan.url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ text: plan.text, voice: plan.voice })
            }).then(function (res) {
                if (!res.ok) throw new Error('tts');
                return res.blob();
            }).then(function (blob) {
                const audio = new Audio(URL.createObjectURL(blob));
                audio.play();
            }).catch(function () {
                speakSynth(plan.text, plan.voice);
            });
            return;
        }
        if (plan.method === 'speechSynthesis') speakSynth(plan.text, plan.voice);
    }

    function speakSynth(text, voiceName) {
        if (!window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-US';
            const voices = window.speechSynthesis.getVoices() || [];
            const picked = voices.filter(function (v) { return v.name === voiceName; })[0]
                || (P && P.pickTtsVoice ? P.pickTtsVoice(voices) : null);
            if (picked) u.voice = picked;
            window.speechSynthesis.speak(u);
        } catch (e) { /* 静音不阻塞 */ }
    }

    function showBuddyType(on) {
        const form = document.getElementById('buddy-type');
        if (!form) return;
        form.classList.toggle('is-hidden', !on);
        const input = document.getElementById('buddy-input');
        if (on) {
            if (input) setTimeout(function () { input.focus(); }, 30);
        } else if (input) {
            input.blur();
        }
    }

    function startBuddyListen() {
        const sub = lookSubject();
        const word = sub && sub.mob && sub.mob.word;
        session.voice.buddy = true;
        session.voice.lock = word ? {
            mob: sub.mob,
            word: word,
            targetKey: wordKey(word),
            startedAt: nowMs()
        } : null;
        if (session.buddyTypeOnly || (!hasWebSpeech() && !hasGatewayStt())) {
            setVoiceState('unsupported');
            showBuddyType(true);
            return;
        }
        listenOnce({ lock: session.voice.lock, buddy: true });
    }

    function askBuddyModel(heard, snap) {
        const req = P.buildChatRequest({
            snapshot: snap,
            heard: heard,
            config: session.buddyConfig || {}
        });
        const ctrl = new AbortController();
        const timer = setTimeout(function () { ctrl.abort(); }, 2000);
        return fetch(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify(req.body),
            signal: ctrl.signal
        }).then(function (res) {
            return res.json();
        }).then(function (json) {
            return P.parseChatReply(json);
        }).finally(function () {
            clearTimeout(timer);
        });
    }

    function handleBuddyHeard(heard, lock) {
        paintHeard(heard);
        const snap = collectSnapshot();
        const ask = session.buddyConfig && session.buddyConfig.enabled
            ? function () { return askBuddyModel(heard, snap); }
            : null;
        P.runBuddyTurn({
            heard: heard,
            snapshot: snap,
            matchHeard: SP && SP.matchHeard,
            askModel: ask,
            speak: showBuddy
        }).then(function (turn) {
            if (turn && turn.hit && lock && lock.mob) applySpeakHit(lock, heard);
        });
    }

    function setVoiceState(state) {
        if (!session.voice) session.voice = { state: 'idle', rec: null, lock: null, blocked: false };
        session.voice.state = state;
        const box = document.getElementById('heard-box');
        if (box) box.classList.toggle('is-listening', state === 'listening');
    }

    function stopVoiceRec() {
        const rec = session.voice && session.voice.rec;
        if (rec) {
            try { rec.abort(); } catch (e) { /* ignore */ }
            session.voice.rec = null;
        }
        if (session.voice && session.voice.state === 'listening') setVoiceState('idle');
    }

    function voiceLockAlive(lock) {
        const mob = lock && lock.mob;
        if (!mob || mob.hp <= 0) return false;
        if (wordKey(mob.word) !== lock.targetKey) return false;
        const dist = Math.hypot(mob.x - engine.player.x, mob.z - engine.player.z);
        return dist <= 18;
    }

    function startVoiceChallenge() {
        const sub = lookSubject();
        if (!sub || sub.type !== 'mob' || !sub.mob || !sub.mob.word || !sub.mob.word.text) {
            toast('先对准怪物');
            return;
        }
        const lock = {
            mob: sub.mob,
            word: sub.mob.word,
            targetKey: wordKey(sub.mob.word),
            startedAt: nowMs()
        };
        session.voice.lock = lock;
        if (session.buddyTypeOnly || session.voice.blocked || (!hasWebSpeech() && !hasGatewayStt())) {
            setVoiceState('unsupported');
            showVoiceFallback(lock, { reason: 'unsupported' });
            return;
        }
        listenOnce({ lock: lock });
    }

    function applySpeakHit(lock, heard) {
        const mob = lock && lock.mob;
        const word = lock && lock.word;
        if (!voiceLockAlive(lock)) {
            setVoiceState('idle');
            toast('目标已离开');
            return;
        }
        noteWordSpoken(word);
        if (mob.isBoss && session.boss) {
            chipBossShield('speak', 2);
        }
        mob.voiceFails = 0;
        mob.asked = true;
        session.combo = C.nextCombo({ answered: true, correct: true, combo: session.combo });
        applyResolvedHit(mob, 'melee', { answered: true, correct: true, channel: 'speak' });
        hideVoiceFallback();
        setVoiceState('matched');
        toast((heard || (word && word.text) || '') + ' · 暴击');
        maybeBuddyCue({ doing: 'speak-hit', heardHit: true, force: true });
    }

    function showVoiceFallback(lock, opts) {
        const o = opts || {};
        const box = document.getElementById('voice-fallback');
        const list = document.getElementById('voice-fallback-choices');
        const kick = document.getElementById('voice-fallback-kicker');
        if (!box || !list || !lock || !lock.word) return;
        session.voice.lock = lock;
        const quiz = W.makeQuiz(lock.word, pool.length ? pool : bank, { mode: 'choice' });
        session.voice.choices = (quiz && quiz.choices) || [];
        list.innerHTML = '';
        session.voice.choices.forEach(function (zh, i) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-voice-choice', String(i));
            btn.textContent = (i + 1) + ' ' + zh;
            list.appendChild(btn);
        });
        if (kick) {
            kick.textContent = o.reason === 'unsupported'
                ? '没有麦克风 · 点中文或按 T'
                : '选中文 · 世界不停';
        }
        box.classList.remove('is-hidden');
        session.paused = false;
        if (engine && engine.setUiMode) engine.setUiMode(false);
    }

    function hideVoiceFallback() {
        const box = document.getElementById('voice-fallback');
        if (box) box.classList.add('is-hidden');
        if (session.voice) session.voice.choices = null;
    }

    function resolveVoiceFallback(index) {
        const lock = session.voice && session.voice.lock;
        const choices = (session.voice && session.voice.choices) || [];
        const picked = choices[index];
        if (!lock || picked == null) return;
        const ok = String(picked) === String(lock.word.zh);
        hideVoiceFallback();
        if (!voiceLockAlive(lock)) {
            toast('目标已离开');
            return;
        }
        if (ok) {
            applySpeakHit(lock, lock.word.text);
        } else {
            toast('再按 V 或按 T 打字');
        }
    }

    function hasWebSpeech() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    function hasGatewayStt() {
        return !!(session.buddyConfig && session.buddyConfig.sttUrl);
    }

    function finishListen(heard, o, lock, inQuiz, target) {
        paintHeard(heard);
        const hit = !!(SP && SP.matchHeard && SP.matchHeard(target, heard).ok);
        if (o.buddy) {
            setVoiceState(hit ? 'matched' : 'not-matched');
            handleBuddyHeard(heard, lock);
            return;
        }
        if (hit) {
            if (inQuiz) {
                noteWordSpoken(session.quiz.word);
                resolveQuiz(true, { record: true, crit: true, comboKeep: true, channel: 'speak' });
                setVoiceState('matched');
            } else {
                applySpeakHit(lock, heard || target);
            }
            return;
        }
        setVoiceState('not-matched');
        if (lock && lock.mob) lock.mob.voiceFails = (Number(lock.mob.voiceFails) || 0) + 1;
        if (lock && W.shouldAsk({ voiceFails: lock.mob && lock.mob.voiceFails })) {
            showVoiceFallback(lock, { reason: 'not-matched' });
            return;
        }
        toast('没听清，再按 V');
    }

    function listenViaGateway(opts) {
        const o = opts || {};
        const lock = o.lock || (session.voice && session.voice.lock);
        const inQuiz = !!(session.quiz && session.pending);
        const target = (lock && lock.word && lock.word.text)
            || (session.quiz && session.quiz.word && session.quiz.word.text)
            || '';
        const url = session.buddyConfig && session.buddyConfig.sttUrl;
        if (!url || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setVoiceState('unsupported');
            if (o.buddy) showBuddyType(true);
            else if (lock) showVoiceFallback(lock, { reason: 'unsupported' });
            return;
        }
        setVoiceState('listening');
        paintHeard('…');
        toast(o.buddy ? '跟陪玩说英语' : ('说：' + target));
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            const rec = new MediaRecorder(stream);
            const chunks = [];
            rec.ondataavailable = function (ev) {
                if (ev.data && ev.data.size) chunks.push(ev.data);
            };
            rec.onstop = function () {
                stream.getTracks().forEach(function (t) { t.stop(); });
                const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
                fetch(url, {
                    method: 'POST',
                    headers: { 'x-prompt': String(target || '').slice(0, 80) },
                    body: blob
                }).then(function (res) {
                    if (!res.ok) throw new Error('stt');
                    return res.json();
                }).then(function (json) {
                    finishListen(String((json && json.text) || '').trim(), o, lock, inQuiz, target);
                }).catch(function () {
                    setVoiceState('unsupported');
                    if (o.buddy) showBuddyType(true);
                    else if (lock) showVoiceFallback(lock, { reason: 'unsupported' });
                    else toast('没听清，按 T 打字');
                });
            };
            rec.start();
            setTimeout(function () {
                try { rec.stop(); } catch (e) { /* ignore */ }
            }, 2500);
        }).catch(function () {
            session.voice.blocked = true;
            setVoiceState('mic-blocked');
            if (o.buddy) showBuddyType(true);
            else if (lock) showVoiceFallback(lock, { reason: 'unsupported' });
            toast('没有麦克风权限，点中文或按 T');
        });
    }

    function listenOnce(opts) {
        const o = opts || {};
        const lock = o.lock || (session.voice && session.voice.lock);
        const inQuiz = !!(session.quiz && session.pending);
        const target = (lock && lock.word && lock.word.text)
            || (session.quiz && session.quiz.word && session.quiz.word.text)
            || '';
        if (!target && !o.buddy) return;
        if (session.voice && session.voice.rec) stopVoiceRec();
        if (hasGatewayStt()) {
            listenViaGateway(o);
            return;
        }
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) {
            setVoiceState('unsupported');
            if (o.buddy) showBuddyType(true);
            else if (lock) showVoiceFallback(lock, { reason: 'unsupported' });
            return;
        }
        const rec = new Rec();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 3;
        session.voice.rec = rec;
        setVoiceState('listening');
        let done = false;
        rec.onresult = function (ev) {
            if (done) return;
            const alts = [];
            const row = ev.results && ev.results[0];
            if (row) {
                for (let i = 0; i < row.length; i += 1) alts.push(row[i].transcript);
            }
            done = true;
            session.voice.rec = null;
            const heard = alts[0] || '';
            const hit = alts.some(function (line) { return SP.matchHeard(target, line).ok; });
            finishListen(hit ? (alts.filter(function (line) { return SP.matchHeard(target, line).ok; })[0] || heard) : heard, o, lock, inQuiz, target);
        };
        rec.onerror = function (ev) {
            if (done) return;
            done = true;
            session.voice.rec = null;
            const err = ev && ev.error;
            if (err === 'not-allowed') {
                session.voice.blocked = true;
                setVoiceState('mic-blocked');
                if (lock) showVoiceFallback(lock, { reason: 'unsupported' });
                toast('没有麦克风权限，点中文或按 T');
                return;
            }
            if (err === 'no-speech') {
                setVoiceState('timeout');
                toast('没有听清');
                return;
            }
            if (hasGatewayStt() && err !== 'aborted') {
                listenViaGateway(o);
                return;
            }
            setVoiceState('not-matched');
            toast('没听清，再按 V 或按 T 打字');
        };
        rec.onend = function () {
            if (session.voice) session.voice.rec = null;
            if (session.voice && session.voice.state === 'listening') setVoiceState('idle');
        };
        try {
            rec.start();
            paintHeard('…');
            toast(o.buddy ? '跟陪玩说英语' : ('说：' + target));
        } catch (e) {
            session.voice.rec = null;
            setVoiceState('unsupported');
            if (lock) showVoiceFallback(lock, { reason: 'unsupported' });
        }
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
            if (viewModel.setToolTiers) {
                viewModel.setToolTiers({
                    sword: toolTierOf('sword'),
                    axe: toolTierOf('axe'),
                    pickaxe: toolTierOf('pickaxe'),
                    shovel: toolTierOf('shovel')
                });
            } else if (viewModel.setBladeKind) {
                viewModel.setBladeKind(toolTierOf('sword'));
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
            m.aggro = C.tickAggro ? C.tickAggro(!!m.aggro, dist) : dist <= 8;
            if (m.parked && !m.aggro) {
                const groundPark = engine.world.surfaceAt(Math.floor(m.x), Math.floor(m.z));
                m.y = flyer ? groundPark + (m.isBoss ? 1.6 : m.kind === 'ghast' ? 2.3 : 1.35) : groundPark;
                if (m.mesh) m.mesh.position.set(m.x, m.y, m.z);
                if (m.hurtFlash) m.hurtFlash = Math.max(0, m.hurtFlash - dt);
                if (m.model) {
                    m.model.update(dt, false, tSec);
                    m.model.faceHpBarTo(engine.camera);
                }
                return;
            }
            if (m.parked && m.aggro) m.parked = false;
            if (!m.aggro) {
                const groundIdle = engine.world.surfaceAt(Math.floor(m.x), Math.floor(m.z));
                m.y = flyer ? groundIdle + (m.isBoss ? 1.6 : m.kind === 'ghast' ? 2.3 : 1.35) : groundIdle;
                if (m.mesh) m.mesh.position.set(m.x, m.y, m.z);
                if (m.hurtFlash) m.hurtFlash = Math.max(0, m.hurtFlash - dt);
                if (m.model) {
                    m.model.update(dt, false, tSec);
                    m.model.faceHpBarTo(engine.camera);
                }
                return;
            }
            const stopAt = C.behaviorStopRange
                ? C.behaviorStopRange(m.behavior || 'chase', C.CONTACT_RANGE)
                : C.CONTACT_RANGE;
            if (dist > stopAt) {
                moving = true;
                const surface = engine.world.surfaceAt(Math.floor(engine.player.x), Math.floor(engine.player.z));
                const inCave = engine.player.y < surface - 2.2;
                const slow = C.torchSlow
                    ? C.torchSlow({ hasTorch: (session.bag.torch || 0) > 0, inCave: inCave })
                    : 1;
                const step = Math.max(1.05, m.speed) * dt * slow;
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
                        if (sfx && sfx.hurt) sfx.hurt();
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
            if (m.hurtFlash) m.hurtFlash = Math.max(0, m.hurtFlash - dt);
            if (m.model) {
                m.model.update(dt, moving, tSec, m.hurtFlash > 0);
                if (m.hp < m.maxHp) m.model.setHp(m.hp / m.maxHp, true);
                m.model.faceHpBarTo(engine.camera);
            }
        });
    }

    function moveBolts(dt) {
        const keep = [];
        session.bolts.forEach(function (b) {
            b.life -= dt;
            const target = (b.home && b.home.hp > 0)
                ? b.home
                : C.nearestMonster(b, session.monsters);
            const steered = C.steerBolt(b, target, dt);
            b.x = steered.x; b.z = steered.z; b.vx = steered.vx; b.vz = steered.vz;
            if (b.mesh) {
                b.mesh.position.set(b.x, b.y, b.z);
                b.mesh.rotation.y = Math.atan2(b.vx, b.vz);
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
                if (!b.cosmetic) requestHit(hit, 'bolt');
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
                if (item.coins) {
                    session.coins = C.pickupCoins(session.coins, item.coins);
                    if (sfx && sfx.coin) sfx.coin();
                }
                session.bag = C.addLoot(session.bag, item.loot, 1);
                engine.scene.remove(item.mesh);
                MOBS.spawnBurst(engine.scene, session.fx, item.x, item.y, item.z, 0xffd24a, 5);
                persist();
                toast(item.coins ? ('金币 +' + item.coins) : ('获得 ' + item.loot));
                if (sfx && sfx.pickup) sfx.pickup();
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

    function toolTierOf(tool) {
        const bag = session.bag || {};
        function n(id) { return Number(bag[id]) || 0; }
        if (tool === 'sword') {
            if (n('diamond_sword') > 0) return 'diamond';
            if (n('iron_sword') > 0) return 'iron';
            if (n('gold_sword') > 0) return 'gold';
        }
        if (tool === 'axe') {
            if (n('diamond_axe') > 0) return 'diamond';
            if (n('iron_axe') > 0) return 'iron';
            if (n('gold_axe') > 0) return 'gold';
        }
        if (tool === 'pickaxe') {
            if (n('diamond_pick') > 0 || n('diamond_pickaxe') > 0) return 'diamond';
            if (n('iron_pick') > 0) return 'iron';
            if (n('gold_pick') > 0) return 'gold';
        }
        if (tool === 'shovel') {
            if (n('diamond_shovel') > 0) return 'diamond';
            if (n('iron_shovel') > 0) return 'iron';
            if (n('gold_shovel') > 0) return 'gold';
        }
        return 'wood';
    }

    function updateMerchantTip() {
        let near = false;
        if (session.merchant) {
            const d = Math.hypot(engine.player.x - session.merchant.x, engine.player.z - session.merchant.z);
            near = d < 2.2;
        }
        (engine.world.villagers || []).forEach(function (v) {
            if (v.role !== 'trader') return;
            if (Math.hypot(engine.player.x - v.x, engine.player.z - v.z) < 2.2) near = true;
        });
        session.nearMerchant = near;
        const tip = document.getElementById('trade-tip');
        if (tip) {
            tip.textContent = 'Press F to talk to Merchant Leo (商人雷奥)';
            tip.classList.toggle('is-hidden', !session.nearMerchant || session.paused);
        }
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
                row.className = 'bl-shop-row bl-shop-card';
                row.innerHTML = '<b>' + it.en + '</b><em>' + it.zh + ' · $' + it.cost + (worn ? ' (on)' : '') + '</em><span class="bl-shop-buy">购买 Buy</span>';
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
        if (sfx && sfx.buy) sfx.buy();
        if (res.heal && engine) {
            engine.player.hp = Math.min(engine.player.hpMax, engine.player.hp + res.heal);
            if (sfx && sfx.eat) sfx.eat();
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
        const phase = document.getElementById('boss-phase');
        if (phase && L.bossPhase) phase.textContent = L.bossPhase(session.boss);
        const nameEl = document.getElementById('boss-name');
        if (nameEl) nameEl.textContent = (L.bossTitle && L.bossTitle(session.boss.id)) || '字母石像';
    }

    function readMastery() {
        try {
            const st = bridge && typeof bridge.readState === 'function' ? bridge.readState() : null;
            return (st && st.courseProgress && st.courseProgress.minecraft && st.courseProgress.minecraft.mastery) || {};
        } catch (e) {
            return {};
        }
    }

    function recallWordCount() {
        const mastery = readMastery();
        let n = 0;
        Object.keys(mastery).forEach(function (id) {
            const stage = W.masteryStage ? W.masteryStage(mastery[id]) : '';
            if (stage === 'recall' || stage === 'spoken' || stage === 'mastered' || stage === 'due') n += 1;
        });
        return n;
    }

    function syncHud() {
        const coin = document.getElementById('coin-label');
        if (coin) coin.textContent = String(session.coins);
        const lv = document.getElementById('level-label');
        if (lv) lv.textContent = String(session.level);
        paintHearts();
        paintFood();
        paintBagCounts();
        paintQuest();
        const learned = document.getElementById('stat-learned');
        const total = document.getElementById('stat-total');
        const bankEl = document.getElementById('stat-bank');
        const unread = document.getElementById('stat-unread');
        const right = document.getElementById('stat-right');
        const wrong = document.getElementById('stat-wrong');
        const mastery = readMastery();
        const inPool = progress.learnedIds.filter(function (id) {
            return pool.some(function (w) { return w.id === id; });
        });
        const known = W.countFamiliar ? W.countFamiliar(inPool, mastery) : inPool.length;
        if (learned) learned.textContent = String(known);
        if (total) total.textContent = String(pool.length || 0);
        if (bankEl) bankEl.textContent = String(bank.length || pool.length || 0);
        if (unread) {
            unread.textContent = String(W.unreadSpeakCount
                ? W.unreadSpeakCount(progress.shownWordIds, progress.spokenWordIds)
                : Math.max(0, (pool.length || 0) - known));
        }
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
        const xpFillSide = document.getElementById('xp-fill-side');
        const xpNumSide = document.getElementById('xp-num-side');
        if (xpFillSide) xpFillSide.style.width = Math.round(known / poolN * 100) + '%';
        if (xpNumSide) xpNumSide.textContent = known + '/' + (pool.length || 0);
        const mpFill = document.getElementById('mp-fill');
        const mpNum = document.getElementById('mp-num');
        if (mpFill) mpFill.style.width = Math.min(100, session.combo * 25) + '%';
        if (mpNum) mpNum.textContent = 'combo ' + session.combo;
        const mpFillSide = document.getElementById('mp-fill-side');
        const mpNumSide = document.getElementById('mp-num-side');
        if (mpFillSide) mpFillSide.style.width = Math.min(100, session.combo * 25) + '%';
        if (mpNumSide) mpNumSide.textContent = 'combo ' + session.combo;
        paintSayStrip();
        const hpFill = document.getElementById('hp-fill');
        const hpNum = document.getElementById('hp-num');
        if (engine && engine.player) {
            const hp = Math.max(0, engine.player.hp);
            const hpMax = Math.max(1, engine.player.hpMax);
            if (hpFill) hpFill.style.width = Math.round(hp / hpMax * 100) + '%';
            if (hpNum) hpNum.textContent = Math.ceil(hp) + '/' + Math.ceil(hpMax);
        }
        const chapter = document.getElementById('chapter-label');
        if (chapter) chapter.textContent = CHAPTERS[session.level] || CHAPTERS[1];
        const coord = document.getElementById('coord-label');
        if (coord && engine && engine.player) {
            coord.textContent = '坐标 ' + Math.floor(engine.player.x) + ', ' + Math.floor(engine.player.z);
        }
        const bagEl = document.getElementById('bag-count');
        if (bagEl) {
            let n = 0;
            Object.keys(session.bag || {}).forEach(function (k) { n += Number(session.bag[k]) || 0; });
            bagEl.textContent = '背包 ' + n;
        }
        const low = document.getElementById('low-hp-tip');
        if (low && engine && engine.player) {
            low.classList.toggle('is-hidden', engine.player.hp > 3);
        }
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
        if (sfx && sfx.death) sfx.death();
        toast('You fainted · 回出生点，连击清零');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
}());
