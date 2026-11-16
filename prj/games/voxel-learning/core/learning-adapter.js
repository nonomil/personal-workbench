(function (global) {
    'use strict';

    const SIMULATION_PHASES = new Set(['build', 'final-portal']);

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
            phase: restoredComplete ? 'final-ready' : restoredRunning ? 'build' : 'ready',
            cardsRequired: cardsRequired,
            cardsCompleted: restoredCards,
            correctCount: 0,
            wrongCount: 0,
            unknownCount: 0,
            finalPortalUnlocked: false,
            currentCard: null,
            lastAction: null,
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
                finalPortalUnlocked: state.finalPortalUnlocked,
                currentCard: state.currentCard ? Object.assign({}, state.currentCard) : null,
                lastAction: state.lastAction,
                lastAnswer: state.lastAnswer,
                lastOutcome: state.lastOutcome,
                settled: state.settled ? Object.assign({}, state.settled) : null
            };
        }

        function startExpedition() {
            requirePhase('ready');
            state.phase = 'build';
            return snapshot();
        }

        function requestCard(card, action) {
            requirePhase('build');
            if (state.cardsCompleted >= state.cardsRequired) {
                throw new Error('All learning cards are already complete');
            }
            if (!card || !String(card.id || '').trim() || !String(card.answer || '').trim()) {
                throw new Error('A learning card needs id and answer');
            }
            state.currentCard = card;
            state.lastAction = action == null ? null : String(action);
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
            state.finalPortalUnlocked = state.cardsCompleted >= state.cardsRequired;
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
            if (state.lastAnswer === String(state.currentCard.answer)) {
                return completeCard(true);
            }
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
            state.finalPortalUnlocked = state.cardsCompleted >= state.cardsRequired;
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
            state.lastAnswer = null;
            state.lastOutcome = null;
            state.phase = state.finalPortalUnlocked ? 'final-ready' : 'resume-countdown';
            return snapshot();
        }

        function finishResume() {
            requirePhase('resume-countdown');
            state.phase = 'build';
            return snapshot();
        }

        function startFinalPortal() {
            requirePhase('final-ready');
            state.phase = 'final-portal';
            return snapshot();
        }

        function settle(won) {
            if (won) requirePhase('final-portal');
            else requirePhase('build', 'final-portal');
            state.phase = 'settled';
            state.settled = { won: Boolean(won) };
            return { settled: Object.assign({}, state.settled), snapshot: snapshot() };
        }

        function canSimulate() {
            return SIMULATION_PHASES.has(state.phase);
        }

        return Object.freeze({
            snapshot,
            startExpedition,
            requestCard,
            landCard,
            answer,
            skipCard,
            completeCorrection,
            finishReward,
            finishResume,
            startFinalPortal,
            settle,
            canSimulate
        });
    }

    function createActionMeter(options) {
        const config = options && typeof options === 'object' ? options : {};
        const actionsPerCard = positiveInteger(config.actionsPerCard, 2);
        let actions = 0;

        function record(action) {
            if (action == null || !String(action).trim()) return false;
            actions += 1;
            if (actions < actionsPerCard) return false;
            actions = 0;
            return true;
        }

        return Object.freeze({
            record,
            snapshot: function () { return { actions, actionsPerCard }; }
        });
    }

    global.VoxelLearningCore = Object.freeze({ createSession, createActionMeter });
}(typeof window !== 'undefined' ? window : globalThis));
