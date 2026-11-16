(function (global) {
    'use strict';

    function text(value) {
        return String(value == null ? '' : value);
    }

    function create(options) {
        const config = options && typeof options === 'object' ? options : {};
        const session = config.session;
        const cards = Array.isArray(config.cards) ? config.cards : [];
        const bridge = config.bridge || null;
        const imageResolver = typeof config.resolveImage === 'function' ? config.resolveImage : function (src) { return src; };
        const layer = document.getElementById('learning-card-layer');
        const track = document.getElementById('learning-track-label');
        const symbol = document.getElementById('learning-card-symbol');
        const prompt = document.getElementById('learning-card-prompt');
        const grid = document.getElementById('learning-answer-grid');
        const feedback = document.getElementById('learning-card-feedback');
        const correction = document.getElementById('learning-correction-button');
        const speakButton = document.getElementById('learning-speak-button');
        const progress = document.getElementById('learning-mode-progress');
        const count = document.getElementById('learning-mode-count');
        let currentCard = null;
        let timer = 0;
        let pendingTrigger = '';
        let cardStartedAt = 0;
        const usedCardIds = new Set();

        function snapshot() {
            return session && typeof session.snapshot === 'function' ? session.snapshot() : { phase: 'disabled', cardsCompleted: 0, cardsRequired: cards.length || 10 };
        }

        function notify() {
            const state = snapshot();
            if (progress) progress.style.width = `${state.cardsRequired ? Math.round((state.cardsCompleted / state.cardsRequired) * 100) : 0}%`;
            if (count) count.textContent = `${state.cardsCompleted}/${state.cardsRequired}`;
            if (typeof config.onProgress === 'function') config.onProgress(state);
        }

        function speech(card) {
            const plan = card && card.speech;
            const api = global.PersonalWorkbenchPreschoolSpeech;
            if (!plan || !api || typeof api.speak !== 'function') return;
            try {
                api.speak({
                    text: plan.text,
                    lang: plan.lang,
                    rate: plan.rate,
                    kind: plan.kind,
                    audioSrc: plan.audioSrc
                });
            } catch (error) {
                // A missing WebView voice must not stop the game or the answer flow.
            }
        }

        function markAnswers(answerId, answer) {
            if (!grid) return;
            Array.prototype.forEach.call(grid.querySelectorAll('[data-learning-answer]'), function (button) {
                const value = button.dataset.learningAnswer;
                button.disabled = true;
                if (value === answer) button.classList.add('is-correct');
                if (value === answerId && value !== answer) button.classList.add('is-wrong');
            });
        }

        function recordCourseProgress(card, correct) {
            if (!bridge || !card) return false;
            try {
                if (card.track === 'word' && typeof bridge.recordWordAnswer === 'function') {
                    return Boolean(bridge.recordWordAnswer(card.key, correct, { source: config.source || 'learning-mode', cardId: card.id }));
                }
                if (typeof bridge.recordSubjectAnswer === 'function') {
                    return Boolean(bridge.recordSubjectAnswer('literacy', card.key, correct, { activityType: config.source || 'learning-mode' }));
                }
            } catch (error) {
                return false;
            }
            return false;
        }

        function recordMemory(card, correct, responseMs) {
            if (!bridge || !card) return false;
            const grade = !correct ? 'again' : Number(responseMs) <= 2500 ? 'easy' : 'good';
            try {
                if (typeof bridge.recordMemoryAnswer === 'function') {
                    bridge.recordMemoryAnswer(
                        { key: card.key, track: card.track },
                        grade,
                        {
                            source: config.source || 'learning-mode',
                            cardId: card.id,
                            responseMs: responseMs
                        }
                    );
                }
                if (typeof config.onAnswer === 'function') {
                    config.onAnswer(card, grade, responseMs);
                }
                return true;
            } catch (error) {
            return false;
        }

        function recordUnknown(card, responseMs) {
            if (!bridge || !card) return false;
            try {
                if (typeof bridge.recordLearningOutcome === 'function') {
                    bridge.recordLearningOutcome(
                        { key: card.key, track: card.track },
                        'unknown',
                        {
                            source: config.source || 'learning-mode',
                            cardId: card.id,
                            responseMs: responseMs,
                            activityType: 'learning-card-skip'
                        }
                    );
                }
                if (typeof config.onAnswer === 'function') config.onAnswer(card, 'unknown', responseMs);
                return true;
            } catch (error) {
                return false;
            }
        }
        }

        function renderCard(card) {
            currentCard = card;
            if (track) track.textContent = card.track === 'word' ? '英语单词卡' : '汉字识读卡';
            if (symbol) symbol.textContent = card.display || card.key || '';
            if (prompt) prompt.textContent = card.prompt || '';
            if (feedback) feedback.textContent = '';
            if (correction) correction.classList.add('is-hidden');
            if (!grid) return;
            grid.innerHTML = '';
            (card.options || []).forEach(function (option) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'learning-answer-option';
                button.dataset.learningAnswer = text(option.id);
                const image = document.createElement('img');
                image.src = imageResolver(option.image);
                image.alt = option.label || '';
                const label = document.createElement('span');
                label.textContent = option.label || option.id || '';
                button.appendChild(image);
                button.appendChild(label);
                grid.appendChild(button);
            });
            const unknown = document.createElement('button');
            unknown.type = 'button';
            unknown.className = 'learning-answer-option learning-answer-option--unknown';
            unknown.dataset.learningUnknown = 'true';
            const unknownMark = document.createElement('strong');
            unknownMark.textContent = '?';
            const unknownLabel = document.createElement('span');
            unknownLabel.textContent = '不会 / 跳过';
            const unknownHint = document.createElement('small');
            unknownHint.textContent = '先看答案，不算答错';
            unknown.append(unknownMark, unknownLabel, unknownHint);
            grid.appendChild(unknown);
        }

        function show() {
            if (layer) layer.classList.remove('is-hidden');
        }

        function hide() {
            if (layer) layer.classList.add('is-hidden');
            currentCard = null;
            pendingTrigger = '';
            cardStartedAt = 0;
        }

        function later(callback, delay) {
            if (timer) global.clearTimeout(timer);
            timer = global.setTimeout(function () {
                timer = 0;
                callback();
            }, Math.max(0, Number(delay) || 0));
        }

        function finishCard() {
            if (!session || snapshot().phase !== 'card-reward') return;
            const next = session.finishReward();
            notify();
            if (next.phase === 'final-ready' || next.phase === 'flag-ready') {
                const finalMethod = config.finalMethod;
                if (finalMethod && typeof session[finalMethod] === 'function') session[finalMethod]();
                notify();
                later(hide, 600);
                return;
            }
            later(function () {
                if (snapshot().phase === 'resume-countdown' && typeof session.finishResume === 'function') session.finishResume();
                notify();
                hide();
            }, 520);
        }

        function answer(answerId) {
            if (!session || !currentCard || snapshot().phase !== 'learning') return;
            const responseMs = cardStartedAt ? Math.max(0, Date.now() - cardStartedAt) : 0;
            const correct = text(answerId) === text(currentCard.answer);
            const result = session.answer(answerId);
            recordCourseProgress(currentCard, correct);
            recordMemory(currentCard, correct, responseMs);
            markAnswers(answerId, currentCard.answer);
            if (result.needsCorrection) {
                if (feedback) feedback.textContent = '没关系，正确图片亮起来了。再选一次就会记住。';
                if (correction) correction.classList.remove('is-hidden');
                speech(currentCard);
                notify();
                return;
            }
            if (feedback) feedback.textContent = '答对啦！继续冒险。';
            notify();
            finishCard();
        }

        function skip() {
            if (!session || !currentCard || snapshot().phase !== 'learning' || typeof session.skipCard !== 'function') return;
            const responseMs = cardStartedAt ? Math.max(0, Date.now() - cardStartedAt) : 0;
            const result = session.skipCard();
            recordUnknown(currentCard, responseMs);
            markAnswers('', currentCard.answer);
            if (feedback) feedback.textContent = '已跳过，先看答案；这题不算答错，已加入复习单。';
            notify();
            if (result && result.completed) finishCard();
        }

        function completeCorrection() {
            if (!session || !currentCard || snapshot().phase !== 'correction') return;
            // 纠错是同一次答题的教学反馈，不把它伪装成一次新的 good/easy 记忆记录。
            recordCourseProgress(currentCard, true);
            session.completeCorrection();
            if (feedback) feedback.textContent = '记住啦！继续冒险。';
            notify();
            finishCard();
        }

        function trigger(triggerName) {
            if (!session || !cards.length || !session.canSimulate()) return false;
            const state = snapshot();
            if (state.cardsCompleted >= state.cardsRequired) return false;
            const picked = typeof config.pickCard === 'function'
                ? config.pickCard({
                    cards: cards,
                    state: state,
                    usedIds: Array.from(usedCardIds)
                })
                : cards[state.cardsCompleted];
            const card = picked && picked.card ? picked.card : picked;
            if (!card) return false;
            if (card.id) usedCardIds.add(String(card.id));
            pendingTrigger = text(triggerName || 'adventure');
            session.requestCard(card, pendingTrigger);
            renderCard(card);
            show();
            notify();
            later(function () {
                if (snapshot().phase !== 'card-falling') return;
                session.landCard();
                cardStartedAt = Date.now();
                notify();
                speech(card);
            }, 240);
            return true;
        }

        if (grid) grid.addEventListener('click', function (event) {
            const button = event.target.closest('[data-learning-answer]');
            if (button) answer(button.dataset.learningAnswer);
            const unknown = event.target.closest('[data-learning-unknown]');
            if (unknown) skip();
        });
        if (correction) correction.addEventListener('click', completeCorrection);
        if (speakButton) speakButton.addEventListener('click', function () { if (currentCard) speech(currentCard); });

        notify();
        return Object.freeze({
            snapshot: snapshot,
            trigger: trigger,
            canSimulate: function () { return !session || session.canSimulate(); },
            isComplete: function () { const state = snapshot(); return state.cardsCompleted >= state.cardsRequired; },
            currentCard: function () { return currentCard; },
            hide: hide
        });
    }

    global.WorkbenchLearningCardOverlay = Object.freeze({ create: create });
}(typeof window !== 'undefined' ? window : globalThis));
