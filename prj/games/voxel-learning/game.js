(function (global) {
    'use strict';

    const Core = global.VoxelLearningCore;
    const Cards = global.VoxelLearningCards;
    const PreschoolSpeech = global.PreschoolSpeech || global.PersonalWorkbenchPreschoolSpeech;
    const bridge = global.WorkbenchGameBridge;
    if (!Core || !Cards || typeof document === 'undefined') return;

    const GAME_ID = 'voxel-learning';
    const canvas = document.getElementById('battle-canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    const session = Core.createSession({ cardsRequired: Cards.cards.length });
    const meter = Core.createActionMeter({ actionsPerCard: 2 });
    const reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ui = {
        progress: document.getElementById('learning-progress'), count: document.getElementById('learning-count'),
        tip: document.getElementById('stage-tip'), start: document.getElementById('start-button'), portal: document.getElementById('portal-button'),
        inventory: document.getElementById('inventory-label'), portalLabel: document.getElementById('portal-label'), back: document.getElementById('back-link'),
        layer: document.getElementById('learning-card-layer'), track: document.getElementById('card-track-label'), symbol: document.getElementById('card-symbol'),
        prompt: document.getElementById('card-prompt'), grid: document.getElementById('answer-grid'), feedback: document.getElementById('card-feedback'),
        correction: document.getElementById('correction-button'), speak: document.getElementById('speak-button'), sound: document.getElementById('sound-button')
    };
    const world = { blocks: [], player: { x: 350, y: 395, vy: 0, onGround: true, facing: 1 }, inventory: 3, portalOpen: false, started: false, currentCard: null, sound: true, lastTime: 0 };
    const blockSize = 56;
    const groundY = 470;
    const images = {};
    let cardTimer = 0;

    function say(text, speech) {
        if (!world.sound || !text) return;
        const fallback = function () {
            if (!global.speechSynthesis || typeof global.SpeechSynthesisUtterance === 'undefined') return;
            global.speechSynthesis.cancel();
            const utterance = new global.SpeechSynthesisUtterance(text);
            utterance.lang = speech && speech.lang || 'zh-CN';
            utterance.rate = speech && speech.rate || 0.82;
            global.speechSynthesis.speak(utterance);
        };
        if (PreschoolSpeech && typeof PreschoolSpeech.speak === 'function') {
            try {
                Promise.resolve(PreschoolSpeech.speak(Object.assign({ text }, speech || {})))
                    .then(function (result) { if (result && result.ok === false) fallback(); })
                    .catch(fallback);
            } catch (error) { fallback(); }
        } else fallback();
    }

    function loadImage(key, source) {
        if (typeof global.Image === 'undefined') return;
        const image = new global.Image();
        image.src = source;
        images[key] = image;
    }

    function resetWorld() {
        world.blocks = [];
        for (let x = 0; x < canvas.width + blockSize; x += blockSize) world.blocks.push({ x, y: groundY, type: 'grass' });
        [4, 5, 8, 9, 13, 16].forEach(function (column, index) { world.blocks.push({ x: column * blockSize, y: groundY - blockSize * (index % 2 ? 2 : 1), type: 'stone' }); });
        world.player = { x: 350, y: groundY - 66, vy: 0, onGround: true, facing: 1 };
        world.inventory = 3;
        world.portalOpen = false;
    }

    function updateHud() {
        const snapshot = session.snapshot();
        const ratio = snapshot.cardsRequired ? snapshot.cardsCompleted / snapshot.cardsRequired : 0;
        ui.progress.style.width = `${ratio * 100}%`;
        ui.count.textContent = `${snapshot.cardsCompleted}/${snapshot.cardsRequired}`;
        ui.inventory.textContent = `方块 × ${world.inventory}`;
        ui.portalLabel.textContent = snapshot.finalPortalUnlocked ? '传送门已准备好' : `学习 ${snapshot.cardsRequired} 张后开启传送门`;
        ui.start.classList.toggle('is-hidden', world.started);
        ui.portal.classList.toggle('is-hidden', snapshot.phase !== 'final-ready' && snapshot.phase !== 'final-portal');
        ui.portal.textContent = snapshot.phase === 'final-portal' ? '完成探险' : '进入最终传送门';
    }

    function setTip(message) { ui.tip.textContent = message; }

    function bridgeAnswer(card, correct) {
        if (!bridge) return;
        if (card.track === 'word' && typeof bridge.recordWordAnswer === 'function') {
            bridge.recordWordAnswer(card.key, correct, { source: GAME_ID });
        } else if (typeof bridge.recordSubjectAnswer === 'function') {
            bridge.recordSubjectAnswer('literacy', card.key, correct, { activityType: GAME_ID });
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

    function persistProgress(settled) {
        if (!bridge || typeof bridge.getProgress !== 'function' || typeof bridge.saveProgress !== 'function') return;
        const result = bridge.getProgress(GAME_ID);
        const progress = result && result.progress && typeof result.progress === 'object' ? result.progress : {};
        const snapshot = session.snapshot();
        progress.cardsCompleted = snapshot.cardsCompleted;
        progress.cardsRequired = snapshot.cardsRequired;
        if (settled) {
            progress.settled = true;
            if (!Array.isArray(progress.clearedStages)) progress.clearedStages = [];
            if (progress.clearedStages.indexOf('final-portal') === -1) progress.clearedStages.push('final-portal');
        }
        bridge.saveProgress(GAME_ID, progress);
    }

    function configureBridge() {
        if (!bridge) return;
        if (typeof bridge.backHref === 'function') ui.back.href = bridge.backHref('voxel-adventure');
        if (typeof bridge.recordPlaySession === 'function') bridge.recordPlaySession(GAME_ID, { source: 'learning' });
    }

    function openCard() {
        const snapshot = session.snapshot();
        if (!session.canSimulate() || snapshot.cardsCompleted >= snapshot.cardsRequired) return;
        const card = Cards.cards[snapshot.cardsCompleted];
        world.currentCard = card;
        session.requestCard(card, world.lastAction || 'build');
        renderCard(card);
        ui.layer.classList.remove('is-hidden');
        clearTimeout(cardTimer);
        cardTimer = global.setTimeout(function () {
            if (session.snapshot().phase !== 'card-falling') return;
            session.landCard();
            say(card.speech && card.speech.text, card.speech);
        }, reducedMotion ? 0 : 260);
        setTip('学习卡已落地，方块世界暂停中。');
    }

    function renderCard(card) {
        ui.track.textContent = card.track === 'word' ? '英语单词卡' : '汉字识读卡';
        ui.symbol.textContent = card.display;
        ui.prompt.textContent = card.prompt;
        ui.feedback.textContent = '';
        ui.correction.classList.add('is-hidden');
        ui.grid.innerHTML = '';
        card.options.forEach(function (option) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'answer-option'; button.dataset.answer = option.id;
            const image = document.createElement('img'); image.src = option.image; image.alt = option.label;
            const label = document.createElement('span'); label.textContent = option.label;
            button.append(image, label); button.addEventListener('click', function () { answerCard(option.id); });
            ui.grid.appendChild(button);
        });
        const unknown = document.createElement('button');
        unknown.type = 'button'; unknown.className = 'answer-option learning-answer-option--unknown'; unknown.dataset.answer = '__learning_unknown__';
        unknown.innerHTML = '<strong>?</strong><span>不会 / 跳过</span><small>先看答案，不算答错</small>';
        unknown.addEventListener('click', function () { answerCard('__learning_unknown__'); });
        ui.grid.appendChild(unknown);
    }

    function markAnswers(chosen, correct) {
        Array.prototype.forEach.call(ui.grid.querySelectorAll('.answer-option'), function (button) {
            button.disabled = true;
            if (button.dataset.answer === correct) button.classList.add('is-correct');
            if (button.dataset.answer === chosen && chosen !== correct) button.classList.add('is-wrong');
        });
    }

    function finishCard() {
        clearTimeout(cardTimer);
        cardTimer = global.setTimeout(function () {
            session.finishReward();
            persistProgress(false);
            ui.layer.classList.add('is-hidden');
            world.currentCard = null;
            updateHud();
            const snapshot = session.snapshot();
            if (snapshot.phase === 'final-ready') {
                world.portalOpen = true;
                setTip('10/10！最终传送门已经打开，准备出发。');
            } else {
                setTip(`学习完成 ${snapshot.cardsCompleted}/10，继续采集或放置。`);
                global.setTimeout(function () {
                    if (session.snapshot().phase === 'resume-countdown') session.finishResume();
                    updateHud();
                }, reducedMotion ? 0 : 500);
            }
        }, reducedMotion ? 0 : 420);
    }

    function answerCard(answerId) {
        if (session.snapshot().phase !== 'learning' || !world.currentCard) return;
        const card = world.currentCard;
        if (answerId === '__learning_unknown__') {
            const skipped = session.skipCard();
            bridgeUnknown(card);
            markAnswers('', card.answer);
            ui.feedback.textContent = '已跳过，先看答案；这题不算答错，已加入复习单。';
            if (skipped.completed) finishCard();
            return;
        }
        const result = session.answer(answerId);
        bridgeAnswer(card, answerId === card.answer);
        markAnswers(answerId, card.answer);
        if (result.needsCorrection) {
            ui.feedback.textContent = '没关系，正确图片亮起来了。再选一次就会记住。';
            ui.correction.classList.remove('is-hidden');
            say(card.speech && card.speech.text, card.speech);
            return;
        }
        ui.feedback.textContent = '答对啦！方块能量 +1';
        finishCard();
    }

    function completeCorrection() {
        if (session.snapshot().phase !== 'correction' || !world.currentCard) return;
        bridgeAnswer(world.currentCard, true);
        session.completeCorrection();
        ui.correction.classList.add('is-hidden');
        ui.feedback.textContent = '记住啦！继续探险。';
        finishCard();
    }

    function successfulAction(kind) {
        if (!session.canSimulate()) return;
        world.lastAction = kind;
        if (meter.record(kind)) openCard();
        updateHud();
    }

    function blockAt(x, y) { return world.blocks.find(function (block) { return block.x === x && block.y === y; }); }

    function mine() {
        if (!world.started || !session.canSimulate()) return;
        const targetX = Math.floor((world.player.x + world.player.facing * 62) / blockSize) * blockSize;
        const target = world.blocks.find(function (block) { return block.x === targetX && Math.abs(block.y - (world.player.y + 22)) < 82 && block.y < groundY + 10; });
        if (!target || target.y === groundY) { setTip('靠近一块石头或草方块再挖掘。'); return; }
        world.blocks.splice(world.blocks.indexOf(target), 1); world.inventory += 1; setTip('挖到一个方块！'); successfulAction('mine');
    }

    function place() {
        if (!world.started || !session.canSimulate() || world.inventory < 1) return;
        const x = Math.floor((world.player.x + world.player.facing * 62) / blockSize) * blockSize;
        const y = groundY - blockSize;
        if (blockAt(x, y)) { setTip('这里已经有方块了。'); return; }
        world.blocks.push({ x, y, type: 'dirt' }); world.inventory -= 1; setTip('放置成功！'); successfulAction('place');
    }

    function move(direction) {
        if (!world.started || !session.canSimulate()) return;
        world.player.x = Math.max(30, Math.min(canvas.width - 80, world.player.x + direction * 25)); world.player.facing = direction || world.player.facing;
    }

    function jump() {
        if (!world.started || !session.canSimulate() || !world.player.onGround) return;
        world.player.vy = -360; world.player.onGround = false;
    }

    function update(dt) {
        if (!session.canSimulate()) return;
        world.player.vy += 820 * dt;
        world.player.y += world.player.vy * dt;
        if (world.player.y >= groundY - 66) { world.player.y = groundY - 66; world.player.vy = 0; world.player.onGround = true; }
    }

    function drawBlock(block) {
        const shade = block.type === 'grass' ? '#63b96c' : block.type === 'stone' ? '#7892a1' : '#a8744d';
        ctx.fillStyle = shade; ctx.fillRect(block.x, block.y, blockSize, blockSize);
        ctx.fillStyle = block.type === 'grass' ? '#a2e37a' : 'rgba(255,255,255,.13)'; ctx.fillRect(block.x, block.y, blockSize, 8);
        ctx.strokeStyle = 'rgba(8,30,45,.28)'; ctx.strokeRect(block.x + .5, block.y + .5, blockSize - 1, blockSize - 1);
    }

    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const sky = ctx.createLinearGradient(0, 0, 0, canvas.height); sky.addColorStop(0, '#6fc3ee'); sky.addColorStop(.65, '#c5eff0'); sky.addColorStop(.66, '#8fd071'); sky.addColorStop(1, '#4c9357'); ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,244,165,.8)'; ctx.beginPath(); ctx.arc(1050, 100, 48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(0, groundY + blockSize, canvas.width, 4);
        world.blocks.forEach(drawBlock);
        ctx.fillStyle = '#8b5a3c'; ctx.fillRect(world.player.x, world.player.y + 28, 38, 38); ctx.fillStyle = '#f4c28d'; ctx.fillRect(world.player.x + 5, world.player.y, 28, 30); ctx.fillStyle = '#2b3d5e'; ctx.fillRect(world.player.x + (world.player.facing > 0 ? 25 : 4), world.player.y + 12, 5, 5);
        if (world.portalOpen || session.snapshot().phase === 'final-portal' || session.snapshot().phase === 'settled') {
            const px = 1120, py = groundY - 118; ctx.fillStyle = '#39277c'; ctx.fillRect(px, py, 92, 118); ctx.fillStyle = '#9b78ff'; ctx.fillRect(px + 10, py + 10, 72, 98); ctx.fillStyle = '#d8c7ff'; ctx.fillRect(px + 25, py + 22, 42, 72); ctx.fillStyle = '#fff3a4'; ctx.font = 'bold 19px sans-serif'; ctx.fillText('10/10', px + 12, py - 12);
        }
    }

    function frame(now) { const dt = Math.min(.04, Math.max(0, (now - world.lastTime) / 1000 || 0)); world.lastTime = now; update(dt); draw(); global.requestAnimationFrame(frame); }

    function finalPortal() {
        const snapshot = session.snapshot();
        if (snapshot.phase === 'final-ready') { session.startFinalPortal(); setTip('传送门启动中……'); updateHud(); return; }
        if (snapshot.phase === 'final-portal') { session.settle(true); persistProgress(true); setTip('探险胜利！10 张学习卡全部完成。'); ui.portal.classList.add('is-hidden'); updateHud(); }
    }

    function start() {
        if (world.started) return;
        session.startExpedition(); world.started = true; configureBridge(); setTip('出发！采集或放置两个方块，学习卡就会出现。'); updateHud();
    }

    ui.start.addEventListener('click', start); ui.portal.addEventListener('click', finalPortal); ui.correction.addEventListener('click', completeCorrection);
    ui.speak.addEventListener('click', function () { if (world.currentCard) say(world.currentCard.speech && world.currentCard.speech.text, world.currentCard.speech); });
    ui.sound.addEventListener('click', function () { world.sound = !world.sound; ui.sound.textContent = world.sound ? '🔊' : '🔇'; ui.sound.setAttribute('aria-pressed', String(world.sound)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-control]'), function (button) { button.addEventListener('pointerdown', function (event) { event.preventDefault(); const action = button.dataset.control; if (action === 'left') move(-1); if (action === 'right') move(1); if (action === 'mine') mine(); if (action === 'place') place(); if (action === 'jump') jump(); }); });
    document.addEventListener('keydown', function (event) { const code = event.code; if (code === 'ArrowLeft' || code === 'KeyA') move(-1); else if (code === 'ArrowRight' || code === 'KeyD') move(1); else if (code === 'Space' || code === 'ArrowUp') { event.preventDefault(); jump(); } else if (code === 'KeyZ') mine(); else if (code === 'KeyX') place(); });
    window.addEventListener('beforeunload', function () { if (bridge && typeof bridge.recordPlaySession === 'function' && world.started) bridge.recordPlaySession(GAME_ID, { source: 'learning', completed: session.snapshot().settled && session.snapshot().settled.won }); });

    loadImage('sky', './assets/reused/world/sky-day.png'); loadImage('grass', './assets/reused/world/grass-block.png'); loadImage('player', './assets/reused/world/player.png');
    resetWorld(); updateHud(); draw();
    if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(frame);
}(typeof window !== 'undefined' ? window : globalThis));
