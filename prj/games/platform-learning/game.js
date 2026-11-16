(function (global) {
    'use strict';

    const Core = global.PlatformLearningCore;
    const Cards = global.PlatformLearningCards;
    const bridge = global.WorkbenchGameBridge;
    const PreschoolSpeech = global.PreschoolSpeech || global.PersonalWorkbenchPreschoolSpeech;
    if (!Core || !Cards || typeof document === 'undefined') return;

    const GAME_ID = 'platform-learning';
    const canvas = document.getElementById('battle-canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;
    let savedProgress = {};
    if (bridge && typeof bridge.getProgress === 'function') {
        try {
            const saved = bridge.getProgress(GAME_ID);
            savedProgress = saved && saved.progress && typeof saved.progress === 'object' ? saved.progress : {};
        } catch (error) {
            if (global.console && typeof global.console.warn === 'function') global.console.warn('[platform-learning] progress restore failed', error);
        }
    }
    const restoredCards = Math.max(0, Math.min(Cards.cards.length, Math.floor(Number(savedProgress.cardsCompleted) || 0)));
    const restoredSettled = savedProgress.settled === true && restoredCards >= Cards.cards.length;
    const session = Core.createSession({ cardsRequired: Cards.cards.length, initialCardsCompleted: restoredCards, initialSettled: restoredSettled });
    const meter = Core.createCheckpointMeter();
    for (let index = 0; index < restoredCards; index += 1) meter.record('checkpoint-' + (index + 1));
    const reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ui = {
        progress: document.getElementById('learning-progress'), count: document.getElementById('learning-count'),
        start: document.getElementById('start-button'), flag: document.getElementById('flag-button'), tip: document.getElementById('stage-tip'),
        timer: document.getElementById('timer-label'), flagLabel: document.getElementById('flag-label'), back: document.getElementById('back-link'),
        layer: document.getElementById('learning-card-layer'), track: document.getElementById('card-track-label'), symbol: document.getElementById('card-symbol'),
        prompt: document.getElementById('card-prompt'), grid: document.getElementById('answer-grid'), feedback: document.getElementById('card-feedback'),
        correction: document.getElementById('correction-button'), speak: document.getElementById('speak-button'), sound: document.getElementById('sound-button')
    };
    const world = { started: restoredCards > 0, sound: true, currentCard: null, last: 0, elapsed: 0, keys: {}, player: { x: 55, y: 450, vy: 0, grounded: true }, enemies: [{ x: 380, y: 478 }, { x: 760, y: 478 }, { x: 1060, y: 478 }], checkpoints: [170, 280, 390, 500, 610, 720, 830, 940, 1050, 1150], flagX: 1215 };
    let cardTimer = 0;

    function say(text, speech) {
        if (!world.sound || !text) return;
        const fallback = function () {
            if (!global.speechSynthesis || typeof global.SpeechSynthesisUtterance === 'undefined') return;
            global.speechSynthesis.cancel();
            const utterance = new global.SpeechSynthesisUtterance(text);
            utterance.lang = speech && speech.lang || 'zh-CN'; utterance.rate = speech && speech.rate || .82;
            global.speechSynthesis.speak(utterance);
        };
        if (PreschoolSpeech && typeof PreschoolSpeech.speak === 'function') {
            try { Promise.resolve(PreschoolSpeech.speak(Object.assign({ text: text }, speech || {}))).then(function (result) { if (result && result.ok === false) fallback(); }).catch(fallback); } catch (error) { fallback(); }
        } else fallback();
    }

    function updateHud() {
        const snap = session.snapshot();
        ui.progress.style.width = (snap.cardsCompleted / snap.cardsRequired * 100) + '%'; ui.count.textContent = snap.cardsCompleted + '/' + snap.cardsRequired;
        ui.start.classList.toggle('is-hidden', world.started); ui.flag.classList.toggle('is-hidden', snap.phase !== 'flag-ready' && snap.phase !== 'final-flag');
        ui.flagLabel.textContent = snap.flagUnlocked ? '终点旗已解锁' : '完成 10 张后触碰终点旗'; ui.timer.textContent = '时间 ' + Math.floor(world.elapsed) + 's';
    }
    function tip(message) { ui.tip.textContent = message; }
    function bridgeAnswer(card, correct) {
        try {
            if (!bridge) return false;
            if (card.track === 'word' && typeof bridge.recordWordAnswer === 'function') bridge.recordWordAnswer(card.key, correct, { source: GAME_ID });
            else if (typeof bridge.recordSubjectAnswer === 'function') bridge.recordSubjectAnswer('literacy', card.key, correct, { activityType: GAME_ID });
            else return false;
            return true;
        } catch (error) {
            if (global.console && typeof global.console.warn === 'function') global.console.warn('[platform-learning] answer bridge failed', error);
            return false;
        }
    }
    function bridgeUnknown(card) {
        try {
            return Boolean(bridge && typeof bridge.recordLearningOutcome === 'function'
                && bridge.recordLearningOutcome({ key: card.key, track: card.track }, 'unknown', { source: GAME_ID, cardId: card.id, activityType: 'learning-card-skip' }));
        } catch (error) {
            return false;
        }
    }
    function persistProgress(won) {
        if (!bridge || typeof bridge.getProgress !== 'function' || typeof bridge.saveProgress !== 'function') return;
        try {
            const result = bridge.getProgress(GAME_ID); const progress = result && result.progress && typeof result.progress === 'object' ? result.progress : {};
            const snap = session.snapshot(); progress.cardsCompleted = snap.cardsCompleted; progress.cardsRequired = snap.cardsRequired;
            if (won) { progress.settled = true; if (!Array.isArray(progress.clearedLevels)) progress.clearedLevels = []; if (progress.clearedLevels.indexOf('final-flag') < 0) progress.clearedLevels.push('final-flag'); }
            bridge.saveProgress(GAME_ID, progress);
        } catch (error) {
            if (global.console && typeof global.console.warn === 'function') global.console.warn('[platform-learning] progress save failed', error);
        }
    }
    function configureBridge() { if (!bridge) return; if (typeof bridge.backHref === 'function') ui.back.href = bridge.backHref('platform-quest'); if (typeof bridge.recordPlaySession === 'function') bridge.recordPlaySession(GAME_ID, { source: 'learning' }); }

    function renderCard(card) {
        ui.track.textContent = card.track === 'word' ? '英语单词卡' : '汉字识读卡'; ui.symbol.textContent = card.display; ui.prompt.textContent = card.prompt; ui.feedback.textContent = ''; ui.correction.classList.add('is-hidden'); ui.grid.innerHTML = '';
        card.options.forEach(function (option) { const button = document.createElement('button'); button.type = 'button'; button.className = 'answer-option'; button.dataset.answer = option.id; const image = document.createElement('img'); image.src = option.image; image.alt = option.label; const label = document.createElement('span'); label.textContent = option.label; button.append(image, label); button.addEventListener('click', function () { answerCard(option.id); }); ui.grid.appendChild(button); });
        const unknown = document.createElement('button'); unknown.type = 'button'; unknown.className = 'answer-option learning-answer-option--unknown'; unknown.dataset.answer = '__learning_unknown__'; unknown.innerHTML = '<strong>?</strong><span>不会 / 跳过</span><small>先看答案，不算答错</small>'; unknown.addEventListener('click', function () { answerCard('__learning_unknown__'); }); ui.grid.appendChild(unknown);
    }
    function markAnswers(chosen, correct) { Array.prototype.forEach.call(ui.grid.querySelectorAll('.answer-option'), function (button) { button.disabled = true; if (button.dataset.answer === correct) button.classList.add('is-correct'); if (button.dataset.answer === chosen && chosen !== correct) button.classList.add('is-wrong'); }); }
    function openCard(checkpointId) {
        if (!session.canSimulate() || session.snapshot().cardsCompleted >= Cards.cards.length || !meter.record(checkpointId)) return;
        const card = Cards.cards[session.snapshot().cardsCompleted]; world.currentCard = card; session.requestCard(card, checkpointId); renderCard(card); ui.layer.classList.remove('is-hidden'); tip('学习卡出现，跑步、敌人和计时暂停。');
        clearTimeout(cardTimer); cardTimer = global.setTimeout(function () { if (session.snapshot().phase === 'card-falling') { session.landCard(); say(card.speech.text, card.speech); } }, reducedMotion ? 0 : 240);
    }
    function finishCard() {
        clearTimeout(cardTimer); cardTimer = global.setTimeout(function () {
            try {
                session.finishReward();
                persistProgress(false);
                ui.layer.classList.add('is-hidden'); world.currentCard = null; updateHud();
                if (session.snapshot().phase === 'resume-countdown') { tip('准备继续跑！'); global.setTimeout(function () { try { if (session.snapshot().phase === 'resume-countdown') session.finishResume(); } catch (error) { if (global.console && typeof global.console.warn === 'function') global.console.warn('[platform-learning] resume failed', error); } }, reducedMotion ? 0 : 420); } else tip('10/10！最终旗已解锁。');
            } catch (error) {
                if (global.console && typeof global.console.warn === 'function') global.console.warn('[platform-learning] card reward failed', error);
                ui.layer.classList.add('is-hidden'); world.currentCard = null; updateHud();
            }
        }, reducedMotion ? 0 : 300);
    }
    function answerCard(answerId) {
        if (session.snapshot().phase !== 'learning' || !world.currentCard) return; const card = world.currentCard;
        if (answerId === '__learning_unknown__') {
            const skipped = session.skipCard(); bridgeUnknown(card); markAnswers('', card.answer); ui.feedback.textContent = '已跳过，先看答案；这题不算答错，已加入复习单。'; if (skipped.completed) finishCard(); return;
        }
        const result = session.answer(answerId); bridgeAnswer(card, answerId === card.answer); markAnswers(answerId, card.answer);
        if (result.needsCorrection) { ui.feedback.textContent = '没关系，正确答案亮起来了。点击下方再记一次。'; ui.correction.classList.remove('is-hidden'); say(card.speech.text, card.speech); } else { ui.feedback.textContent = '答对啦！继续向前！'; finishCard(); }
    }
    function completeCorrection() { if (session.snapshot().phase !== 'correction' || !world.currentCard) return; bridgeAnswer(world.currentCard, true); session.completeCorrection(); ui.correction.classList.add('is-hidden'); ui.feedback.textContent = '记住啦！'; finishCard(); }
    function jump() { if (world.started && session.canSimulate() && world.player.grounded) { world.player.vy = -390; world.player.grounded = false; } }
    function start() { if (world.started) return; session.startRun(); world.started = true; configureBridge(); tip('出发！经过彩色检查点就会触发学习卡。'); updateHud(); }
    function startFinal() { const snap = session.snapshot(); if (world.player.x < world.flagX - 70) { tip('再向右跑一会儿，到达最终旗再触碰。'); return; } if (snap.phase === 'flag-ready') { session.startFinalFlag(); tip('冲过最终旗！'); updateHud(); } else if (snap.phase === 'final-flag') { session.settle(true); persistProgress(true); tip('闯关胜利！10 张学习卡全部完成。'); updateHud(); } }

    function update(dt) {
        if (!session.canSimulate()) return;
        world.elapsed += dt; const direction = (world.keys.ArrowRight || world.keys.KeyD ? 1 : 0) - (world.keys.ArrowLeft || world.keys.KeyA ? 1 : 0); const boost = world.keys.ShiftLeft || world.keys.ShiftRight || world.keys.run ? 1.65 : 1;
        world.player.x = Math.max(30, Math.min(canvas.width - 35, world.player.x + direction * 220 * boost * dt)); world.player.vy += 950 * dt; world.player.y += world.player.vy * dt;
        if (world.player.y >= 450) { world.player.y = 450; world.player.vy = 0; world.player.grounded = true; }
        world.enemies.forEach(function (enemy) {
            if (Math.abs(world.player.x + 16 - enemy.x) > 30) return;
            if (world.player.y < 420 && world.player.vy > 0) { enemy.x = -100; world.player.vy = -220; tip('踩到小怪啦！继续冲刺。'); }
            else if (world.player.y >= 430) { world.player.x = Math.max(30, world.player.x - 70); tip('躲开小怪，跳起来更安全。'); }
        });
        world.checkpoints.forEach(function (x, index) { if (world.player.x >= x && meter.snapshot().count === index) openCard('checkpoint-' + (index + 1)); });
        if (world.player.x >= world.flagX && session.snapshot().flagUnlocked) ui.flag.classList.remove('is-hidden');
        updateHud();
    }
    function draw() {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height); gradient.addColorStop(0, '#55c9ee'); gradient.addColorStop(.66, '#d7f4e9'); gradient.addColorStop(.67, '#77c856'); gradient.addColorStop(1, '#3e9956'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,244,160,.85)'; ctx.beginPath(); ctx.arc(1040, 92, 48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a9e58'; ctx.fillRect(0, 500, canvas.width, 120); ctx.fillStyle = '#9bd66a'; ctx.fillRect(0, 500, canvas.width, 12);
        world.checkpoints.forEach(function (x, index) { ctx.fillStyle = '#8c5a3d'; ctx.fillRect(x, 410, 7, 90); ctx.fillStyle = index < meter.snapshot().count ? '#66d89d' : '#ffd45a'; ctx.beginPath(); ctx.arc(x + 12, 420, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#245064'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(String(index + 1), x + 8, 425); });
        world.enemies.forEach(function (enemy) { ctx.fillStyle = '#70b75f'; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 22, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#18394a'; ctx.fillRect(enemy.x - 10, enemy.y - 4, 5, 5); ctx.fillRect(enemy.x + 7, enemy.y - 4, 5, 5); });
        ctx.fillStyle = '#7b4b39'; ctx.fillRect(world.player.x, world.player.y, 32, 50); ctx.fillStyle = '#f3c28f'; ctx.beginPath(); ctx.arc(world.player.x + 16, world.player.y - 10, 17, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2e5970'; ctx.fillRect(world.player.x + 5, world.player.y - 27, 22, 8);
        ctx.fillStyle = '#8c5a3d'; ctx.fillRect(world.flagX, 360, 8, 140); ctx.fillStyle = session.snapshot().flagUnlocked ? '#ff6e7d' : '#b4bdc0'; ctx.beginPath(); ctx.moveTo(world.flagX + 8, 365); ctx.lineTo(world.flagX + 70, 385); ctx.lineTo(world.flagX + 8, 405); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.fillText(session.snapshot().flagUnlocked ? '10/10' : '学习中', world.flagX - 20, 345);
    }
    function frame(now) { const dt = Math.min(.04, Math.max(0, (now - world.last) / 1000 || 0)); world.last = now; update(dt); draw(); if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(frame); }

    ui.start.addEventListener('click', start); ui.flag.addEventListener('click', startFinal); ui.correction.addEventListener('click', completeCorrection); ui.speak.addEventListener('click', function () { if (world.currentCard) say(world.currentCard.speech.text, world.currentCard.speech); }); ui.sound.addEventListener('click', function () { world.sound = !world.sound; ui.sound.textContent = world.sound ? '🔊' : '🔇'; });
    function controlKey(action) { if (action === 'left') return 'ArrowLeft'; if (action === 'right') return 'ArrowRight'; if (action === 'run') return 'run'; return null; }
    function releaseControl(action) { const key = controlKey(action); if (key) world.keys[key] = false; }
    function releaseAllControls() { releaseControl('left'); releaseControl('right'); releaseControl('run'); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-control]'), function (button) {
        const action = button.dataset.control;
        const release = function () { releaseControl(action); };
        button.addEventListener('pointerdown', function (event) { event.preventDefault(); if (typeof button.setPointerCapture === 'function' && event.pointerId != null) { try { button.setPointerCapture(event.pointerId); } catch (error) {} } const key = controlKey(action); if (key) world.keys[key] = true; if (action === 'jump') jump(); });
        button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    });
    document.addEventListener('pointerup', releaseAllControls); document.addEventListener('pointercancel', releaseAllControls); if (global.addEventListener) { global.addEventListener('pointerup', releaseAllControls); global.addEventListener('pointercancel', releaseAllControls); global.addEventListener('blur', releaseAllControls); }
    document.addEventListener('keydown', function (event) { world.keys[event.code] = true; if (event.code === 'Space' || event.code === 'ArrowUp') { event.preventDefault(); jump(); } }); document.addEventListener('keyup', function (event) { world.keys[event.code] = false; });
    global.addEventListener && global.addEventListener('beforeunload', function () { if (world.started && bridge && typeof bridge.recordPlaySession === 'function') bridge.recordPlaySession(GAME_ID, { source: 'learning' }); });
    if (world.started) configureBridge(); updateHud(); draw(); if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(frame);
}(typeof window !== 'undefined' ? window : globalThis));
