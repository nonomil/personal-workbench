(function (global) {
    'use strict';

    const SIMULATION_PHASES = new Set(['battle', 'final-wave']);

    function positiveInteger(value, fallback) {
        const parsed = Math.floor(Number(value));
        return parsed > 0 ? parsed : fallback;
    }

    function createSession(options) {
        const config = options && typeof options === 'object' ? options : {};
        const cardsRequired = positiveInteger(config.cardsRequired, 10);
        const state = {
            phase: 'ready',
            cardsRequired: cardsRequired,
            cardsCompleted: 0,
            correctCount: 0,
            wrongCount: 0,
            unknownCount: 0,
            finalWaveUnlocked: false,
            currentCard: null,
            lastAnswer: null,
            lastOutcome: null,
            settled: null
        };

        function requirePhase() {
            const allowed = Array.from(arguments);
            if (allowed.indexOf(state.phase) >= 0) return;
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
                finalWaveUnlocked: state.finalWaveUnlocked,
                currentCard: state.currentCard ? Object.assign({}, state.currentCard) : null,
                lastAnswer: state.lastAnswer,
                lastOutcome: state.lastOutcome,
                settled: state.settled
            };
        }

        function startBattle() {
            requirePhase('ready');
            state.phase = 'battle';
            return snapshot();
        }

        function requestCard(card) {
            requirePhase('battle');
            if (state.cardsCompleted >= state.cardsRequired) {
                throw new Error('All learning cards are already complete');
            }
            if (!card || !String(card.id || '').trim() || !String(card.answer || '').trim()) {
                throw new Error('A learning card needs id and answer');
            }
            state.currentCard = card;
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
            state.finalWaveUnlocked = state.cardsCompleted >= state.cardsRequired;
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
            state.finalWaveUnlocked = state.cardsCompleted >= state.cardsRequired;
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
            state.phase = state.finalWaveUnlocked ? 'final-wave-ready' : 'resume-countdown';
            return snapshot();
        }

        function finishResume() {
            requirePhase('resume-countdown');
            state.phase = 'battle';
            return snapshot();
        }

        function startFinalWave() {
            requirePhase('final-wave-ready');
            state.phase = 'final-wave';
            return snapshot();
        }

        function settle(won) {
            if (won) requirePhase('final-wave');
            else requirePhase('battle', 'final-wave');
            state.phase = 'settled';
            state.settled = { won: Boolean(won) };
            return snapshot();
        }

        function canSimulate() {
            return SIMULATION_PHASES.has(state.phase);
        }

        return Object.freeze({
            snapshot: snapshot,
            startBattle: startBattle,
            requestCard: requestCard,
            landCard: landCard,
            answer: answer,
            skipCard: skipCard,
            completeCorrection: completeCorrection,
            finishReward: finishReward,
            finishResume: finishResume,
            startFinalWave: startFinalWave,
            settle: settle,
            canSimulate: canSimulate
        });
    }

    global.LearningDefenseCore = Object.freeze({
        createSession: createSession
    });
}(typeof window !== 'undefined' ? window : globalThis));
