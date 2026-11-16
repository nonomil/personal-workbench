(function (global) {
    'use strict';

    const SIMULATION_PHASES = new Set(['run', 'final-flag']);

    function positiveInteger(value, fallback) {
        const parsed = Math.floor(Number(value));
        return parsed > 0 ? parsed : fallback;
    }

    function createSession(options) {
        const config = options && typeof options === 'object' ? options : {};
        const cardsRequired = positiveInteger(config.cardsRequired, 10);
        const restoredCards = Math.max(0, Math.min(cardsRequired, Math.floor(Number(config.initialCardsCompleted) || 0)));
        const restoredComplete = restoredCards >= cardsRequired || config.initialSettled === true;
        const restoredRunning = restoredCards > 0 && !restoredComplete;
        const state = {
            phase: restoredComplete ? 'flag-ready' : restoredRunning ? 'run' : 'ready',
            cardsRequired,
            cardsCompleted: restoredCards,
            correctCount: 0,
            wrongCount: 0,
            unknownCount: 0,
            flagUnlocked: restoredComplete,
            currentCard: null,
            currentCheckpoint: null,
            lastAnswer: null,
            lastOutcome: null,
            settled: config.initialSettled === true ? { won: true } : null
        };

        function requirePhase() {
            const allowed = Array.prototype.slice.call(arguments);
            if (allowed.indexOf(state.phase) !== -1) return;
            throw new Error(`Expected phase ${allowed.join(' or ')}, received ${state.phase}`);
        }

        function snapshot() {
            return {
                phase: state.phase,
                cardsRequired: state.cardsRequired,
                cardsCompleted: state.cardsCompleted,
                correctCount: state.correctCount,
                wrongCount: state.wrongCount,
                unknownCount: state.unknownCount,
                flagUnlocked: state.flagUnlocked,
                currentCard: state.currentCard ? Object.assign({}, state.currentCard) : null,
                currentCheckpoint: state.currentCheckpoint,
                lastAnswer: state.lastAnswer,
                lastOutcome: state.lastOutcome,
                settled: state.settled ? Object.assign({}, state.settled) : null
            };
        }

        function startRun() {
            requirePhase('ready');
            state.phase = 'run';
            return snapshot();
        }

        function requestCard(card, checkpointId) {
            requirePhase('run');
            if (state.cardsCompleted >= state.cardsRequired) throw new Error('All learning cards are already complete');
            if (!card || !String(card.id || '').trim() || !String(card.answer || '').trim()) {
                throw new Error('A learning card needs id and answer');
            }
            state.currentCard = card;
            state.currentCheckpoint = checkpointId == null ? null : String(checkpointId);
            state.lastAnswer = null;
            state.lastOutcome = null;
            state.phase = 'card-falling';
            return snapshot();
        }

        function landCard() {
            requirePhase('card-falling');
            state.phase = 'learning';
            return snapshot();
        }

        function completeCard(firstTryCorrect) {
            state.cardsCompleted += 1;
            if (firstTryCorrect) state.correctCount += 1;
            state.lastOutcome = firstTryCorrect ? 'known' : 'slip';
            state.flagUnlocked = state.cardsCompleted >= state.cardsRequired;
            state.phase = 'card-reward';
            return {
                completed: true,
                needsCorrection: false,
                firstTryCorrect: Boolean(firstTryCorrect),
                snapshot: snapshot()
            };
        }

        function answer(answerId) {
            requirePhase('learning');
            state.lastAnswer = String(answerId == null ? '' : answerId);
            if (state.lastAnswer === String(state.currentCard.answer)) return completeCard(true);
            state.wrongCount += 1;
            state.phase = 'correction';
            return {
                completed: false,
                needsCorrection: true,
                firstTryCorrect: false,
                correctAnswer: state.currentCard.answer,
                snapshot: snapshot()
            };
        }

        function skipCard() {
            requirePhase('learning');
            state.cardsCompleted += 1;
            state.unknownCount += 1;
            state.lastAnswer = null;
            state.lastOutcome = 'unknown';
            state.flagUnlocked = state.cardsCompleted >= state.cardsRequired;
            state.phase = 'card-reward';
            return {
                completed: true,
                skipped: true,
                needsCorrection: false,
                firstTryCorrect: false,
                snapshot: snapshot()
            };
        }

        function completeCorrection() {
            requirePhase('correction');
            return completeCard(false);
        }

        function finishReward() {
            requirePhase('card-reward');
            state.currentCard = null;
            state.currentCheckpoint = null;
            state.lastAnswer = null;
            state.lastOutcome = null;
            state.phase = state.flagUnlocked ? 'flag-ready' : 'resume-countdown';
            return snapshot();
        }

        function finishResume() {
            requirePhase('resume-countdown');
            state.phase = 'run';
            return snapshot();
        }

        function startFinalFlag() {
            requirePhase('flag-ready');
            state.phase = 'final-flag';
            return snapshot();
        }

        function settle(won) {
            if (won) requirePhase('final-flag');
            else requirePhase('run', 'final-flag');
            state.phase = 'settled';
            state.settled = { won: Boolean(won) };
            return { settled: Object.assign({}, state.settled), snapshot: snapshot() };
        }

        function canSimulate() {
            return SIMULATION_PHASES.has(state.phase);
        }

        return Object.freeze({
            snapshot,
            startRun,
            requestCard,
            landCard,
            answer,
            skipCard,
            completeCorrection,
            finishReward,
            finishResume,
            startFinalFlag,
            settle,
            canSimulate
        });
    }

    function createCheckpointMeter() {
        const visited = new Set();
        function record(id) {
            const key = String(id == null ? '' : id).trim();
            if (!key || visited.has(key)) return false;
            visited.add(key);
            return true;
        }
        return Object.freeze({
            record,
            snapshot: function () { return { count: visited.size }; }
        });
    }

    global.PlatformLearningCore = Object.freeze({ createSession, createCheckpointMeter });
}(typeof window !== 'undefined' ? window : globalThis));
