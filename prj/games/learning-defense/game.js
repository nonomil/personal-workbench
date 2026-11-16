(function (global) {
    'use strict';

    const Core = global.LearningDefenseCore;
    const Runtime = global.LearningDefenseRuntime;
    const CardLibrary = global.LearningDefenseCards;
    const Memory = global.WorkbenchMemory;
    const PreschoolSpeech = global.PersonalWorkbenchPreschoolSpeech;
    const bridge = global.WorkbenchGameBridge;

    if (!Core || !Runtime || !CardLibrary) return;

    const GAME_ID = 'learning-defense';
    const CARD_REWARD_SUN = 40;
    const BOARD = Object.freeze({ x: 250, y: 145, width: 930, height: 430, rows: 5, columns: 9 });
    const PLANT_TYPES = Object.freeze({
        'seed-shooter': { cost: 100, health: 5, fireMs: 1180, image: 'seedShooter' },
        'sun-bloom': { cost: 50, health: 4, sunMs: 6500, image: 'sunBloom' },
        'moss-shield': { cost: 75, health: 16, image: 'mossShield' }
    });

    const canvas = document.getElementById('battle-canvas');
    const ctx = canvas.getContext('2d');
    const session = Core.createSession({ cardsRequired: CardLibrary.cards.length });
    const reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ui = {
        startLayer: document.getElementById('start-layer'),
        startButton: document.getElementById('start-button'),
        learningLayer: document.getElementById('learning-card-layer'),
        learningCard: document.getElementById('learning-card'),
        cardTrack: document.getElementById('card-track-label'),
        cardSymbol: document.getElementById('card-symbol'),
        cardPrompt: document.getElementById('card-prompt'),
        answerGrid: document.getElementById('answer-grid'),
        cardFeedback: document.getElementById('card-feedback'),
        speakButton: document.getElementById('speak-button'),
        correctionButton: document.getElementById('correction-button'),
        learningProgress: document.getElementById('learning-progress'),
        learningCount: document.getElementById('learning-count'),
        sunCount: document.getElementById('sun-count'),
        homeHealth: document.getElementById('home-health'),
        stageMessage: document.getElementById('stage-message'),
        dockTitle: document.getElementById('dock-title'),
        dockHint: document.getElementById('dock-hint'),
        battleAction: document.getElementById('battle-action'),
        soundButton: document.getElementById('sound-button'),
        pauseButton: document.getElementById('pause-button'),
        pauseLayer: document.getElementById('pause-layer'),
        resumeButton: document.getElementById('resume-button'),
        countdownLayer: document.getElementById('countdown-layer'),
        countdownNumber: document.getElementById('countdown-number'),
        settleLayer: document.getElementById('settle-layer'),
        settleKicker: document.getElementById('settle-kicker'),
        settleTitle: document.getElementById('settle-title'),
        settleCards: document.getElementById('settle-cards'),
        settleCorrect: document.getElementById('settle-correct'),
        settleKills: document.getElementById('settle-kills'),
        settleMessage: document.getElementById('settle-message'),
        settleWeak: document.getElementById('settle-weak'),
        reviewRoundButton: document.getElementById('review-round-button'),
        restartButton: document.getElementById('restart-button'),
        exitLink: document.getElementById('exit-link'),
        settleExitLink: document.getElementById('settle-exit-link'),
        seedButtons: Array.from(document.querySelectorAll('[data-plant]'))
    };

    const imageSources = {
        background: './assets/reused/scene/sunny-lawn.webp',
        seedShooter: './assets/reused/plants/seed-shooter.png',
        sunBloom: './assets/reused/plants/sun-bloom.png',
        mossShield: './assets/reused/plants/moss-shield.png',
        walker: './assets/reused/enemies/garden-walker.png',
        coneWalker: './assets/reused/enemies/cone-walker.png',
        pailWalker: './assets/reused/enemies/pail-walker.png',
        sun: './assets/reused/ui/sun-token.png'
    };
    const images = {};

    let selectedPlant = 'seed-shooter';
    let sun = 225;
    let homeHealth = 3;
    let plants = [];
    let enemies = [];
    let projectiles = [];
    let particles = [];
    let normalSpawned = 0;
    let finalSpawned = 0;
    let spawnClock = 200;
    let kills = 0;
    let currentCard = null;
    let currentCardStartedAt = 0;
    let currentCardSkipped = false;
    const usedCardIds = new Set();
    const roundWeakCards = [];
    let gameStarted = false;
    let manualPaused = false;
    let soundEnabled = true;
    let lastTime = performance.now();
    let enemySerial = 0;
    let plantSerial = 0;
    let finalSettleQueued = false;
    let reviewSession = null;
    let reviewCards = [];
    let reviewIndex = 0;
    let reviewMode = false;
    const gameClock = Runtime.createClock();
    const attemptRecorder = Runtime.createAttemptRecorder(bridge);

    function loadImages() {
        Object.keys(imageSources).forEach(function (key) {
            const image = new Image();
            image.decoding = 'async';
            image.src = imageSources[key];
            images[key] = image;
        });
    }

    function cellWidth() {
        return BOARD.width / BOARD.columns;
    }

    function laneHeight() {
        return BOARD.height / BOARD.rows;
    }

    function cellCenter(lane, column) {
        return {
            x: BOARD.x + (column + 0.5) * cellWidth(),
            y: BOARD.y + (lane + 0.5) * laneHeight()
        };
    }

    function createPlant(type, lane, column, starter) {
        const spec = PLANT_TYPES[type];
        const point = cellCenter(lane, column);
        return {
            id: `plant-${++plantSerial}`,
            type: type,
            lane: lane,
            column: column,
            x: point.x,
            y: point.y,
            health: spec.health,
            maxHealth: spec.health,
            cooldown: starter ? Math.random() * 700 : 450,
            starter: Boolean(starter)
        };
    }

    function addStarterPlants() {
        plants = [];
        for (let lane = 0; lane < BOARD.rows; lane += 1) {
            plants.push(createPlant('seed-shooter', lane, 1, true));
        }
        plants.push(createPlant('sun-bloom', 2, 0, true));
    }

    function buildLearningMeter() {
        ui.learningProgress.innerHTML = '';
        for (let index = 0; index < CardLibrary.cards.length; index += 1) {
            const seed = document.createElement('span');
            seed.className = 'learning-seed';
            seed.setAttribute('aria-hidden', 'true');
            ui.learningProgress.appendChild(seed);
        }
    }

    function updateHud() {
        const snapshot = session.snapshot();
        ui.learningCount.textContent = `${snapshot.cardsCompleted}/${snapshot.cardsRequired}`;
        Array.from(ui.learningProgress.children).forEach(function (seed, index) {
            seed.classList.toggle('is-filled', index < snapshot.cardsCompleted);
        });
        ui.sunCount.textContent = String(Math.max(0, Math.floor(sun)));
        ui.homeHealth.textContent = String(Math.max(0, homeHealth));
        ui.seedButtons.forEach(function (button) {
            const spec = PLANT_TYPES[button.dataset.plant];
            button.disabled = sun < spec.cost || !gameStarted || snapshot.phase === 'settled';
        });

        if (snapshot.phase === 'final-wave-ready') {
            ui.battleAction.disabled = false;
            ui.battleAction.textContent = '开启最终波';
            ui.dockTitle.textContent = '10 张学习卡已点亮';
            ui.dockHint.textContent = '知识能量已经准备好，开启最后的防守。';
        } else if (snapshot.phase === 'final-wave') {
            ui.battleAction.disabled = true;
            ui.battleAction.textContent = '最终波进行中';
        } else if (gameStarted) {
            ui.battleAction.disabled = true;
            ui.battleAction.textContent = '防守进行中';
        }
    }

    function setStageMessage(message) {
        ui.stageMessage.textContent = message;
    }

    function saveSessionStart() {
        if (!bridge) return;
        if (typeof bridge.recordPlaySession === 'function') bridge.recordPlaySession(GAME_ID);
        if (typeof bridge.getProgress !== 'function' || typeof bridge.saveProgress !== 'function') return;
        const found = bridge.getProgress(GAME_ID);
        const progress = Object.assign({
            unlockedStage: 1,
            clearedStages: [],
            stars: {},
            sessions: 0,
            cardsCompleted: 0,
            correctCount: 0,
            wrongCount: 0
        }, found.progress || {});
        progress.sessions = Math.max(0, Number(progress.sessions) || 0) + 1;
        bridge.saveProgress(GAME_ID, progress);
    }

    function saveSettlement(won) {
        attemptRecorder.flush();
        if (!bridge || typeof bridge.getProgress !== 'function' || typeof bridge.saveProgress !== 'function') return;
        const found = bridge.getProgress(GAME_ID);
        const progress = Object.assign({
            unlockedStage: 1,
            clearedStages: [],
            stars: {},
            sessions: 0,
            cardsCompleted: 0,
            correctCount: 0,
            wrongCount: 0
        }, found.progress || {});
        const snapshot = session.snapshot();
        progress.cardsCompleted = Math.max(0, Number(progress.cardsCompleted) || 0) + snapshot.cardsCompleted;
        progress.correctCount = Math.max(0, Number(progress.correctCount) || 0) + snapshot.correctCount;
        progress.wrongCount = Math.max(0, Number(progress.wrongCount) || 0) + snapshot.wrongCount;
        if (!Array.isArray(progress.clearedStages)) progress.clearedStages = [];
        if (!progress.stars || typeof progress.stars !== 'object') progress.stars = {};
        if (won && progress.clearedStages.indexOf(1) < 0) progress.clearedStages.push(1);
        if (won) progress.stars[1] = Math.max(Number(progress.stars[1]) || 0, snapshot.correctCount >= 8 ? 3 : snapshot.correctCount >= 5 ? 2 : 1);
        bridge.saveProgress(GAME_ID, progress);
    }

    function startGame() {
        if (gameStarted) return;
        gameStarted = true;
        ui.startLayer.classList.add('is-hidden');
        session.startBattle();
        addStarterPlants();
        saveSessionStart();
        setStageMessage('第一名捣蛋客正在靠近，守住五路草坪');
        updateHud();
    }

    function spawnEnemy(finalWave) {
        const lane = Math.floor(Math.random() * BOARD.rows);
        const isFinal = Boolean(finalWave);
        const roster = isFinal
            ? ['pailWalker', 'coneWalker', 'pailWalker', 'walker']
            : ['walker', 'walker', 'coneWalker'];
        const art = roster[(isFinal ? finalSpawned : normalSpawned) % roster.length];
        const maxHealth = art === 'pailWalker' ? 9 : art === 'coneWalker' ? 5 : isFinal ? 5 : 3;
        enemies.push({
            id: `enemy-${++enemySerial}`,
            lane: lane,
            x: BOARD.x + BOARD.width + 58,
            y: cellCenter(lane, 0).y,
            health: maxHealth,
            maxHealth: maxHealth,
            speed: art === 'pailWalker' ? 22 : art === 'coneWalker' ? 26 : 31,
            art: art,
            finalWave: isFinal,
            biteClock: 0
        });
    }

    function nearestEnemyInLane(lane, x) {
        return enemies
            .filter(function (enemy) { return enemy.lane === lane && enemy.x > x; })
            .sort(function (a, b) { return a.x - b.x; })[0] || null;
    }

    function updatePlants(dt) {
        plants.forEach(function (plant) {
            if (plant.type === 'seed-shooter') {
                plant.cooldown -= dt;
                const target = nearestEnemyInLane(plant.lane, plant.x);
                if (target && plant.cooldown <= 0) {
                    projectiles.push({ lane: plant.lane, x: plant.x + 42, y: plant.y - 8, speed: 390, damage: 1 });
                    plant.cooldown = PLANT_TYPES['seed-shooter'].fireMs;
                }
            } else if (plant.type === 'sun-bloom') {
                plant.cooldown -= dt;
                if (plant.cooldown <= 0) {
                    sun += 25;
                    particles.push({ kind: 'sun', x: plant.x, y: plant.y - 22, age: 0, life: 1000 });
                    plant.cooldown = PLANT_TYPES['sun-bloom'].sunMs;
                    updateHud();
                }
            }
        });
    }

    function blockingPlant(enemy) {
        return plants.find(function (plant) {
            return plant.lane === enemy.lane && enemy.x >= plant.x - 34 && enemy.x <= plant.x + 55;
        }) || null;
    }

    function updateEnemies(dt) {
        for (let index = enemies.length - 1; index >= 0; index -= 1) {
            const enemy = enemies[index];
            const blocker = blockingPlant(enemy);
            if (blocker) {
                enemy.biteClock += dt;
                if (enemy.biteClock >= 720) {
                    blocker.health -= 1;
                    enemy.biteClock = 0;
                    if (blocker.health <= 0) plants = plants.filter(function (plant) { return plant !== blocker; });
                }
            } else {
                enemy.biteClock = 0;
                enemy.x -= enemy.speed * (dt / 1000);
            }

            if (enemy.x < BOARD.x - 45) {
                enemies.splice(index, 1);
                homeHealth -= 1;
                particles.push({ kind: 'impact', x: BOARD.x - 10, y: enemy.y, age: 0, life: 650 });
                updateHud();
                if (homeHealth <= 0) finishGame(false);
            }
        }
    }

    function defeatEnemy(index) {
        const enemy = enemies[index];
        if (!enemy) return;
        enemies.splice(index, 1);
        kills += 1;
        particles.push({ kind: 'leaf', x: enemy.x, y: enemy.y, age: 0, life: 850 });

        const snapshot = session.snapshot();
        if (snapshot.phase === 'battle' && snapshot.cardsCompleted < snapshot.cardsRequired) {
            openLearningCard(pickLearningCard(snapshot));
        }
    }

    function pickLearningCard(snapshot) {
        const state = snapshot || session.snapshot();
        const memory = bridge && typeof bridge.getMemory === 'function' ? bridge.getMemory() : null;
        if (Memory && typeof Memory.pickCards === 'function') {
            const picked = Memory.pickCards(CardLibrary.cards, memory, Date.now(), {
                count: 1,
                usedIds: Array.from(usedCardIds)
            });
            if (picked.length) return picked[0];
        }
        return CardLibrary.cards[state.cardsCompleted] || null;
    }

    function updateProjectiles(dt) {
        for (let index = projectiles.length - 1; index >= 0; index -= 1) {
            const projectile = projectiles[index];
            projectile.x += projectile.speed * (dt / 1000);
            const enemyIndex = enemies.findIndex(function (enemy) {
                return enemy.lane === projectile.lane && Math.abs(enemy.x - projectile.x) < 34;
            });
            if (enemyIndex >= 0) {
                enemies[enemyIndex].health -= projectile.damage;
                particles.push({ kind: 'hit', x: projectile.x, y: projectile.y, age: 0, life: 280 });
                projectiles.splice(index, 1);
                if (enemies[enemyIndex] && enemies[enemyIndex].health <= 0) defeatEnemy(enemyIndex);
            } else if (projectile.x > canvas.width + 30) {
                projectiles.splice(index, 1);
            }
        }
    }

    function updateParticles(dt) {
        particles.forEach(function (particle) { particle.age += dt; });
        particles = particles.filter(function (particle) { return particle.age < particle.life; });
    }

    function updateSpawning(dt) {
        if (enemies.length > 0) return;
        spawnClock -= dt;
        const phase = session.snapshot().phase;
        if (phase === 'battle' && normalSpawned < CardLibrary.cards.length && spawnClock <= 0) {
            normalSpawned += 1;
            spawnEnemy(false);
            spawnClock = 900;
            setStageMessage(`普通防守 ${normalSpawned}/10 · 击败后接住学习卡`);
        } else if (phase === 'final-wave' && finalSpawned < 5 && spawnClock <= 0) {
            finalSpawned += 1;
            spawnEnemy(true);
            spawnClock = finalSpawned === 5 ? 0 : 650;
            setStageMessage(`最终波 ${finalSpawned}/5 · 知识能量正在保护花园`);
        } else if (phase === 'final-wave' && finalSpawned >= 5 && !finalSettleQueued) {
            finalSettleQueued = true;
            gameClock.schedule(function () {
                if (session.snapshot().phase === 'final-wave' && enemies.length === 0) finishGame(true);
                else finalSettleQueued = false;
            }, 650);
        }
    }

    const simulationSteps = [updateSpawning, updatePlants, updateProjectiles, updateEnemies, updateParticles];

    function updateBattle(dt) {
        Runtime.runSimulationSteps(function () {
            return session.canSimulate() && !manualPaused;
        }, simulationSteps, dt);
    }

    function drawImageContain(image, x, y, width, height) {
        if (!image || !image.complete || !image.naturalWidth) return false;
        const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
        return true;
    }

    function drawBackground() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (images.background && images.background.complete && images.background.naturalWidth) {
            ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
        } else {
            const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
            sky.addColorStop(0, '#83d4f2');
            sky.addColorStop(.45, '#bcebf5');
            sky.addColorStop(.46, '#82c557');
            sky.addColorStop(1, '#609d3f');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.fillStyle = 'rgba(255, 248, 194, .12)';
        ctx.fillRect(BOARD.x, BOARD.y, BOARD.width, BOARD.height);
        ctx.strokeStyle = 'rgba(255, 255, 220, .2)';
        ctx.lineWidth = 2;
        for (let row = 0; row <= BOARD.rows; row += 1) {
            const y = BOARD.y + row * laneHeight();
            ctx.beginPath();
            ctx.moveTo(BOARD.x, y);
            ctx.lineTo(BOARD.x + BOARD.width, y);
            ctx.stroke();
        }
        for (let column = 0; column <= BOARD.columns; column += 1) {
            const x = BOARD.x + column * cellWidth();
            ctx.beginPath();
            ctx.moveTo(x, BOARD.y);
            ctx.lineTo(x, BOARD.y + BOARD.height);
            ctx.stroke();
        }
    }

    function drawHealthBar(actor, width, yOffset) {
        if (actor.health >= actor.maxHealth) return;
        const ratio = Math.max(0, actor.health / actor.maxHealth);
        ctx.fillStyle = 'rgba(31, 56, 33, .65)';
        ctx.fillRect(actor.x - width / 2, actor.y + yOffset, width, 7);
        ctx.fillStyle = ratio > .5 ? '#7ec85b' : ratio > .25 ? '#f1bd3c' : '#d7684f';
        ctx.fillRect(actor.x - width / 2 + 1, actor.y + yOffset + 1, (width - 2) * ratio, 5);
    }

    function drawPlants() {
        plants.forEach(function (plant) {
            const image = images[PLANT_TYPES[plant.type].image];
            ctx.save();
            ctx.shadowColor = 'rgba(32, 67, 30, .3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 6;
            if (!drawImageContain(image, plant.x - 50, plant.y - 58, 100, 112)) {
                ctx.fillStyle = '#4f9b51';
                ctx.beginPath();
                ctx.arc(plant.x, plant.y, 35, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            drawHealthBar(plant, 54, 37);
        });
    }

    function drawEnemies() {
        enemies.forEach(function (enemy) {
            ctx.save();
            ctx.shadowColor = 'rgba(48, 49, 33, .34)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 7;
            if (!drawImageContain(images[enemy.art], enemy.x - 50, enemy.y - 75, 100, 132)) {
                ctx.fillStyle = '#758a58';
                ctx.fillRect(enemy.x - 30, enemy.y - 52, 60, 88);
            }
            ctx.restore();
            drawHealthBar(enemy, 58, -64);
        });
    }

    function drawProjectiles() {
        projectiles.forEach(function (projectile) {
            const glow = ctx.createRadialGradient(projectile.x, projectile.y, 2, projectile.x, projectile.y, 16);
            glow.addColorStop(0, '#f8ffb5');
            glow.addColorStop(.45, '#83cf48');
            glow.addColorStop(1, 'rgba(86, 163, 55, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 17, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5da63c';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawParticles() {
        particles.forEach(function (particle) {
            const progress = particle.age / particle.life;
            ctx.save();
            ctx.globalAlpha = 1 - progress;
            if (particle.kind === 'sun') {
                drawImageContain(images.sun, particle.x - 22, particle.y - progress * 45, 44, 44);
            } else {
                ctx.fillStyle = particle.kind === 'impact' ? '#f5bd54' : particle.kind === 'hit' ? '#d8f28e' : '#83c761';
                for (let index = 0; index < 5; index += 1) {
                    const angle = (Math.PI * 2 * index) / 5;
                    const radius = 10 + progress * 34;
                    ctx.beginPath();
                    ctx.arc(particle.x + Math.cos(angle) * radius, particle.y + Math.sin(angle) * radius, 5 * (1 - progress), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        });
    }

    function drawFrozenShield() {
        if (session.canSimulate() || session.snapshot().phase === 'ready' || session.snapshot().phase === 'settled') return;
        ctx.save();
        ctx.fillStyle = 'rgba(115, 218, 239, .1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    function draw() {
        drawBackground();
        drawPlants();
        drawEnemies();
        drawProjectiles();
        drawParticles();
        drawFrozenShield();
    }

    function frame(now) {
        const dt = Math.min(40, Math.max(0, now - lastTime));
        lastTime = now;
        gameClock.tick(dt);
        updateBattle(dt);
        draw();
        requestAnimationFrame(frame);
    }

    function speakCard() {
        if (!soundEnabled || !currentCard || !PreschoolSpeech || typeof PreschoolSpeech.speak !== 'function') return;
        const speech = Object.assign({ localAudioRoot: '../../assets/audio/tts/' }, currentCard.speech || {});
        PreschoolSpeech.speak(speech).catch(function () {
            setStageMessage('发音暂时不可用，可以继续完成学习卡');
        });
    }

    function recordUnknownCard(card, source) {
        if (!bridge || !card || typeof bridge.recordLearningOutcome !== 'function') return false;
        try {
            return Boolean(bridge.recordLearningOutcome(
                { key: card.key, track: card.track },
                'unknown',
                { source: source || GAME_ID, cardId: card.id, activityType: 'learning-card-skip' }
            ));
        } catch (error) {
            return false;
        }
    }

    function renderLearningCard(card) {
        ui.cardTrack.textContent = card.track === 'word' ? '英语单词卡' : '汉字识读卡';
        ui.cardSymbol.textContent = card.display;
        ui.cardPrompt.textContent = card.prompt;
        ui.cardFeedback.textContent = '';
        ui.cardFeedback.classList.remove('is-wrong');
        ui.correctionButton.classList.add('is-hidden');
        ui.answerGrid.innerHTML = '';
        card.options.forEach(function (option) {
            const button = document.createElement('button');
            button.className = 'answer-option';
            button.type = 'button';
            button.dataset.answer = option.id;

            const image = document.createElement('img');
            image.src = option.image;
            image.alt = option.label;
            const label = document.createElement('span');
            label.textContent = option.label;
            button.append(image, label);
            button.addEventListener('click', function () { answerCard(option.id, button); });
            ui.answerGrid.appendChild(button);
        });
        const unknown = document.createElement('button');
        unknown.className = 'answer-option answer-option--unknown';
        unknown.type = 'button';
        unknown.dataset.skip = 'true';
        unknown.innerHTML = '<strong>?</strong><span>不会 / 跳过</span><small>先看答案，不算答错</small>';
        unknown.addEventListener('click', function () { answerCard('__learning_unknown__', unknown); });
        ui.answerGrid.appendChild(unknown);
    }

    function openLearningCard(card) {
        if (!card) return;
        currentCard = card;
        currentCardSkipped = false;
        usedCardIds.add(String(card.id));
        session.requestCard(card);
        renderLearningCard(card);
        ui.learningCard.classList.remove('is-rewarding');
        ui.learningLayer.classList.remove('is-hidden');
        setStageMessage('学习安全罩已开启，战场完全暂停');
        gameClock.schedule(function () {
            if (session.snapshot().phase !== 'card-falling') return;
            session.landCard();
            currentCardStartedAt = Date.now();
            speakCard();
        }, reducedMotion ? 20 : 600);
    }

    function reviewCardsForRound() {
        const out = [];
        const seen = new Set();
        function add(card) {
            if (!card || seen.has(card.id)) return;
            seen.add(card.id);
            out.push(card);
        }
        roundWeakCards.forEach(add);
        const memory = bridge && typeof bridge.getMemory === 'function' ? bridge.getMemory() : null;
        const dueKeys = Memory && typeof Memory.dueWords === 'function'
            ? Memory.dueWords(memory, Date.now() + (Memory.DAY_MS || 86400000))
            : [];
        CardLibrary.cards.forEach(function (card) {
            if (dueKeys.indexOf(String(card.key || '').trim().toLowerCase()) >= 0) add(card);
        });
        return out.slice(0, 5);
    }

    function renderSettleWeak() {
        if (!ui.settleWeak || !ui.reviewRoundButton) return;
        ui.settleWeak.innerHTML = '';
        const cards = reviewCardsForRound();
        if (!cards.length) {
            ui.reviewRoundButton.classList.add('is-hidden');
            return;
        }
        const title = document.createElement('strong');
        title.textContent = '本局建议再练：';
        ui.settleWeak.appendChild(title);
        cards.forEach(function (card) {
            const chip = document.createElement('span');
            chip.textContent = card.display || card.key;
            ui.settleWeak.appendChild(chip);
        });
        ui.reviewRoundButton.classList.remove('is-hidden');
    }

    function openReviewCard(card) {
        if (!reviewSession || !card) return;
        currentCard = card;
        currentCardSkipped = false;
        reviewSession.requestCard(card);
        renderLearningCard(card);
        ui.learningCard.classList.remove('is-rewarding');
        ui.learningLayer.classList.remove('is-hidden');
        setStageMessage('复习回合：花园暂停，只和这张卡再见一次');
        gameClock.schedule(function () {
            if (!reviewSession || reviewSession.snapshot().phase !== 'card-falling') return;
            reviewSession.landCard();
            currentCardStartedAt = Date.now();
            speakCard();
        }, reducedMotion ? 20 : 240);
    }

    function finishReviewRound() {
        reviewMode = false;
        reviewSession = null;
        reviewCards = [];
        reviewIndex = 0;
        currentCard = null;
        currentCardStartedAt = 0;
        ui.learningLayer.classList.add('is-hidden');
        ui.settleLayer.classList.remove('is-hidden');
        ui.settleMessage.textContent = '复习回合完成了，薄弱卡已经重新记账。';
        gameClock.setPaused(true);
    }

    function finishReviewCard() {
        gameClock.schedule(function () {
            if (!reviewSession || reviewSession.snapshot().phase !== 'card-reward') return;
            reviewSession.finishReward();
            reviewIndex += 1;
            if (reviewIndex >= reviewCards.length) {
                finishReviewRound();
                return;
            }
            reviewSession.finishResume();
            openReviewCard(reviewCards[reviewIndex]);
        }, reducedMotion ? 20 : 360);
    }

    function answerReviewCard(answerId) {
        if (!reviewSession || reviewSession.snapshot().phase !== 'learning') return;
        if (answerId === '__learning_unknown__') {
            reviewSession.skipCard();
            recordUnknownCard(currentCard, GAME_ID + '-review');
            lockAnswerOptions(currentCard.answer, null);
            ui.correctionButton.classList.add('is-hidden');
            ui.cardFeedback.classList.remove('is-wrong');
            ui.cardFeedback.textContent = '已跳过，先看答案；这题不算答错，已加入复习单。';
            finishReviewCard();
            return;
        }
        const responseMs = currentCardStartedAt ? Math.max(0, Date.now() - currentCardStartedAt) : 0;
        const correct = String(answerId) === String(currentCard.answer);
        const result = reviewSession.answer(answerId);
        const grade = !correct ? 'again' : responseMs <= 2500 ? 'easy' : 'good';
        if (bridge && typeof bridge.recordMemoryAnswer === 'function') {
            bridge.recordMemoryAnswer(
                { key: currentCard.key, track: currentCard.track },
                grade,
                { source: GAME_ID + '-review', cardId: currentCard.id, responseMs: responseMs }
            );
        }
        attemptRecorder.record(currentCard, correct);
        lockAnswerOptions(currentCard.answer, answerId);
        if (result.needsCorrection) {
            ui.cardFeedback.textContent = '没关系，正确图片已经发光。再听一次，记住它。';
            ui.cardFeedback.classList.add('is-wrong');
            ui.correctionButton.classList.remove('is-hidden');
            speakCard();
            return;
        }
        ui.cardFeedback.textContent = '答对啦！下一张薄弱卡马上来。';
        finishReviewCard();
    }

    function completeReviewCorrection() {
        if (!reviewSession || reviewSession.snapshot().phase !== 'correction') return;
        reviewSession.completeCorrection();
        ui.correctionButton.classList.add('is-hidden');
        ui.cardFeedback.classList.remove('is-wrong');
        ui.cardFeedback.textContent = '记住啦！继续复习。';
        finishReviewCard();
    }

    function openReviewRound() {
        if (reviewMode || session.snapshot().phase !== 'settled') return;
        reviewCards = reviewCardsForRound();
        if (!reviewCards.length) return;
        reviewIndex = 0;
        reviewMode = true;
        reviewSession = Core.createSession({ cardsRequired: reviewCards.length });
        reviewSession.startBattle();
        ui.settleLayer.classList.add('is-hidden');
        gameClock.setPaused(false);
        openReviewCard(reviewCards[reviewIndex]);
    }

    function lockAnswerOptions(correctId, chosenId) {
        Array.from(ui.answerGrid.querySelectorAll('.answer-option')).forEach(function (button) {
            button.disabled = true;
            if (button.dataset.answer === correctId) button.classList.add('is-correct');
            if (chosenId && button.dataset.answer === chosenId && chosenId !== correctId) button.classList.add('is-wrong');
        });
    }

    function answerCard(answerId) {
        if (reviewMode) {
            answerReviewCard(answerId);
            return;
        }
        if (session.snapshot().phase !== 'learning') return;
        if (answerId === '__learning_unknown__') {
            session.skipCard();
            currentCardSkipped = true;
            recordUnknownCard(currentCard, GAME_ID);
            lockAnswerOptions(currentCard.answer, null);
            ui.correctionButton.classList.add('is-hidden');
            ui.cardFeedback.classList.remove('is-wrong');
            ui.cardFeedback.textContent = '已跳过，先看答案；这题不算答错，已加入复习单。';
            updateHud();
            finishCardReward();
            return;
        }
        const responseMs = currentCardStartedAt ? Math.max(0, Date.now() - currentCardStartedAt) : 0;
        const correct = String(answerId) === String(currentCard.answer);
        const result = session.answer(answerId);
        const grade = !correct ? 'again' : responseMs <= 2500 ? 'easy' : 'good';
        if (bridge && typeof bridge.recordMemoryAnswer === 'function') {
            bridge.recordMemoryAnswer(
                { key: currentCard.key, track: currentCard.track },
                grade,
                { source: GAME_ID, cardId: currentCard.id, responseMs: responseMs }
            );
        }
        if (!correct && roundWeakCards.every(function (card) { return card.id !== currentCard.id; })) {
            roundWeakCards.push(currentCard);
        }
        if (result.completed) {
            attemptRecorder.record(currentCard, true);
            lockAnswerOptions(currentCard.answer, answerId);
            ui.cardFeedback.textContent = `答对了！学习能量 +${CARD_REWARD_SUN}`;
            updateHud();
            finishCardReward();
            return;
        }

        attemptRecorder.record(currentCard, false);
        lockAnswerOptions(currentCard.answer, answerId);
        ui.cardFeedback.textContent = '没关系，正确图片已经发光。再听一次，记住它。';
        ui.cardFeedback.classList.add('is-wrong');
        ui.correctionButton.classList.remove('is-hidden');
        speakCard();
    }

    function finishCardReward() {
        gameClock.schedule(function () {
            if (currentCardSkipped) {
                ui.learningCard.classList.remove('is-rewarding');
            } else {
                ui.learningCard.classList.add('is-rewarding');
                sun += CARD_REWARD_SUN;
            }
            updateHud();
            gameClock.schedule(function () {
                session.finishReward();
                ui.learningLayer.classList.add('is-hidden');
                ui.learningCard.classList.remove('is-rewarding');
                currentCard = null;
                currentCardSkipped = false;
                updateHud();
                if (session.snapshot().phase === 'final-wave-ready') {
                    setStageMessage('10/10！知识大门已经打开，准备最终波');
                } else {
                    beginResumeCountdown();
                }
            }, reducedMotion ? 20 : 540);
        }, reducedMotion ? 20 : 520);
    }

    function beginResumeCountdown() {
        let number = 3;
        ui.countdownNumber.textContent = String(number);
        ui.countdownLayer.classList.remove('is-hidden');
        const step = function () {
            number -= 1;
            if (number <= 0) {
                ui.countdownLayer.classList.add('is-hidden');
                session.finishResume();
                spawnClock = Math.min(spawnClock, 280);
                setStageMessage(`已完成 ${session.snapshot().cardsCompleted}/10，继续守住草坪`);
                updateHud();
                return;
            }
            ui.countdownNumber.textContent = String(number);
            gameClock.schedule(step, reducedMotion ? 80 : 650);
        };
        gameClock.schedule(step, reducedMotion ? 80 : 650);
    }

    function startFinalWave() {
        if (session.snapshot().phase !== 'final-wave-ready') return;
        session.startFinalWave();
        finalSpawned = 0;
        spawnClock = 100;
        setStageMessage('最终波开始！知识能量正在保护每一路草坪');
        updateHud();
    }

    function finishGame(won) {
        const phase = session.snapshot().phase;
        if (phase !== 'battle' && phase !== 'final-wave') return;
        session.settle(won);
        manualPaused = true;
        gameClock.setPaused(true);
        saveSettlement(won);
        const snapshot = session.snapshot();
        ui.settleKicker.textContent = won ? '本局完成 · 最终波击退' : '本局结束 · 花园需要帮助';
        ui.settleTitle.textContent = won ? '知识花园守住了！' : '再布置一次防线吧';
        ui.settleCards.textContent = String(snapshot.cardsCompleted);
        ui.settleCorrect.textContent = String(snapshot.correctCount);
        ui.settleKills.textContent = String(kills);
        ui.settleMessage.textContent = won
            ? '10 张学习卡已经化成花园能量，答错的内容也会进入复习。'
            : '已经完成的学习卡仍然会保留记录，重新开始不会受到惩罚。';
        renderSettleWeak();
        ui.settleLayer.classList.remove('is-hidden');
        updateHud();
    }

    function togglePause(forcePaused) {
        if (!gameStarted || session.snapshot().phase === 'settled') return;
        manualPaused = typeof forcePaused === 'boolean' ? forcePaused : !manualPaused;
        gameClock.setPaused(manualPaused);
        ui.pauseLayer.classList.toggle('is-hidden', !manualPaused);
        if (manualPaused && PreschoolSpeech && typeof PreschoolSpeech.stop === 'function') PreschoolSpeech.stop();
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        ui.soundButton.setAttribute('aria-pressed', String(!soundEnabled));
        ui.soundButton.setAttribute('aria-label', soundEnabled ? '关闭声音' : '打开声音');
        ui.soundButton.style.opacity = soundEnabled ? '1' : '.55';
        if (!soundEnabled && PreschoolSpeech && typeof PreschoolSpeech.stop === 'function') PreschoolSpeech.stop();
        else if (soundEnabled && currentCard) speakCard();
    }

    function selectPlant(type) {
        if (!PLANT_TYPES[type]) return;
        selectedPlant = type;
        ui.seedButtons.forEach(function (button) {
            const selected = button.dataset.plant === type;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
    }

    function boardPointFromEvent(event) {
        const rect = canvas.getBoundingClientRect();
        const clientX = event.touches && event.touches[0] ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches && event.touches[0] ? event.touches[0].clientY : event.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function plantFromEvent(event) {
        if (!gameStarted || manualPaused || !session.canSimulate()) return;
        const point = boardPointFromEvent(event);
        if (point.x < BOARD.x || point.x >= BOARD.x + BOARD.width || point.y < BOARD.y || point.y >= BOARD.y + BOARD.height) return;
        const column = Math.floor((point.x - BOARD.x) / cellWidth());
        const lane = Math.floor((point.y - BOARD.y) / laneHeight());
        if (column >= 5) {
            setStageMessage('植物要种在草坪左边五列，右边留给敌人');
            return;
        }
        if (plants.some(function (plant) { return plant.lane === lane && plant.column === column; })) {
            setStageMessage('这个位置已经有植物了，换一个格子吧');
            return;
        }
        const spec = PLANT_TYPES[selectedPlant];
        if (sun < spec.cost) {
            setStageMessage('阳光还不够，学习卡和阳光花都能补充能量');
            return;
        }
        sun -= spec.cost;
        plants.push(createPlant(selectedPlant, lane, column, false));
        setStageMessage('植物加入防线了');
        updateHud();
    }

    function bindEvents() {
        ui.startButton.addEventListener('click', startGame);
        ui.battleAction.addEventListener('click', function () {
            if (!gameStarted) startGame();
            else startFinalWave();
        });
        ui.correctionButton.addEventListener('click', function () {
            if (reviewMode) {
                completeReviewCorrection();
                return;
            }
            if (session.snapshot().phase !== 'correction') return;
            session.completeCorrection();
            ui.correctionButton.classList.add('is-hidden');
            ui.cardFeedback.classList.remove('is-wrong');
            ui.cardFeedback.textContent = `已经记住了！学习能量 +${CARD_REWARD_SUN}`;
            updateHud();
            finishCardReward();
        });
        ui.speakButton.addEventListener('click', speakCard);
        ui.reviewRoundButton.addEventListener('click', openReviewRound);
        ui.soundButton.addEventListener('click', toggleSound);
        ui.pauseButton.addEventListener('click', function () { togglePause(); });
        ui.resumeButton.addEventListener('click', function () { togglePause(false); });
        ui.restartButton.addEventListener('click', function () { global.location.reload(); });
        [ui.exitLink, ui.settleExitLink].forEach(function (link) {
            if (link) link.addEventListener('click', function () { attemptRecorder.flush(); });
        });
        ui.seedButtons.forEach(function (button) {
            button.addEventListener('click', function () { selectPlant(button.dataset.plant); });
        });
        canvas.addEventListener('pointerdown', plantFromEvent);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) attemptRecorder.flush();
            if (document.hidden && gameStarted && !manualPaused && session.snapshot().phase !== 'settled') togglePause(true);
        });
    }

    function configureReturnLinks() {
        if (!bridge || typeof bridge.backHref !== 'function') return;
        const href = bridge.backHref('garden-defense');
        if (ui.exitLink) ui.exitLink.href = href;
        if (ui.settleExitLink) ui.settleExitLink.href = href;
    }

    loadImages();
    buildLearningMeter();
    configureReturnLinks();
    bindEvents();
    updateHud();
    requestAnimationFrame(frame);
}(typeof window !== 'undefined' ? window : globalThis));
